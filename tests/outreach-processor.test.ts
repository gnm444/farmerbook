import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { processOutreachBatch } from "@/features/outreach/processor";
import type {
  ConsentAcquisitionProvider,
  OutreachDeliveryProvider,
} from "@/features/outreach/providers";

function provider(configured = true) {
  return {
    name: "test-provider",
    configured,
    requestConsent: vi.fn(async () => ({
      provider: "test-provider",
      receiptId: "consent-request-1",
      acceptedAt: "2026-08-09T12:00:00.000Z",
    })),
    verifyWebhook: vi.fn(),
    verifyLifecycleWebhook: vi.fn(),
    deliver: vi.fn(async () => ({
      provider: "test-provider",
      receiptId: "delivery-1",
      acceptedAt: "2026-08-09T12:00:00.000Z",
    })),
  } satisfies ConsentAcquisitionProvider & OutreachDeliveryProvider;
}

function clientFor(
  job: Record<string, unknown> | Array<Record<string, unknown>>,
  preview?: { code: "PREVIEW_ATTACHED"; message: string },
  engagementType: "membership" | "collaboration" = "membership",
  authorization: { authorized: boolean; code: string }
    | Array<{ authorized: boolean; code: string }> = {
    authorized: true,
    code: "DISPATCH_AUTHORIZED",
  },
) {
  const resultWrites: unknown[] = [];
  const automaticPauses: unknown[] = [];
  let authorizationCall = 0;
  const rpc = vi.fn(async (name: string, input: unknown) => {
    if (name === "claim_outreach_outbox") {
      return { data: Array.isArray(job) ? job : [job], error: null };
    }
    if (name === "authorize_outreach_dispatch") {
      const decision = Array.isArray(authorization)
        ? authorization[Math.min(authorizationCall, authorization.length - 1)]!
        : authorization;
      authorizationCall += 1;
      return {
        data: [{
          ...decision,
          check_id: crypto.randomUUID(),
          next_eligible_at: decision.authorized
            ? null
            : "2026-08-23T18:30:00+00:00",
        }],
        error: null,
      };
    }
    if (name === "pause_outreach_delivery_automatically") {
      automaticPauses.push(input);
      return { data: [{ code: "DELIVERY_AUTO_PAUSED", delivery_paused: true }], error: null };
    }
    if (name === "attach_managed_profile_sample_preview") {
      return {
        data: [
          {
            code: preview?.code ?? "FEATURE_DISABLED",
            message_body: preview?.message ??
              "A consented FarmerBook introduction with a private invitation.",
          },
        ],
        error: null,
      };
    }
    resultWrites.push(input);
    if (name === "prepare_outreach_invitation") {
      return {
        data: [
          {
            code: "INVITATION_PREPARED",
            invitation_id: "00000000-0000-4000-8000-000000000104",
            message_body:
              "A consented FarmerBook introduction with a private invitation.",
          },
        ],
        error: null,
      };
    }
    return { data: [{ code: "RECORDED" }], error: null };
  });
  const from = vi.fn((table: string) => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn(async () => ({
          data:
            table === "outreach_prospects"
              ? { followup_requested: false, engagement_type: engagementType }
              : { private_value: "grower@example.com" },
          error: null,
        })),
      })),
    })),
  }));
  return {
    supabase: { rpc, from } as unknown as SupabaseClient,
    rpc,
    from,
    resultWrites,
    automaticPauses,
  };
}

const baseJob = {
  id: "00000000-0000-4000-8000-000000000101",
  prospect_id: "00000000-0000-4000-8000-000000000102",
  contact_candidate_id: "00000000-0000-4000-8000-000000000103",
  channel: "email",
  purpose: "consent_confirmation",
  message_body: "A FarmerBook consent confirmation request.",
  attempts: 1,
  created_at: new Date(Date.now() - 60_000)
    .toISOString()
    .replace("Z", "+00:00"),
};

