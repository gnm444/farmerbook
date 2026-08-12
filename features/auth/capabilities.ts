import type { EcosystemAccountRole } from "@/features/onboarding/types";

export const AGRICULTURE_CAPABILITIES = [
  "manage_affinities",
  "buy",
  "sell_produce",
  "publish_business_offers",
  "manage_business_profile",
  "submit_custom_category",
] as const;

export type AgricultureCapability =
  (typeof AGRICULTURE_CAPABILITIES)[number];

export const ORGANIZATION_MEMBERSHIP_ROLES = [
  "owner",
  "admin",
  "editor",
  "enquiry_agent",
  "viewer",
] as const;

export type OrganizationMembershipRole =
  (typeof ORGANIZATION_MEMBERSHIP_ROLES)[number];

const capabilitiesByRole: Record<
  EcosystemAccountRole,
  readonly AgricultureCapability[]
> = {
  farmer: [
    "manage_affinities",
    "buy",
    "sell_produce",
    "submit_custom_category",
  ],
  customer: ["manage_affinities", "buy", "submit_custom_category"],
  wholesaler: [
    "manage_affinities",
    "buy",
    "sell_produce",
    "submit_custom_category",
  ],
  agri_business: [
    "manage_affinities",
    "buy",
    "publish_business_offers",
    "manage_business_profile",
    "submit_custom_category",
  ],
};

export function capabilitiesForRole(role: EcosystemAccountRole) {
  return capabilitiesByRole[role];
}

export function hasAgricultureCapability(
  role: EcosystemAccountRole,
  capability: AgricultureCapability,
) {
  return capabilitiesByRole[role].includes(capability);
}

export function canPublishProduce(role: EcosystemAccountRole) {
  return hasAgricultureCapability(role, "sell_produce");
}

export function canSource(role: EcosystemAccountRole) {
  return hasAgricultureCapability(role, "buy");
}

export function canManageOrganization(role: OrganizationMembershipRole) {
  return role === "owner" || role === "admin" || role === "editor";
}

export function canRespondToOrganizationEnquiries(
  role: OrganizationMembershipRole,
) {
  return role === "owner" || role === "admin" || role === "enquiry_agent";
}

export function isAgricultureBusinessRole(role: string): role is "agri_business" {
  return role === "agri_business";
}
