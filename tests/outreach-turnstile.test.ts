import { describe, expect, it, vi } from "vitest";
import { verifyTurnstileToken } from "@/features/outreach/turnstile";

function siteverify(payload: object, status = 200) {
  return vi.fn(async () => Response.json(payload, { status })) as typeof fetch;
}

describe("outreach Turnstile verification", () => {
  const options = {
    secret: "turnstile-secret",
    expectedHostname: "farmerbook.in",
    expectedAction: "farmerbook_join",
  } as const;

  it("accepts only an exact successful hostname and action", async () => {
    await expect(
      verifyTurnstileToken("token", {
        ...options,
        fetcher: siteverify({
          success: true,
          hostname: "farmerbook.in",
          action: "farmerbook_join",
        }),
      }),
    ).resolves.toBe(true);
  });

  it.each([
    { success: true, action: "farmerbook_join" },
    { success: true, hostname: "farmerbook.in" },
    { success: true, hostname: "www.farmerbook.in", action: "farmerbook_join" },
    { success: true, hostname: "farmerbook.in", action: "farmerbook_partner_interest" },
    { success: false, hostname: "farmerbook.in", action: "farmerbook_join" },
  ])("fails closed on missing or mismatched verification fields", async (payload) => {
    await expect(
      verifyTurnstileToken("token", {
        ...options,
        fetcher: siteverify(payload),
      }),
    ).resolves.toBe(false);
  });
});
