import { NextResponse } from "next/server";
import { validateOutreachInvitationToken } from "@/features/outreach/invitation-linking";
import { OUTREACH_INVITATION_COOKIE } from "@/features/outreach/invitation-token";
import { getSiteUrl, isDemoMode, isSupabaseConfigured } from "@/lib/env";
import { isFeatureEnabled } from "@/lib/feature-flags";

function signupRedirect(state: "invited" | "invalid" | "unavailable") {
  const destination = new URL("/signup", getSiteUrl());
  destination.searchParams.set("invite", state);
  return destination;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  if (
    !isFeatureEnabled("ENABLE_OUTREACH_AGENT") ||
    isDemoMode() ||
    !isSupabaseConfigured()
  ) {
    return NextResponse.redirect(signupRedirect("unavailable"));
  }
  const { token } = await context.params;
  const validation = await validateOutreachInvitationToken(token);
  if (validation.status !== "active") {
    return NextResponse.redirect(
      signupRedirect(
        validation.status === "unavailable" ? "unavailable" : "invalid",
      ),
    );
  }

  const response = NextResponse.redirect(signupRedirect("invited"));
  response.cookies.set(OUTREACH_INVITATION_COOKIE, token, {
    httpOnly: true,
    secure: new URL(request.url).protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: Math.max(
      1,
      Math.floor((validation.expiresAt - Date.now()) / 1_000),
    ),
  });
  return response;
}
