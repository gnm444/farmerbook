export const featureFlagNames = [
  "ENABLE_CANONICAL_AGRICULTURE_TAXONOMY",
  "ENABLE_RESUMABLE_ONBOARDING",
  "ENABLE_AGRI_BUSINESSES",
  "ENABLE_BUSINESS_OFFERS",
  "ENABLE_INC_SOURCING",
  "ENABLE_EXTENDED_LOCALES",
  "ENABLE_OUTREACH_AGENT",
  "ENABLE_PROFILE_RESEARCH_AGENT",
  "ENABLE_MANAGED_OPERATIONS_AGENTS",
] as const;

export type FeatureFlagName = (typeof featureFlagNames)[number];

export function isFeatureEnabled(name: FeatureFlagName) {
  return process.env[name]?.trim().toLowerCase() === "true";
}

export function getFeatureFlags() {
  return Object.fromEntries(
    featureFlagNames.map((name) => [name, isFeatureEnabled(name)]),
  ) as Record<FeatureFlagName, boolean>;
}
