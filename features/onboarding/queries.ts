import { requireUser } from "@/features/auth/require-user";
import { DEFAULT_LOCALE, normalizeLocale } from "@/lib/i18n/locales";
import { createClient } from "@/lib/supabase/server";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { managedFarmerProfileSampleSchema } from "@/features/profile-agent/schemas";
import type { FarmerProfile } from "@/lib/types";
import {
  ONBOARDING_FLOW_VERSION,
  ONBOARDING_STEPS,
  type AgricultureOnboardingDraft,
  type EcosystemAccountRole,
  type OnboardingProgressRecord,
  type OnboardingProgressStatus,
  type OnboardingStep,
} from "./types";
import { onboardingDraftDataSchema } from "./schemas";

type ProgressRow = {
  account_role: EcosystemAccountRole | null;
  current_step: OnboardingStep;
  completed_steps: OnboardingStep[];
  draft_data: Partial<AgricultureOnboardingDraft> | null;
  revision: number;
  last_idempotency_key: string | null;
  last_idempotency_fingerprint: string | null;
  status: OnboardingProgressStatus;
};

export function emptyOnboardingProgress(profile: FarmerProfile): OnboardingProgressRecord {
  return {
    flowVersion: ONBOARDING_FLOW_VERSION,
    revision: 0,
    locale: normalizeLocale(profile.preferredLocale) ?? DEFAULT_LOCALE,
    accountRole: null,
    currentStep: ONBOARDING_STEPS[0],
    completedSteps: [],
    selectedCategorySlugs: profile.categoryAffinities.map((item) => item.categorySlug),
    customCategoryLabels: [],
    companySectorSlugs: [],
    identity: {
      fullName: profile.fullName,
      handle: profile.handle,
      district: profile.district,
      state: profile.state,
      bio: profile.bio,
    },
    roleDetails: {
      farmingMethod: profile.farmingMethod,
      experienceYears: profile.experienceYears ?? 0,
    },
    reviewVisibility: {
      profileVisibility: profile.publicProfileEnabled ? "public" : "members",
      termsAccepted: false,
    },
    status: "not_started",
  };
}

export async function loadOnboardingProgress(
  profile: FarmerProfile,
): Promise<OnboardingProgressRecord> {
  let fallback = emptyOnboardingProgress(profile);
  const user = await requireUser({ allowIncomplete: true });
  if (user.demo) return fallback;

  const supabase = await createClient();
  const [{ data, error }, claimedSampleResult] = await Promise.all([
    supabase
      .from("onboarding_progress")
      .select(
        "account_role, current_step, completed_steps, draft_data, revision, last_idempotency_key, last_idempotency_fingerprint, status",
      )
      .eq("profile_id", user.id)
      .maybeSingle(),
    isFeatureEnabled("ENABLE_PROFILE_RESEARCH_AGENT")
      ? supabase.rpc("get_claimed_managed_profile_sample")
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (error) throw new Error("Onboarding progress is temporarily unavailable.");
  if (!claimedSampleResult.error && claimedSampleResult.data) {
    const claimed = managedFarmerProfileSampleSchema.safeParse(
      claimedSampleResult.data,
    );
    if (claimed.success) {
      fallback = {
        ...fallback,
        selectedCategorySlugs: claimed.data.categorySlugs,
        identity: {
          ...fallback.identity,
          fullName: claimed.data.fullName,
          handle: fallback.identity?.handle ?? profile.handle,
          district: claimed.data.district ?? fallback.identity?.district ?? "",
          state: claimed.data.state ?? fallback.identity?.state ?? "",
          bio: claimed.data.bio,
        },
        roleDetails: {
          ...fallback.roleDetails,
          farmingMethod:
            claimed.data.farmingMethod ?? fallback.roleDetails?.farmingMethod,
          experienceYears:
            claimed.data.experienceYears ??
            fallback.roleDetails?.experienceYears ??
            0,
        },
      };
    }
  }
  if (!data) return fallback;

  const row = data as ProgressRow;
  const parsedDraft = onboardingDraftDataSchema.safeParse(row.draft_data ?? {});
  const draft = parsedDraft.success ? parsedDraft.data : {};
  return {
    ...fallback,
    ...draft,
    flowVersion: ONBOARDING_FLOW_VERSION,
    revision: row.revision,
    locale: normalizeLocale(draft.locale) ?? fallback.locale,
    accountRole: row.account_role,
    currentStep: ONBOARDING_STEPS.includes(row.current_step)
      ? row.current_step
      : ONBOARDING_STEPS[0],
    completedSteps: row.completed_steps.filter((step) => ONBOARDING_STEPS.includes(step)),
    selectedCategorySlugs:
      draft.selectedCategorySlugs ?? fallback.selectedCategorySlugs,
    customCategoryLabels: draft.customCategoryLabels ?? [],
    companySectorSlugs: draft.companySectorSlugs ?? [],
    lastIdempotencyKey: row.last_idempotency_key ?? undefined,
    status: row.status,
  };
}
