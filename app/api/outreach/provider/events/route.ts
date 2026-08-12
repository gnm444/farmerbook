import { NextResponse } from "next/server";
import { z } from "zod";
import { classifyOutreachReply } from "@/features/outreach/reply-classifier";
import { createConfiguredOutreachProvider } from "@/features/outreach/providers";
import { isDemoMode, isSupabaseConfigured } from "@/lib/env";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { createAdminClient } from "@/lib/supabase/admin";

function firstRow(value: unknown) {
  return Array.isArray(value) ? value[0] : value;
}

const outboxBindingSchema = z.object({
  prospect_id: z.uuid(),
  contact_candidate_id: z.uuid(),
  channel: z.enum(["email", "sms", "whatsapp"]),
});

const contactBindingSchema = z.object({ value_hash: z.string().regex(/^[0-9a-f]{64}$/) });

export async function POST(request: Request) {
  if (
    !isFeatureEnabled("ENABLE_OUTREACH_AGENT") ||
    isDemoMode() ||
    !isSupabaseConfigured()
  ) {
    return NextResponse.json({ code: "FEATURE_DISABLED" }, { status: 404 });
  }
  const provider = createConfiguredOutreachProvider();
  if (!provider.configured) {
    return NextResponse.json({ code: "NOT_CONFIGURED" }, { status: 503 });
  }
  try {
    const providerEvent = await provider.verifyLifecycleWebhook(request);
    const supabase = createAdminClient();
    let prospectId = providerEvent.prospectId;
    let contactCandidateId = providerEvent.contactCandidateId;
    let contactHash = providerEvent.contactHash;
    if (!prospectId || !contactCandidateId || !contactHash) {
      let bindingQuery = supabase
        .from("outreach_outbox")
        .select("prospect_id, contact_candidate_id, channel")
        .limit(1);
      bindingQuery = providerEvent.outboxId
        ? bindingQuery.eq("id", providerEvent.outboxId)
        : bindingQuery.eq(
            "provider_receipt_id",
            providerEvent.providerReceiptId ?? "",
          );
      const bindingResult = await bindingQuery.maybeSingle();
      if (bindingResult.error || !bindingResult.data) {
        throw new Error("PROVIDER_EVENT_OUTBOX_NOT_FOUND");
      }
      const binding = outboxBindingSchema.parse(bindingResult.data);
      if (binding.channel !== providerEvent.channel) {
        throw new Error("PROVIDER_EVENT_CHANNEL_MISMATCH");
      }
      const contactResult = await supabase
        .from("outreach_contact_candidates")
        .select("value_hash")
        .eq("id", binding.contact_candidate_id)
        .eq("prospect_id", binding.prospect_id)
        .maybeSingle();
      if (contactResult.error || !contactResult.data) {
        throw new Error("PROVIDER_EVENT_CONTACT_NOT_FOUND");
      }
      prospectId = binding.prospect_id;
      contactCandidateId = binding.contact_candidate_id;
      contactHash = contactBindingSchema.parse(contactResult.data).value_hash;
    }
    const reply =
      providerEvent.eventType === "reply"
        ? classifyOutreachReply(providerEvent.messageText ?? "")
        : null;
    const { data, error } = await supabase.rpc(
      "record_outreach_provider_event",
      {
        prospect_id_input: prospectId,
        event_input: {
          contactCandidateId,
          contactHash,
          channel: providerEvent.channel,
          eventType: providerEvent.eventType,
          occurredAt: providerEvent.occurredAt,
          provider: provider.name,
          providerEventId: providerEvent.providerEventId,
          replyIntent: reply?.intent ?? null,
          questionCode: reply?.questionCode ?? null,
          responseRequested: reply?.responseRequested ?? false,
        },
        idempotency_key_input: providerEvent.idempotencyKey,
      },
    );
    if (error) throw new Error("PROVIDER_EVENT_WRITE_FAILED");
    const result = firstRow(data) as
      | { code?: unknown; prospect_status?: unknown; response_outbox_id?: unknown }
      | null;
    return NextResponse.json({
      code: String(result?.code ?? "EVENT_RECORDED"),
      status: String(result?.prospect_status ?? "unchanged"),
      responseQueued: typeof result?.response_outbox_id === "string",
    });
  } catch {
    return NextResponse.json(
      { code: "INVALID_PROVIDER_EVENT" },
      { status: 403 },
    );
  }
}
