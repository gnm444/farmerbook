import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  configured: false,
  cookieSet: vi.fn(),
  cookies: vi.fn(),
  createClient: vi.fn(),
}));

vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("@/lib/env", () => ({
  isSupabaseConfigured: () => mocks.configured,
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));

import { saveLocalePreferenceAction } from "@/features/profiles/locale-actions";
import {
  LOCALE_COOKIE_MAX_AGE,
  LOCALE_COOKIE_NAME,
} from "@/lib/i18n";

describe("locale preference persistence", () => {
  beforeEach(() => {
    vi.stubEnv("ENABLE_EXTENDED_LOCALES", "true");
    mocks.configured = false;
    mocks.cookieSet.mockReset();
    mocks.cookies.mockReset().mockResolvedValue({ set: mocks.cookieSet });
    mocks.createClient.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects unsupported input before writing state", async () => {
    await expect(saveLocalePreferenceAction("fr-FR")).resolves.toEqual({
      ok: false,
      code: "invalid_locale",
    });
    expect(mocks.cookies).not.toHaveBeenCalled();
  });

  it("rejects beta locales while the extended-locale release is disabled", async () => {
    vi.stubEnv("ENABLE_EXTENDED_LOCALES", "false");
    await expect(saveLocalePreferenceAction("ta-IN")).resolves.toEqual({
      ok: false,
      code: "locale_disabled",
    });
    expect(mocks.cookies).not.toHaveBeenCalled();
  });

  it("writes a bounded, year-long locale cookie for anonymous/demo use", async () => {
    await expect(saveLocalePreferenceAction("ta")).resolves.toEqual({
      ok: true,
      locale: "ta-IN",
      profilePersisted: false,
    });
    expect(mocks.cookieSet).toHaveBeenCalledWith(
      LOCALE_COOKIE_NAME,
      "ta-IN",
      expect.objectContaining({
        path: "/",
        maxAge: LOCALE_COOKIE_MAX_AGE,
        sameSite: "lax",
        httpOnly: false,
      }),
    );
  });

  it("persists the BCP-47 preference for an authenticated profile", async () => {
    mocks.configured = true;
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq });
    mocks.createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({ update }),
    });

    await expect(saveLocalePreferenceAction("ks")).resolves.toEqual({
      ok: true,
      locale: "ks-Arab-IN",
      profilePersisted: true,
    });
    expect(update).toHaveBeenCalledWith({ preferred_locale: "ks-Arab-IN" });
    expect(eq).toHaveBeenCalledWith("id", "user-1");
  });

  it("returns stable warnings without exposing profile backend errors", async () => {
    mocks.configured = true;
    mocks.createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: new Error("sensitive database detail"),
          }),
        }),
      }),
    });

    const result = await saveLocalePreferenceAction("ur");
    expect(result).toEqual({
      ok: true,
      locale: "ur-IN",
      profilePersisted: false,
      warning: "profile_write_failed",
    });
    expect(JSON.stringify(result)).not.toContain("sensitive");
  });

  it("returns a stable cookie failure when request mutation is unavailable", async () => {
    mocks.cookies.mockRejectedValue(new Error("outside request scope"));
    await expect(saveLocalePreferenceAction("hi")).resolves.toEqual({
      ok: false,
      code: "cookie_write_failed",
    });
  });
});
