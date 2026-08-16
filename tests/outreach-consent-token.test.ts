import { describe, expect, it } from "vitest";
import {
  createConsentToken,
  verifyConsentToken,
} from "@/features/outreach/consent-token";
import { consentLeadSchema } from "@/features/outreach/schemas";

describe("outreach consent nonce", () => {
  const secret = "s".repeat(48);

  it("binds a random nonce to an HMAC and a short expiry", async () => {
    const token = await createConsentToken(secret, 1_000);
    expect(token).toContain(".");
    const verified = await verifyConsentToken(token, secret, 1_001);
    expect(verified?.nonce).toMatch(/^[0-9a-f-]{36}$/);
    await expect(verifyConsentToken(token, secret, 31 * 60 * 1_000)).resolves.toBeNull();
    await expect(
      verifyConsentToken(`${token.slice(0, -1)}x`, secret, 1_001),
    ).resolves.toBeNull();
  });

  it("accepts the signed token shape in the public consent schema", async () => {
    const token = await createConsentToken(secret);
    const parsed = consentLeadSchema.safeParse({
      engagementType: "membership",
      role: "farmer",
      fullName: "Anita Patil",
      countryCode: "IN",
      state: "Maharashtra",
      district: "Nashik",
      farmingApproach: "organic",
      preferredLocale: "mr-IN",
      preferredChannel: "email",
      email: "anita@example.com",
      introductionConsent: true,
      followupConsent: false,
      consentPolicyVersion: "2026-08-17.1",
      consentNonce: token,
      turnstileToken: "verified-token",
    });
    expect(parsed.success).toBe(true);
  });
});
