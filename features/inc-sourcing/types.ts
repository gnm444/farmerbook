import type { SupportedLocale } from "@/lib/i18n";
import type { OrganizationSummary } from "@/features/organizations/types";

export const INC_SOURCING_UNITS = [
  "kg",
  "quintal",
  "tonne",
  "litre",
  "piece",
  "tray",
  "dozen",
] as const;
export type IncSourcingUnit = (typeof INC_SOURCING_UNITS)[number];

export const INC_SOURCING_CADENCES = [
  "one_time",
  "weekly",
  "monthly",
  "seasonal",
  "ongoing",
] as const;
export type IncSourcingCadence = (typeof INC_SOURCING_CADENCES)[number];

export const INC_SOURCING_CLAIM_TYPES = [
  "organization_registration",
  "authorized_representative",
  "gst_registration",
  "official_domain",
  "facility_registration",
  "industry_licence",
  "bank_account_name",
] as const;
export type IncVerificationClaimType =
  (typeof INC_SOURCING_CLAIM_TYPES)[number];

export type IncVerificationClaim = {
  id: string;
  organizationId: string;
  claimType: IncVerificationClaimType;
  scope: string;
  verifierClass: "registry" | "licensed_provider" | "official_domain" | "moderator";
  providerName: string;
  verifiedAt: string;
  expiresAt?: string;
};

export type IncSourcingPrice =
  | { model: "quote" }
  | { model: "target"; currency: "INR"; amount: number; unit: IncSourcingUnit }
  | {
      model: "range";
      currency: "INR";
      minimum: number;
      maximum: number;
      unit: IncSourcingUnit;
    };

export type IncSourcingRequest = {
  id: string;
  organizationId: string;
  contentLocale: SupportedLocale;
  productName: string;
  varietyOrGrade: string;
  qualityRequirements: string;
  quantityMinimum: number;
  quantityMaximum?: number;
  quantityUnit: IncSourcingUnit;
  cadence: IncSourcingCadence;
  deliveryMode: "collect" | "deliver" | "either";
  destinationState: string;
  destinationDistrict?: string;
  opensOn: string;
  closesOn: string;
  needBy: string;
  price: IncSourcingPrice;
  paymentTerms: string;
  requiredLicenceScope: string;
  categorySlugs: string[];
  publicationState: "draft" | "published" | "paused" | "closed" | "archived";
  moderationState: "not_required" | "pending" | "approved" | "rejected";
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  organization?: OrganizationSummary;
  verificationClaims: IncVerificationClaim[];
};

export type IncSourcingActionResult<T> =
  | { ok: true; code: "CREATED" | "PUBLICATION_UPDATED" | "RESPONDED" | "VERIFICATION_SUBMITTED"; data: T }
  | {
      ok: false;
      code:
        | "FEATURE_DISABLED"
        | "INVALID_INPUT"
        | "NOT_CONFIGURED"
        | "FORBIDDEN"
        | "NOT_FOUND"
        | "CONFLICT"
        | "VERIFICATION_REQUIRED"
        | "DATA_UNAVAILABLE";
      message: string;
      fieldErrors?: Readonly<Record<string, readonly string[]>>;
    };
