import type { OrganizationMembershipRole } from "@/features/auth/capabilities";

export const ORGANIZATION_TYPES = [
  "manufacturer_brand",
  "dealer_distributor",
  "retailer",
  "wholesaler_trader",
  "processor_exporter",
  "fpo_cooperative",
  "custom_hiring_rental_centre",
  "logistics_warehouse",
  "finance_insurance",
  "advisory_training_research",
  "ngo",
  "government_support_body",
] as const;

export type OrganizationType = (typeof ORGANIZATION_TYPES)[number];

export const organizationTypeLabels: Record<OrganizationType, string> = {
  manufacturer_brand: "Manufacturer or brand",
  dealer_distributor: "Dealer or distributor",
  retailer: "Retailer",
  wholesaler_trader: "Wholesaler or trader",
  processor_exporter: "Processor or exporter",
  fpo_cooperative: "FPO or cooperative",
  custom_hiring_rental_centre: "Custom hiring or rental centre",
  logistics_warehouse: "Logistics or warehouse",
  finance_insurance: "Finance or insurance provider",
  advisory_training_research: "Advisory, training or research",
  ngo: "NGO",
  government_support_body: "Government or support body",
};

export type OrganizationPublicationState =
  | "draft"
  | "published"
  | "unpublished";
export type OrganizationVerificationState =
  | "unverified"
  | "pending"
  | "verified"
  | "rejected";
export type OrganizationModerationState =
  | "active"
  | "restricted"
  | "suspended";
export type OrganizationMembershipStatus =
  | "invited"
  | "active"
  | "suspended"
  | "removed";

export type OrganizationServiceArea = {
  state: string;
  district?: string;
  serviceRadiusKm?: number;
};

export type OrganizationSummary = {
  id: string;
  slug: string;
  displayName: string;
  organizationType: OrganizationType;
  description: string;
  state: string;
  district?: string;
  websiteUrl?: string;
  sectorSlugs: string[];
  serviceAreas: OrganizationServiceArea[];
  publicationState: OrganizationPublicationState;
  verificationState: OrganizationVerificationState;
  moderationState: OrganizationModerationState;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
};

export type OrganizationMembership = {
  organizationId: string;
  profileId: string;
  role: OrganizationMembershipRole;
  status: OrganizationMembershipStatus;
};

export type OrganizationForMember = OrganizationSummary & {
  membershipRole: OrganizationMembershipRole;
};

export type OrganizationActionErrorCode =
  | "FEATURE_DISABLED"
  | "INVALID_INPUT"
  | "NOT_CONFIGURED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "NOT_PUBLISHABLE"
  | "DATA_UNAVAILABLE";

export type OrganizationActionResult<T> =
  | {
      ok: true;
      code: "CREATED" | "UPDATED" | "PUBLICATION_UPDATED";
      data: T;
    }
  | {
      ok: false;
      code: OrganizationActionErrorCode;
      message: string;
      fieldErrors?: Readonly<Record<string, readonly string[]>>;
    };
