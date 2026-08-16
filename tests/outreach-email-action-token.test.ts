import { describe, expect, it } from "vitest";
import {
  createEmailConsentToken,
  createEmailUnsubscribeToken,
  verifyEmailConsentToken,
  verifyEmailUnsubscribeToken,
} from "@/features/outreach/email-action-token";

describe("outreach email action tokens", () => {
  const secret = "e".repeat(48);
  const prospectId = "00000000-0000-4000-8000-000000000101";
  const contactCandidateId = "00000000-0000-4000-8000-000000000102";
  const outboxId = "00000000-0000-4000-8000-000000000103";

  it("purpose-separates bounded double-opt-in consent", async () => {
    const token = await createEmailConsentToken({
      prospectId,
      contactCandidateId,
      engagementType: "collaboration",
      requestedPurposes: [
        "farmerbook_introduction",
        "onboarding_followup",
        "onboarding_followup",
      ],
      expiresAt: 2_000,
      secret,
    });
    await expect(verifyEmailConsentToken(token, secret, 1_000)).resolves.toEqual({
      version: 2,
      action: "confirm_consent",
      prospectId,
      contactCandidateId,
      engagementType: "collaboration",
      requestedPurposes: [
        "farmerbook_introduction",
        "onboarding_followup",
      ],
      expiresAt: 2_000,
    });
    await expect(
      verifyEmailUnsubscribeToken(token, secret, 1_000),
    ).resolves.toBeNull();
  });

  it("binds unsubscribe to one outbox and rejects expiry/tampering", async () => {
    const token = await createEmailUnsubscribeToken({
      outboxId,
      expiresAt: 2_000,
      secret,
    });
    await expect(
      verifyEmailUnsubscribeToken(token, secret, 1_000),
    ).resolves.toMatchObject({ action: "unsubscribe", outboxId });
    await expect(
      verifyEmailUnsubscribeToken(token, secret, 2_000),
    ).resolves.toBeNull();
    await expect(
      verifyEmailUnsubscribeToken(`${token.slice(0, -1)}x`, secret, 1_000),
    ).resolves.toBeNull();
  });
});
