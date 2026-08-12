import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { uuidFromText } from "./crypto";
import {
  createOutreachInvitationToken,
  OUTREACH_INVITATION_TTL_MS,
} from "./invitation-token";
import type {
  ConsentAcquisitionProvider,
  OutreachDeliveryProvider,
} from "./providers";

const jobSchema = z.object({
  id: z.uuid(),
  prospect_id: z.uuid(),
  contact_candidate_id: z.uuid(),
  channel: z.enum(["email", "sms", "whatsapp"]),
  purpose: z.enum([
    "farmerbook_introduction",
    "onboarding_followup",
    "onboarding_reply",
    "consent_confirmation",
  ]),
  message_body: z.string().min(20).max(2_000),
  attempts: z.number().int().min(1).max(5),
  created_at: z.iso.datetime(),
});

const preparedInvitationSchema = z.object({
  code: z.enum(["INVITATION_PREPARED", "IDEMPOTENT_REPLAY"]),
  invitation_id: z.uuid(),
  message_body: z.string().min(20).max(2_000),
});

const preparedProfilePreviewSchema = z.object({
  code: z.enum(["PREVIEW_ATTACHED", "NO_SAMPLE", "FEATURE_DISABLED"]),
  message_body: z.string().min(20).max(2_000),
});

type ConfiguredProvider = ConsentAcquisitionProvider & OutreachDeliveryProvider;

function failureCode(error: unknown) {
  const raw = error instanceof Error ? error.message : "PROVIDER_FAILED";
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 80) || "PROVIDER_FAILED";
}

export async function processOutreachBatch(options: {
  supabase: SupabaseClient;
  provider: ConfiguredProvider;
  limit?: number;
  invitationSigningSecret?: string;
}) {
  if (!options.provider.configured) {
    return { code: "NOT_CONFIGURED" as const, claimed: 0, delivered: 0, failed: 0 };
  }
  const limit = Math.min(Math.max(options.limit ?? 10, 1), 25);
  const { data, error } = await options.supabase.rpc("claim_outreach_outbox", {
    limit_input: limit,
  });
  if (error) throw new Error("OUTREACH_CLAIM_FAILED");
  const jobs = z.array(jobSchema).parse(data ?? []);
  let delivered = 0;
  let failed = 0;
  let consecutiveFailures = 0;

  for (const job of jobs) {
    const resultIdempotencyKey = await uuidFromText(
      `outreach-result:${job.id}:${job.attempts}`,
    );
    if (consecutiveFailures >= 3) {
      const recorded = await options.supabase.rpc(
        "record_outreach_delivery_result",
        {
          outbox_id_input: job.id,
          result_input: {
            delivered: false,
            retryable: job.attempts < 5,
            failureCode: "PROVIDER_CIRCUIT_OPEN",
          },
          idempotency_key_input: resultIdempotencyKey,
        },
      );
      if (recorded.error) throw new Error("DELIVERY_FAILURE_WRITE_FAILED");
      failed += 1;
      continue;
    }
    try {
      const contactResult = await options.supabase
        .from("outreach_contact_candidates")
        .select("private_value")
        .eq("id", job.contact_candidate_id)
        .maybeSingle();
      if (contactResult.error || !contactResult.data?.private_value) {
        throw new Error("CONTACT_NOT_FOUND");
      }
      let requestedPurposes: Array<
        "farmerbook_introduction" | "onboarding_followup"
      > = ["farmerbook_introduction"];
      if (job.purpose === "consent_confirmation") {
        const prospectResult = await options.supabase
          .from("outreach_prospects")
          .select("followup_requested")
          .eq("id", job.prospect_id)
          .maybeSingle();
        if (prospectResult.error || !prospectResult.data) {
          throw new Error("PROSPECT_NOT_FOUND");
        }
        if (prospectResult.data.followup_requested === true) {
          requestedPurposes = [
            "farmerbook_introduction",
            "onboarding_followup",
          ];
        }
      }
      let message = job.message_body;
      if (
        job.purpose === "farmerbook_introduction" ||
        job.purpose === "onboarding_followup"
      ) {
        const expiresAt =
          new Date(job.created_at).getTime() + OUTREACH_INVITATION_TTL_MS;
        const token = await createOutreachInvitationToken({
          outboxId: job.id,
          expiresAt,
          secret:
            options.invitationSigningSecret ??
            process.env.OUTREACH_INVITATION_SIGNING_SECRET ??
            "",
        });
        const invitationIdempotencyKey = await uuidFromText(
          `outreach-invitation:${job.id}`,
        );
        const prepared = await options.supabase.rpc(
          "prepare_outreach_invitation",
          {
            outbox_id_input: job.id,
            token_input: token,
            expires_at_input: new Date(expiresAt).toISOString(),
            idempotency_key_input: invitationIdempotencyKey,
          },
        );
        if (prepared.error) throw new Error("INVITATION_PREPARE_FAILED");
        const row = preparedInvitationSchema.parse(
          Array.isArray(prepared.data) ? prepared.data[0] : prepared.data,
        );
        message = row.message_body;
        const preview = await options.supabase.rpc(
          "attach_managed_profile_sample_preview",
          {
            outbox_id_input: job.id,
            token_input: token,
          },
        );
        if (!preview.error && preview.data) {
          const previewRow = preparedProfilePreviewSchema.parse(
            Array.isArray(preview.data) ? preview.data[0] : preview.data,
          );
          message = previewRow.message_body;
        } else if (!/PGRST202|42883/.test(String(preview.error?.code ?? ""))) {
          throw new Error("PROFILE_PREVIEW_PREPARE_FAILED");
        }
      }
      const receipt =
        job.purpose === "consent_confirmation"
          ? await options.provider.requestConsent({
              contact: String(contactResult.data.private_value),
              channel: job.channel,
              templateVersion: "farmerbook-consent-2026-08-09.1",
              idempotencyKey: job.id,
              prospectId: job.prospect_id,
              contactCandidateId: job.contact_candidate_id,
              requestedPurposes,
            })
          : await options.provider.deliver({
              contact: String(contactResult.data.private_value),
              channel: job.channel,
              message,
              idempotencyKey: job.id,
            });
      const recorded = await options.supabase.rpc(
        "record_outreach_delivery_result",
        {
          outbox_id_input: job.id,
          result_input: {
            delivered: true,
            provider: receipt.provider,
            providerReceiptId: receipt.receiptId,
            occurredAt: receipt.acceptedAt,
          },
          idempotency_key_input: resultIdempotencyKey,
        },
      );
      if (recorded.error) throw new Error("DELIVERY_RECEIPT_WRITE_FAILED");
      delivered += 1;
      consecutiveFailures = 0;
    } catch (caught) {
      const code = failureCode(caught);
      const retryable =
        job.attempts < 5 && code !== "POSTMARK_DELIVERY_UNKNOWN";
      const recorded = await options.supabase.rpc(
        "record_outreach_delivery_result",
        {
          outbox_id_input: job.id,
          result_input: {
            delivered: false,
            retryable,
            failureCode: code,
          },
          idempotency_key_input: resultIdempotencyKey,
        },
      );
      if (recorded.error) throw new Error("DELIVERY_FAILURE_WRITE_FAILED");
      failed += 1;
      consecutiveFailures += 1;
    }
  }
  return {
    code: "PROCESSED" as const,
    claimed: jobs.length,
    delivered,
    failed,
  };
}
