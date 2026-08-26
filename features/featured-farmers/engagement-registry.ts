export const SANDEEP_DASARI_FEATURED_FARMER_SLUG =
  "sandeep-dasari-avani-van-farms";

const engagementRegistry = {
  [SANDEEP_DASARI_FEATURED_FARMER_SLUG]: {
    displayName: "Sandeep Dasari / Avani Van Farms",
    recipientEmail: "avanivanfarms@gmail.com",
    viewCookieName: "fb_ffv_sandeep",
  },
} as const;

export type FeaturedFarmerEngagementSlug = keyof typeof engagementRegistry;

export function getFeaturedFarmerEngagementSubject(slug: string) {
  return engagementRegistry[slug as FeaturedFarmerEngagementSlug] ?? null;
}

export function isFeaturedFarmerEngagementSlug(
  slug: string,
): slug is FeaturedFarmerEngagementSlug {
  return getFeaturedFarmerEngagementSubject(slug) !== null;
}
