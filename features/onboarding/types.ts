import type { SupportedLocale } from "@/lib/i18n/locales";

export type AppLocale = SupportedLocale;

export const ECOSYSTEM_ACCOUNT_ROLES = [
  "farmer",
  "customer",
  "wholesaler",
  "agri_business",
] as const;

export type EcosystemAccountRole = (typeof ECOSYSTEM_ACCOUNT_ROLES)[number];

export const AGRICULTURE_AFFINITY_KINDS = [
  "grows",
  "raises",
  "farms",
  "catches",
  "processes",
  "buys",
  "sells",
  "supplies",
  "services",
  "interested_in",
] as const;

export type AgricultureAffinityKind =
  (typeof AGRICULTURE_AFFINITY_KINDS)[number];

export const ONBOARDING_FLOW_VERSION = 1 as const;

export const ONBOARDING_STEPS = [
  "language",
  "role",
  "identity_location",
  "agriculture",
  "role_details",
  "review_visibility",
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export type OnboardingProgressStatus =
  | "not_started"
  | "in_progress"
  | "complete";

export type AgricultureOnboardingDraft = {
  flowVersion: typeof ONBOARDING_FLOW_VERSION;
  revision: number;
  locale: AppLocale;
  accountRole: EcosystemAccountRole | null;
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  selectedCategorySlugs: string[];
  customCategoryLabels: string[];
  companySectorSlugs: string[];
  identity?: OnboardingIdentity;
  roleDetails?: OnboardingRoleDetails;
  reviewVisibility?: OnboardingReviewVisibility;
};

export type OnboardingIdentity = {
  fullName: string;
  handle: string;
  district: string;
  state: string;
  bio: string;
};

export type OrganizationOnboardingDetails = {
  organizationName: string;
  organizationSlug: string;
  organizationType: string;
  description: string;
  websiteUrl?: string;
  serviceStates: string[];
};

export type OnboardingRoleDetails = {
  accountRole?: EcosystemAccountRole;
  farmingMethod?: "organic" | "natural" | "conventional" | "mixed";
  experienceYears?: number;
  organization?: OrganizationOnboardingDetails;
};

export type OnboardingReviewVisibility = {
  profileVisibility: "members" | "public";
  termsAccepted: boolean;
};

export type OnboardingProgressRecord = AgricultureOnboardingDraft & {
  status: OnboardingProgressStatus;
  lastIdempotencyKey?: string;
};

export type OnboardingMutationRequest<TStepData = unknown> = {
  flowVersion: typeof ONBOARDING_FLOW_VERSION;
  expectedRevision: number;
  idempotencyKey: string;
  step: OnboardingStep;
  data: TStepData;
};

export type OnboardingActionErrorCode =
  | "UNAUTHENTICATED"
  | "FEATURE_DISABLED"
  | "INVALID_INPUT"
  | "INVALID_FLOW_VERSION"
  | "REVISION_CONFLICT"
  | "IDEMPOTENCY_CONFLICT"
  | "NOT_FOUND"
  | "INTERNAL_ERROR";

export type OnboardingActionResult<TData = undefined> =
  | {
      ok: true;
      code: "SAVED" | "COMPLETED" | "IDEMPOTENT_REPLAY";
      revision: number;
      data: TData;
    }
  | {
      ok: false;
      code: OnboardingActionErrorCode;
      revision: number | null;
      fieldErrors?: Readonly<Record<string, readonly string[]>>;
    };
