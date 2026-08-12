"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { redeemOutreachInvitationToken } from "@/features/outreach/invitation-linking";
import { OUTREACH_INVITATION_COOKIE } from "@/features/outreach/invitation-token";
import { getSiteUrl, isDemoMode, isSupabaseConfigured } from "@/lib/env";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { createClient } from "@/lib/supabase/server";
import {
  LOCALE_COOKIE_MAX_AGE,
  LOCALE_COOKIE_NAME,
  isLocaleEnabled,
  normalizeLocale,
} from "@/lib/i18n";
import {
  emailSchema,
  loginSchema,
  oauthProviderSchema,
  signupSchema,
} from "./schemas";
import {
  getOAuthProviderStatus,
  providerStartErrorMessage,
  providerUnavailableMessage,
} from "./providers";

async function restorePreferredLocaleCookie(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  const cookieStore = await cookies();
  if (normalizeLocale(cookieStore.get(LOCALE_COOKIE_NAME)?.value)) return;

  try {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("preferred_locale")
      .eq("id", userId)
      .maybeSingle();
    const locale = normalizeLocale(profile?.preferred_locale);
    if (
      error ||
      !isLocaleEnabled(locale, isFeatureEnabled("ENABLE_EXTENDED_LOCALES"))
    ) {
      return;
    }
    cookieStore.set(LOCALE_COOKIE_NAME, locale, {
      path: "/",
      maxAge: LOCALE_COOKIE_MAX_AGE,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      httpOnly: false,
    });
  } catch {
    // Authentication must still succeed when an optional locale restore fails.
  }
}

function authRedirect(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

async function redeemPendingOutreachInvitation(profileId: string) {
  if (!isFeatureEnabled("ENABLE_OUTREACH_AGENT")) return null;
  const cookieStore = await cookies();
  const token = cookieStore.get(OUTREACH_INVITATION_COOKIE)?.value;
  if (!token) return null;
  const result = await redeemOutreachInvitationToken({ token, profileId });
  if (result.status === "linked" || result.status === "invalid") {
    cookieStore.delete(OUTREACH_INVITATION_COOKIE);
  }
  return result;
}

export async function signupAction(formData: FormData) {
  const parsed = signupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    acceptedTerms: formData.get("acceptedTerms"),
  });

  if (!parsed.success) {
    authRedirect("/signup", parsed.error.issues[0]?.message ?? "Check the form.");
  }

  if (!isSupabaseConfigured()) {
    if (isDemoMode()) redirect("/onboarding?demo=1");
    authRedirect("/signup", "Sign-up is temporarily unavailable.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${getSiteUrl()}/auth/callback`,
    },
  });

  if (error) {
    authRedirect(
      "/signup",
      "Sign-up could not be completed. Please try again.",
    );
  }

  if (data.session?.user.id) {
    const invitation = await redeemPendingOutreachInvitation(
      data.session.user.id,
    );
    if (invitation?.status === "linked") {
      redirect(
        invitation.prospectStatus === "joined" ? "/feed" : "/onboarding",
      );
    }
  }

  redirect("/signup?checkEmail=1");
}

export async function loginAction(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    authRedirect("/login", parsed.error.issues[0]?.message ?? "Check the form.");
  }

  if (!isSupabaseConfigured()) {
    if (isDemoMode()) redirect("/feed");
    authRedirect("/login", "Sign-in is temporarily unavailable.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    authRedirect("/login", "Email or password was not recognized.");
  }

  if (data.user?.id) {
    await restorePreferredLocaleCookie(supabase, data.user.id);
    const invitation = await redeemPendingOutreachInvitation(data.user.id);
    if (invitation?.status === "linked") {
      redirect(
        invitation.prospectStatus === "joined" ? "/feed" : "/onboarding",
      );
    }
  }

  redirect("/feed");
}

export async function oauthSignInAction(formData: FormData) {
  const provider = oauthProviderSchema.safeParse(formData.get("provider"));
  const mode = formData.get("mode") === "signup" ? "signup" : "login";
  if (!provider.success) {
    authRedirect(`/${mode}`, "Choose a supported sign-in provider.");
  }

  if (!isSupabaseConfigured()) {
    if (isDemoMode()) redirect("/onboarding?demo=1");
    authRedirect(`/${mode}`, "Social sign-in is temporarily unavailable.");
  }

  const providerStatus = await getOAuthProviderStatus(provider.data);
  if (providerStatus === "disabled") {
    authRedirect(`/${mode}`, providerUnavailableMessage(provider.data));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth
    .signInWithOAuth({
      provider: provider.data,
      options: {
        redirectTo: `${getSiteUrl()}/auth/callback?next=/feed`,
      },
    })
    .catch(() => ({ data: { url: null }, error: new Error("OAuth failed") }));

  if (error || !data.url) {
    authRedirect(`/${mode}`, providerStartErrorMessage(provider.data));
  }

  redirect(data.url);
}

export async function requestPasswordResetAction(formData: FormData) {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    authRedirect("/forgot-password", parsed.error.issues[0]?.message);
  }

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: `${getSiteUrl()}/auth/callback?next=/settings/account`,
    });
  } else if (!isDemoMode()) {
    authRedirect(
      "/forgot-password",
      "Password reset is temporarily unavailable.",
    );
  }

  redirect("/forgot-password?sent=1");
}

export async function logoutAction() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}
