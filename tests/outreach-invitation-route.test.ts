import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  validation: { status: "active", expiresAt: Date.now() + 60_000 } as
    | { status: "active"; expiresAt: number }
    | { status: "invalid" }
    | { status: "unavailable" },
}));

vi.mock("@/features/outreach/invitation-linking", () => ({
  validateOutreachInvitationToken: vi.fn(async () => mocks.validation),
}));
vi.mock("@/lib/env", () => ({
  getSiteUrl: () => "https://farmerbook.test",
  isDemoMode: () => false,
  isSupabaseConfigured: () => true,
}));
vi.mock("@/lib/feature-flags", () => ({ isFeatureEnabled: () => true }));

import { GET } from "@/app/invite/[token]/route";

describe("outreach invitation landing route", () => {
  beforeEach(() => {
    mocks.validation = { status: "active", expiresAt: Date.now() + 60_000 };
  });

  it("moves a validated token to an HTTP-only same-site cookie and removes it from the next URL", async () => {
    const response = await GET(
      new Request("https://farmerbook.test/invite/signed-token"),
      { params: Promise.resolve({ token: "signed-token" }) },
    );
    expect(response.headers.get("location")).toBe(
      "https://farmerbook.test/signup?invite=invited",
    );
    const cookie = response.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("farmerbook_outreach_invite=signed-token");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=lax");
    expect(response.headers.get("location")).not.toContain("signed-token");
  });

  it("does not set a cookie for an invalid invitation", async () => {
    mocks.validation = { status: "invalid" };
    const response = await GET(
      new Request("https://farmerbook.test/invite/bad-token"),
      { params: Promise.resolve({ token: "bad-token" }) },
    );
    expect(response.headers.get("location")).toBe(
      "https://farmerbook.test/signup?invite=invalid",
    );
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});
