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
  "ENABLE_AI_COMPANY",
  "ENABLE_LIVE_AGENT_EXECUTION",
  "ENABLE_SUPPORT_SOCIAL_PILOT",
  "ENABLE_FEATURED_FARMER_PROFILES",
  "ENABLE_FEATURED_FARMER_ENGAGEMENT",
  "ENABLE_PRIVATE_FARMER_CONTACTS",
  "ENABLE_SOURCED_FARMER_RESEARCH",
  "ENABLE_FARM_VISITS",
] as const;

export type FeatureFlagName = (typeof featureFlagNames)[number];

export function isFeatureEnabled(name: FeatureFlagName) {
  const configuredValue = process.env[name]?.trim().toLowerCase();

  // The 23-locale catalog is a shipped accessibility capability, not an
  // experimental product surface. Keep an explicit `false` rollback switch,
  // while making every Scheduled Indian language available on installations
  // that do not carry a legacy rollout value.
  if (!configuredValue && name === "ENABLE_EXTENDED_LOCALES") return true;

  return configuredValue === "true";
}

export function getFeatureFlags() {
  return Object.fromEntries(
    featureFlagNames.map((name) => [name, isFeatureEnabled(name)]),
  ) as Record<FeatureFlagName, boolean>;
}
