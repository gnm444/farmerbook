import { NextResponse } from "next/server";
import { getSiteUrl, isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import {
  oauthCallbackErrorMessage,
  oauthExchangeErrorMessage,
  safeNextPath,
} from "@/features/auth/redirects";
import {
  LOCALE_COOKIE_MAX_AGE,
  LOCALE_COOKIE_NAME,
  isLocaleEnabled,
  normalizeLocale,
} from "@/lib/i18n";
import { isFeatureEnabled } from "@/lib/feature-flags";
import {
  readOutreachInvitationCookie,
  redeemOutreachInvitationToken,
} from "@/features/outreach/invitation-linking";
import { OUTREACH_INVITATION_COOKIE } from "@/features/outreach/invitation-token";

function loginErrorRedirect(message: string) {
  const destination = new URL("/login", getSiteUrl());
  destination.searchParams.set("error", message);
  return NextResponse.redirect(destination);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  let next = safeNextPath(searchParams.get("next"));
  const callbackError = oauthCallbackErrorMessage(
    searchParams.get("error"),
    searchParams.get("error_description"),
    searchParams.get("error_code"),
  );
  let profileLocale = null as ReturnType<typeof normalizeLocale>;
  let invitationCookieDisposition: "keep" | "clear" = "keep";

  if (callbackError) {
    return loginErrorRedirect(callbackError);
  }

  if (code && isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        return loginErrorRedirect(oauthExchangeErrorMessage());
      }
      const requestLocale = normalizeLocale(
        request.headers
          .get("cookie")
          ?.match(new RegExp(`(?:^|;\\s*)${LOCALE_COOKIE_NAME}=([^;]+)`))?.[1],
      );
      const userId = data?.user?.id;
      const invitationToken = readOutreachInvitationCookie(
        request.headers.get("cookie"),
      );
      if (
        userId &&
        invitationToken &&
        isFeatureEnabled("ENABLE_OUTREACH_AGENT")
      ) {
        const invitation = await redeemOutreachInvitationToken({
          token: invitationToken,
          profileId: userId,
        });
        if (invitation.status === "linked") {
          next = invitation.prospectStatus === "joined" ? "/feed" : "/onboarding";
          invitationCookieDisposition = "clear";
        } else if (invitation.status === "invalid") {
          invitationCookieDisposition = "clear";
        }
      }
      if (!requestLocale && userId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("preferred_locale")
          .eq("id", userId)
          .maybeSingle();
        const savedLocale = normalizeLocale(profile?.preferred_locale);
        profileLocale = isLocaleEnabled(
          savedLocale,
          isFeatureEnabled("ENABLE_EXTENDED_LOCALES"),
        )
          ? savedLocale
          : null;
      }
    } catch {
      return loginErrorRedirect(oauthExchangeErrorMessage());
    }
  } else if (isSupabaseConfigured()) {
    return loginErrorRedirect(oauthExchangeErrorMessage());
  }

  const response = NextResponse.redirect(new URL(next, getSiteUrl()));
  if (profileLocale) {
    response.cookies.set(LOCALE_COOKIE_NAME, profileLocale, {
      path: "/",
      maxAge: LOCALE_COOKIE_MAX_AGE,
      sameSite: "lax",
      secure: new URL(request.url).protocol === "https:",
      httpOnly: false,
    });
  }
  if (invitationCookieDisposition === "clear") {
    response.cookies.set(OUTREACH_INVITATION_COOKIE, "", {
      path: "/",
      maxAge: 0,
      sameSite: "lax",
      secure: new URL(request.url).protocol === "https:",
      httpOnly: true,
    });
  }
  return response;
}
