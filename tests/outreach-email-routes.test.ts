import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createEmailConsentToken,
  createEmailUnsubscribeToken,
} from "@/features/outreach/email-action-token";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  isDemoMode: () => false,
  isSupabaseConfigured: () => true,
}));
vi.mock("@/lib/feature-flags", () => ({ isFeatureEnabled: () => true }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ rpc: mocks.rpc, from: mocks.from }),
}));

import { POST as confirmEmail } from "@/app/api/outreach/email/confirm/route";
import { POST as unsubscribeEmail } from "@/app/api/outreach/email/unsubscribe/route";

const secret = "e".repeat(48);
const prospectId = "00000000-0000-4000-8000-000000000101";
const contactCandidateId = "00000000-0000-4000-8000-000000000102";
const outboxId = "00000000-0000-4000-8000-000000000103";

function builder(data: object) {
  const chain = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(async () => ({ data, error: null })),
  };
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  return chain;
}

describe("Postmark email consent and unsubscribe routes", () => {
  beforeEach(() => {
    process.env.OUTREACH_EMAIL_ACTION_SIGNING_SECRET = secret;
    mocks.rpc.mockReset();
    mocks.from.mockReset();
    mocks.rpc.mockResolvedValue({ data: { code: "OK" }, error: null });
  });

  it("records both requested purposes through one atomic service RPC", async () => {
    mocks.from.mockReturnValue(
      builder({
        prospect_id: prospectId,
        value_hash: "a".repeat(64),
        channel: "email",
      }),
    );
    const token = await createEmailConsentToken({
      prospectId,
      contactCandidateId,
      engagementType: "membership",
      requestedPurposes: [
        "farmerbook_introduction",
        "onboarding_followup",
      ],
      expiresAt: Date.now() + 60_000,
      secret,
    });
    const response = await confirmEmail(
      new Request("https://farmerbook.in/api/outreach/email/confirm", {
        method: "POST",
        body: new URLSearchParams({ token }),
      }),
    );
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://farmerbook.in/confirm-email?status=confirmed",
    );
    expect(mocks.rpc).toHaveBeenCalledWith(
      "record_verified_email_double_opt_in",
      expect.objectContaining({
        prospect_id_input: prospectId,
        receipt_input: expect.objectContaining({
          contactCandidateId,
          contactHash: "a".repeat(64),
          requestedPurposes: [
            "farmerbook_introduction",
            "onboarding_followup",
          ],
          captureMethod: "double_opt_in",
          provider: "postmark",
        }),
      }),
    );
  });

  it("withdraws and suppresses through a signed visible link", async () => {
    mocks.from.mockReturnValue(builder({ prospect_id: prospectId }));
    const token = await createEmailUnsubscribeToken({
      outboxId,
      expiresAt: Date.now() + 60_000,
      secret,
    });
    const response = await unsubscribeEmail(
      new Request("https://farmerbook.in/api/outreach/email/unsubscribe", {
        method: "POST",
        body: new URLSearchParams({ token }),
      }),
    );
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://farmerbook.in/unsubscribe?status=unsubscribed",
    );
    expect(mocks.rpc).toHaveBeenCalledWith(
      "withdraw_outreach_consent",
      expect.objectContaining({ prospect_id_input: prospectId }),
    );
  });

  it("supports RFC one-click POST without rendering or exposing contact data", async () => {
    mocks.from.mockReturnValue(builder({ prospect_id: prospectId }));
    const token = await createEmailUnsubscribeToken({
      outboxId,
      expiresAt: Date.now() + 60_000,
      secret,
    });
    const response = await unsubscribeEmail(
      new Request(
        `https://farmerbook.in/api/outreach/email/unsubscribe?token=${encodeURIComponent(token)}`,
        {
          method: "POST",
          body: new URLSearchParams({ "List-Unsubscribe": "One-Click" }),
        },
      ),
    );
    await expect(response.json()).resolves.toEqual({ code: "UNSUBSCRIBED" });
  });
});
