"use server";

import { cookies } from "next/headers";
import {
  LOCALE_COOKIE_MAX_AGE,
  LOCALE_COOKIE_NAME,
  isLocaleEnabled,
  normalizeLocale,
  type SupportedLocale,
} from "@/lib/i18n";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { isFeatureEnabled } from "@/lib/feature-flags";

export type LocalePreferenceErrorCode =
  | "invalid_locale"
  | "locale_disabled"
  | "cookie_write_failed";

export type LocalePreferenceWarningCode =
  | "profile_read_failed"
  | "profile_write_failed";

export type LocalePreferenceResult =
  | {
      ok: true;
      locale: SupportedLocale;
      profilePersisted: boolean;
      warning?: LocalePreferenceWarningCode;
    }
  | { ok: false; code: LocalePreferenceErrorCode };

export async function saveLocalePreferenceAction(
  input: unknown,
): Promise<LocalePreferenceResult> {
  const locale = normalizeLocale(
    input instanceof FormData ? input.get("locale") : input,
  );
  if (!locale) return { ok: false, code: "invalid_locale" };
  if (!isLocaleEnabled(locale, isFeatureEnabled("ENABLE_EXTENDED_LOCALES"))) {
    return { ok: false, code: "locale_disabled" };
  }

  try {
    const cookieStore = await cookies();
    cookieStore.set(LOCALE_COOKIE_NAME, locale, {
      path: "/",
      maxAge: LOCALE_COOKIE_MAX_AGE,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      httpOnly: false,
    });
  } catch {
    return { ok: false, code: "cookie_write_failed" };
  }

  if (!isSupabaseConfigured()) {
    return { ok: true, locale, profilePersisted: false };
  }

  try {
    const supabase = await createClient();
    const { data, error: userError } = await supabase.auth.getUser();
    if (userError) {
      return {
        ok: true,
        locale,
        profilePersisted: false,
        warning: "profile_read_failed",
      };
    }
    if (!data.user) {
      return { ok: true, locale, profilePersisted: false };
    }

    const { error } = await supabase
      .from("profiles")
      .update({ preferred_locale: locale })
      .eq("id", data.user.id);
    return error
      ? {
          ok: true,
          locale,
          profilePersisted: false,
          warning: "profile_write_failed",
        }
      : { ok: true, locale, profilePersisted: true };
  } catch {
    return {
      ok: true,
      locale,
      profilePersisted: false,
      warning: "profile_write_failed",
    };
  }
}
