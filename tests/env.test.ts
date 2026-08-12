import { afterEach, describe, expect, it, vi } from "vitest";
import {
  assertPublicRuntimeConfiguration,
  getPublicSupabaseConfig,
  isDemoMode,
  isProductionSite,
  isSupabaseConfigured,
} from "@/lib/env";

describe("public runtime configuration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("allows an unconfigured local development origin", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "true");

    expect(isProductionSite()).toBe(false);
    expect(isDemoMode()).toBe(true);
    expect(isSupabaseConfigured()).toBe(false);
    expect(getPublicSupabaseConfig()).toBeNull();
  });

  it("rejects demo mode on a production origin", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://farmerbook.example");
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "true");

    expect(() => isSupabaseConfigured()).toThrow(/cannot start/i);
  });

  it("requires a complete live backend on a production origin", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://farmerbook.example");
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "false");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");

    expect(() => getPublicSupabaseConfig()).toThrow(/requires/i);
  });

  it("fails closed on an actual public request host when the configured URL is missing", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "false");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");

    expect(() =>
      assertPublicRuntimeConfiguration({ requestHost: "farmerbook.in" }),
    ).toThrow(/requires/i);
    expect(() =>
      assertPublicRuntimeConfiguration({ requestHost: "localhost:3000" }),
    ).not.toThrow();
  });

  it("fails closed when a forwarded public host is malformed", () => {
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "false");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");

    expect(() =>
      assertPublicRuntimeConfiguration({ requestHost: "not a valid host" }),
    ).toThrow(/requires/i);
  });

  it("accepts a complete live backend configuration", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://farmerbook.example");
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "false");
    vi.stubEnv(
      "NEXT_PUBLIC_SUPABASE_URL",
      "https://project-ref.supabase.co",
    );
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "public-key");

    expect(getPublicSupabaseConfig()).toEqual({
      url: "https://project-ref.supabase.co",
      publishableKey: "public-key",
    });
  });
});
