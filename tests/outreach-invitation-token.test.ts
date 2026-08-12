import { describe, expect, it } from "vitest";
import {
  createOutreachInvitationToken,
  verifyOutreachInvitationToken,
} from "@/features/outreach/invitation-token";

describe("outreach invitation token", () => {
  const secret = "i".repeat(48);
  const outboxId = "00000000-0000-4000-8000-000000000101";

  it("binds the outbox and expiry with a purpose-separated HMAC", async () => {
    const token = await createOutreachInvitationToken({
      outboxId,
      secret,
      expiresAt: 2_000,
    });
    await expect(
      verifyOutreachInvitationToken(token, secret, 1_000),
    ).resolves.toEqual({ version: 1, outboxId, expiresAt: 2_000 });
    await expect(
      verifyOutreachInvitationToken(`${token.slice(0, -1)}x`, secret, 1_000),
    ).resolves.toBeNull();
    await expect(
      verifyOutreachInvitationToken(token, secret, 2_000),
    ).resolves.toBeNull();
  });

  it("fails closed without a production-length secret", async () => {
    await expect(
      createOutreachInvitationToken({
        outboxId,
        secret: "short",
        expiresAt: Date.now() + 1_000,
      }),
    ).rejects.toThrow("INVITATION_SIGNING_SECRET_REQUIRED");
  });
});
