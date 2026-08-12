import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  configured: true,
  createClient: vi.fn(),
  outreachEnabled: false,
  redeemInvitation: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  getSiteUrl: () => "https://farmerbook.test",
  isSupabaseConfigured: () => authMocks.configured,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: authMocks.createClient,
}));
vi.mock("@/lib/feature-flags", () => ({
  isFeatureEnabled: (name: string) =>
    name === "ENABLE_OUTREACH_AGENT" && authMocks.outreachEnabled,
}));
vi.mock("@/features/outreach/invitation-linking", () => ({
  readOutreachInvitationCookie: (header: string | null) =>
    header?.includes("farmerbook_outreach_invite=valid-token")
      ? "valid-token"
      : null,
  redeemOutreachInvitationToken: authMocks.redeemInvitation,
}));

import { GET } from "@/app/auth/callback/route";

function request(query = "") {
  return new Request(`https://farmerbook.test/auth/callback${query}`);
}

describe("OAuth callback", () => {
  beforeEach(() => {
    authMocks.configured = true;
    authMocks.outreachEnabled = false;
    authMocks.createClient.mockReset();
    authMocks.redeemInvitation.mockReset();
  });

  it("maps provider denial to a bounded login error without exchanging a code", async () => {
    const response = await GET(
      request(
        "?error=access_denied&error_description=private-provider-details",
      ),
    );
    const destination = new URL(response.headers.get("location")!);

    expect(destination.pathname).toBe("/login");
    expect(destination.searchParams.get("error")).toBe(
      "Social sign-in was cancelled. Please try again when you are ready.",
    );
    expect(destination.href).not.toContain("private-provider-details");
    expect(authMocks.createClient).not.toHaveBeenCalled();
  });

  it("handles an error-code-only provider callback", async () => {
    const response = await GET(request("?error_code=provider_error"));
    const destination = new URL(response.headers.get("location")!);

    expect(destination.pathname).toBe("/login");
    expect(destination.searchParams.get("error")).toContain(
      "Social sign-in could not be completed",
    );
    expect(authMocks.createClient).not.toHaveBeenCalled();
  });

  it("does not expose session-exchange errors", async () => {
    authMocks.createClient.mockResolvedValue({
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({
          error: new Error("sensitive Supabase exchange detail"),
        }),
      },
    });

    const response = await GET(request("?code=oauth-code"));
    const destination = new URL(response.headers.get("location")!);

    expect(destination.pathname).toBe("/login");
    expect(destination.searchParams.get("error")).toContain(
      "Social sign-in could not be completed",
    );
    expect(destination.href).not.toContain("sensitive");
  });

  it("turns missing codes and thrown exchanges into a login error", async () => {
    const missingCodeResponse = await GET(request());
    expect(new URL(missingCodeResponse.headers.get("location")!).pathname).toBe(
      "/login",
    );

    authMocks.createClient.mockRejectedValue(new Error("network failure"));
    const thrownExchangeResponse = await GET(request("?code=oauth-code"));
    expect(
      new URL(thrownExchangeResponse.headers.get("location")!).pathname,
    ).toBe("/login");
  });

  it("exchanges a valid code and preserves a safe destination", async () => {
    const exchangeCodeForSession = vi
      .fn()
      .mockResolvedValue({ error: null });
    authMocks.createClient.mockResolvedValue({
      auth: { exchangeCodeForSession },
    });

    const response = await GET(
      request("?code=oauth-code&next=%2Fpurchases%3Fstatus%3Dwon"),
    );

    expect(exchangeCodeForSession).toHaveBeenCalledWith("oauth-code");
    expect(response.headers.get("location")).toBe(
      "https://farmerbook.test/purchases?status=won",
    );
  });

  it("links a signed invitation after authentication and clears its HTTP-only handoff", async () => {
    authMocks.outreachEnabled = true;
    authMocks.redeemInvitation.mockResolvedValue({
      status: "linked",
      prospectStatus: "onboarding",
    });
    const exchangeCodeForSession = vi.fn().mockResolvedValue({
      data: { user: { id: "00000000-0000-4000-8000-000000000301" } },
      error: null,
    });
    authMocks.createClient.mockResolvedValue({
      auth: { exchangeCodeForSession },
    });

    const response = await GET(
      new Request("https://farmerbook.test/auth/callback?code=oauth-code", {
        headers: {
          cookie:
            "farmerbook_outreach_invite=valid-token; fb_locale=en-IN",
        },
      }),
    );

    expect(authMocks.redeemInvitation).toHaveBeenCalledWith({
      token: "valid-token",
      profileId: "00000000-0000-4000-8000-000000000301",
    });
    expect(response.headers.get("location")).toBe(
      "https://farmerbook.test/onboarding",
    );
    expect(response.headers.get("set-cookie")).toContain(
      "farmerbook_outreach_invite=",
    );
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });
});
