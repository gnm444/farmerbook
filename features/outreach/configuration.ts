import { isDemoMode, isSupabaseConfigured } from "@/lib/env";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { createConfiguredOutreachProvider } from "./providers";

export function isOutreachConsentIntakeConfigured() {
  if (
    !isFeatureEnabled("ENABLE_OUTREACH_AGENT") ||
    isDemoMode() ||
    !isSupabaseConfigured()
  ) {
    return false;
  }

  return Boolean(
    (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").length >= 20 &&
      (process.env.OUTREACH_CONSENT_SIGNING_SECRET ?? "").length >= 32 &&
      (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "").length >= 3 &&
      (process.env.TURNSTILE_SECRET_KEY ?? "").length >= 8 &&
      process.env.OUTREACH_PROVIDER_KIND === "postmark" &&
      createConfiguredOutreachProvider().configured,
  );
}
