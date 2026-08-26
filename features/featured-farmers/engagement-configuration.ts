import { isDemoMode, isSupabaseConfigured } from "@/lib/env";
import { isFeatureEnabled } from "@/lib/feature-flags";

export function featuredFarmerEngagementConfiguration() {
  const enabled = isFeatureEnabled("ENABLE_FEATURED_FARMER_ENGAGEMENT");
  const publicReady = enabled && !isDemoMode() && isSupabaseConfigured();
  const questionDeliveryReady = Boolean(
    publicReady &&
      (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").length >= 20 &&
      (process.env.FEATURED_FARMER_ENGAGEMENT_HASH_SECRET ?? "").length >= 32 &&
      (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "").length >= 3 &&
      (process.env.TURNSTILE_SECRET_KEY ?? "").length >= 8 &&
      (process.env.POSTMARK_SERVER_TOKEN ?? "").length >= 20 &&
      (process.env.POSTMARK_FROM_EMAIL ?? "").trim().toLowerCase() ===
        "ceo@farmerbook.in" &&
      /^[A-Za-z0-9_-]{1,100}$/.test(
        process.env.POSTMARK_TRANSACTIONAL_MESSAGE_STREAM ?? "",
      ),
  );

  return {
    enabled,
    publicReady,
    questionDeliveryReady,
    turnstileSiteKey: questionDeliveryReady
      ? process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ""
      : "",
  };
}