describe("autonomous outreach processor", () => {
  it("claims nothing when no provider is configured", async () => {
    const { supabase, rpc } = clientFor(baseJob);
    await expect(
      processOutreachBatch({ supabase, provider: provider(false) }),
    ).resolves.toEqual({
      code: "NOT_CONFIGURED",
      claimed: 0,
      delivered: 0,
      failed: 0,
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("routes a consent-confirmation job only through the consent provider", async () => {
    const configuredProvider = provider();
    const { supabase, resultWrites } = clientFor(baseJob);
    await expect(
      processOutreachBatch({ supabase, provider: configuredProvider }),
    ).resolves.toMatchObject({ code: "PROCESSED", claimed: 1, delivered: 1 });
    expect(configuredProvider.requestConsent).toHaveBeenCalledWith(
      expect.objectContaining({
        prospectId: baseJob.prospect_id,
        contactCandidateId: baseJob.contact_candidate_id,
      }),
    );
    expect(configuredProvider.deliver).not.toHaveBeenCalled();
    expect(resultWrites).toHaveLength(1);
    expect(resultWrites[0]).toMatchObject({
      outbox_id_input: baseJob.id,
      result_input: { delivered: true, providerReceiptId: "consent-request-1" },
    });
  });

  it("records a bounded retry when provider delivery fails", async () => {
    const configuredProvider = provider();
    configuredProvider.deliver.mockRejectedValueOnce(new Error("gateway timeout"));
    const job = { ...baseJob, purpose: "farmerbook_introduction" };
    const { supabase, resultWrites } = clientFor(job);
    await expect(
      processOutreachBatch({
        supabase,
        provider: configuredProvider,
        invitationSigningSecret: "i".repeat(48),
      }),
    ).resolves.toMatchObject({ claimed: 1, delivered: 0, failed: 1 });
    expect(resultWrites[1]).toMatchObject({
      result_input: {
        delivered: false,
        retryable: true,
        failureCode: "GATEWAY_TIMEOUT",
      },
    });
  });

  it("does not automatically retry an ambiguous Postmark timeout", async () => {
    const configuredProvider = provider();
    configuredProvider.deliver.mockRejectedValueOnce(
      new Error("POSTMARK_DELIVERY_UNKNOWN"),
    );
    const job = { ...baseJob, purpose: "farmerbook_introduction" };
    const { supabase, resultWrites, automaticPauses } = clientFor(job);
    await expect(
      processOutreachBatch({
        supabase,
        provider: configuredProvider,
        invitationSigningSecret: "i".repeat(48),
      }),
    ).resolves.toMatchObject({ claimed: 1, delivered: 0, failed: 1 });
    expect(resultWrites[1]).toMatchObject({
      result_input: {
        delivered: false,
        retryable: false,
        failureCode: "POSTMARK_DELIVERY_UNKNOWN",
      },
    });
    expect(automaticPauses).toEqual([
      expect.objectContaining({
        reason_code_input: "POSTMARK_DELIVERY_UNKNOWN",
      }),
    ]);
  });

  it("persistently pauses after three consecutive provider failures", async () => {
    const configuredProvider = provider();
    configuredProvider.deliver.mockRejectedValue(new Error("gateway timeout"));
    const jobs = Array.from({ length: 3 }, (_, index) => ({
      ...baseJob,
      id: `00000000-0000-4000-8000-00000000010${index + 1}`,
      purpose: "farmerbook_introduction",
    }));
    const { supabase, automaticPauses } = clientFor(jobs);
    await expect(
      processOutreachBatch({
        supabase,
        provider: configuredProvider,
        invitationSigningSecret: "i".repeat(48),
      }),
    ).resolves.toMatchObject({ claimed: 3, delivered: 0, failed: 3 });
    expect(configuredProvider.deliver).toHaveBeenCalledTimes(3);
    expect(automaticPauses).toEqual([
      expect.objectContaining({ reason_code_input: "PROVIDER_CIRCUIT_OPEN" }),
    ]);
  });

  it("never reads a contact or calls the provider when final dispatch authority ended", async () => {
    const configuredProvider = provider();
    const { supabase, from } = clientFor(
      baseJob,
      undefined,
      "membership",
      { authorized: false, code: "SUPPRESSED_BEFORE_DISPATCH" },
    );
    await expect(
      processOutreachBatch({ supabase, provider: configuredProvider }),
    ).resolves.toMatchObject({
      claimed: 1,
      delivered: 0,
      failed: 0,
      deferred: 0,
      blocked: 1,
    });
    expect(from).not.toHaveBeenCalled();
    expect(configuredProvider.requestConsent).not.toHaveBeenCalled();
    expect(configuredProvider.deliver).not.toHaveBeenCalled();
  });

  it("defers a daily-cap decision without treating it as a provider failure", async () => {
    const configuredProvider = provider();
    const { supabase, from } = clientFor(
      baseJob,
      undefined,
      "membership",
      { authorized: false, code: "DAILY_DELIVERY_LIMIT_REACHED" },
    );
    await expect(
      processOutreachBatch({ supabase, provider: configuredProvider }),
    ).resolves.toMatchObject({
      code: "PROCESSED",
      claimed: 1,
      delivered: 0,
      failed: 0,
      deferred: 1,
      blocked: 0,
    });
    expect(from).not.toHaveBeenCalled();
  });

  it("rechecks authority immediately before the provider and honors a racing STOP", async () => {
    const configuredProvider = provider();
    const { supabase, from } = clientFor(
      baseJob,
      undefined,
      "membership",
      [
        { authorized: true, code: "DISPATCH_AUTHORIZED" },
        { authorized: false, code: "SUPPRESSED_BEFORE_DISPATCH" },
      ],
    );
    await expect(
      processOutreachBatch({ supabase, provider: configuredProvider }),
    ).resolves.toMatchObject({
      claimed: 1,
      delivered: 0,
      failed: 0,
      blocked: 1,
    });
    expect(from).toHaveBeenCalled();
    expect(configuredProvider.requestConsent).not.toHaveBeenCalled();
    expect(configuredProvider.deliver).not.toHaveBeenCalled();
  });

  it("prepares one signed invitation before delivering an introduction", async () => {
    const configuredProvider = provider();
    const job = { ...baseJob, purpose: "farmerbook_introduction" };
    const { supabase, rpc } = clientFor(job);
    await expect(
      processOutreachBatch({
        supabase,
        provider: configuredProvider,
        invitationSigningSecret: "i".repeat(48),
      }),
    ).resolves.toMatchObject({ claimed: 1, delivered: 1, failed: 0 });
    expect(rpc).toHaveBeenCalledWith(
      "prepare_outreach_invitation",
      expect.objectContaining({
        outbox_id_input: job.id,
        token_input: expect.stringMatching(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/),
      }),
    );
    expect(configuredProvider.deliver).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("private invitation") }),
    );
  });

  it("delivers the private sample-review link when the managed agent attached it", async () => {
    const configuredProvider = provider();
    const job = { ...baseJob, purpose: "farmerbook_introduction" };
    const previewMessage =
      "Review your private FarmerBook sample: https://farmerbook.in/profile-preview/signed-token";
    const { supabase, rpc } = clientFor(job, {
      code: "PREVIEW_ATTACHED",
      message: previewMessage,
    });
    await expect(
      processOutreachBatch({
        supabase,
        provider: configuredProvider,
        invitationSigningSecret: "i".repeat(48),
      }),
    ).resolves.toMatchObject({ claimed: 1, delivered: 1, failed: 0 });
    expect(rpc).toHaveBeenCalledWith(
      "attach_managed_profile_sample_preview",
      expect.objectContaining({ outbox_id_input: job.id }),
    );
    expect(configuredProvider.deliver).toHaveBeenCalledWith(
      expect.objectContaining({ message: previewMessage }),
    );
  });

  it("fails closed before delivery when invitation signing is unavailable", async () => {
    const configuredProvider = provider();
    const job = { ...baseJob, purpose: "farmerbook_introduction" };
    const { supabase } = clientFor(job);
    await expect(
      processOutreachBatch({
        supabase,
        provider: configuredProvider,
        invitationSigningSecret: "",
      }),
    ).resolves.toMatchObject({ claimed: 1, delivered: 0, failed: 1 });
    expect(configuredProvider.deliver).not.toHaveBeenCalled();
  });

  it("does not create a signup invitation for a collaboration introduction", async () => {
    const configuredProvider = provider();
    const job = { ...baseJob, purpose: "farmerbook_introduction" };
    const { supabase, rpc } = clientFor(job, undefined, "collaboration");

    await expect(
      processOutreachBatch({ supabase, provider: configuredProvider }),
    ).resolves.toMatchObject({ claimed: 1, delivered: 1, failed: 0 });
    expect(rpc).not.toHaveBeenCalledWith(
      "prepare_outreach_invitation",
      expect.anything(),
    );
    expect(configuredProvider.deliver).toHaveBeenCalledWith(
      expect.objectContaining({ engagementType: "collaboration" }),
    );
  });
});
