import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getOAuthProviderStatus,
  parseProviderStatus,
  providerUnavailableMessage,
  providerStartErrorMessage,
} from "@/features/auth/providers";
import {
  oauthCallbackErrorMessage,
  publicAuthErrorMessage,
} from "@/features/auth/redirects";

const configuredSettings = {
  external: {
    google: true,
    facebook: true,
  },
};

describe("OAuth provider diagnostics", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("distinguishes enabled, disabled and malformed provider settings", () => {
    expect(parseProviderStatus(configuredSettings, "google")).toBe("enabled");
    expect(
      parseProviderStatus(
        { external: { google: true, facebook: false } },
        "facebook",
      ),
    ).toBe("disabled");
    expect(parseProviderStatus({ external: {} }, "facebook")).toBe("unknown");
    expect(parseProviderStatus({ external: null }, "facebook")).toBe(
      "unknown",
    );
  });

  it("checks the public Auth settings endpoint without a secret", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_SUPABASE_URL",
      "https://project-ref.supabase.co",
    );
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "public-key");
    const fetcher = vi.fn(async () => ({
      ok: true,
      json: async () => configuredSettings,
    }));

    await expect(getOAuthProviderStatus("facebook", fetcher)).resolves.toBe(
      "enabled",
    );
    expect(fetcher).toHaveBeenCalledWith(
      "https://project-ref.supabase.co/auth/v1/settings",
      expect.objectContaining({
        cache: "no-store",
        headers: { apikey: "public-key" },
      }),
    );
  });

  it("fails open when provider settings cannot be reached", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_SUPABASE_URL",
      "https://project-ref.supabase.co",
    );
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "public-key");
    const fetcher = vi.fn(async () => {
      throw new Error("network unavailable");
    });

    await expect(
      getOAuthProviderStatus("google", fetcher),
    ).resolves.toBe("unknown");
  });

  it("uses bounded messages for unavailable providers and callback errors", () => {
    expect(providerUnavailableMessage("facebook")).toContain("Facebook");
    expect(providerStartErrorMessage("facebook")).toBe(
      "Facebook sign-in could not be started. Please try again or continue with email.",
    );
    expect(oauthCallbackErrorMessage("access_denied", "arbitrary text")).toBe(
      "Social sign-in was cancelled. Please try again when you are ready.",
    );
    expect(
      oauthCallbackErrorMessage("server_error", "secret provider detail"),
    ).toBe(
      "Social sign-in could not be completed. Please try again or continue with email.",
    );
    expect(oauthCallbackErrorMessage(null, null)).toBeNull();
    expect(
      publicAuthErrorMessage(providerUnavailableMessage("facebook")),
    ).toBe(providerUnavailableMessage("facebook"));
    expect(publicAuthErrorMessage("<script>alert(1)</script>")).toBeNull();
  });
});
