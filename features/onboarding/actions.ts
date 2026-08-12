"use server";

import { cookies } from "next/headers";
import { requireUser } from "@/features/auth/require-user";
import {
  LOCALE_COOKIE_MAX_AGE,
  LOCALE_COOKIE_NAME,
  type SupportedLocale,
} from "@/lib/i18n/locales";
import { createClient } from "@/lib/supabase/server";
import { isFeatureEnabled } from "@/lib/feature-flags";
import {
  finalizeOnboardingSchema,
  onboardingDraftDataSchema,
  onboardingMutationSchema,
  type ValidOnboardingMutation,
} from "./schemas";
import {
  ONBOARDING_FLOW_VERSION,
  ONBOARDING_STEPS,
  type AgricultureOnboardingDraft,
  type OnboardingActionResult,
  type OnboardingProgressRecord,
  type OnboardingStep,
} from "./types";

type StoredProgress = {
  account_role: AgricultureOnboardingDraft["accountRole"];
  current_step: OnboardingStep;
  completed_steps: OnboardingStep[];
  draft_data: Partial<AgricultureOnboardingDraft>;
  revision: number;
  last_idempotency_key: string | null;
  last_idempotency_fingerprint: string | null;
  status: OnboardingProgressRecord["status"];
};

const CORE_ONBOARDING_LOCALES = new Set(["en-IN", "hi-IN", "mr-IN"]);

function resumableOnboardingEnabled() {
  return (
    isFeatureEnabled("ENABLE_CANONICAL_AGRICULTURE_TAXONOMY") &&
    isFeatureEnabled("ENABLE_RESUMABLE_ONBOARDING")
  );
}

function fieldErrors(error: { flatten(): { fieldErrors: Record<string, string[]> } }) {
  return error.flatten().fieldErrors;
}

function nextStep(step: OnboardingStep) {
  return ONBOARDING_STEPS[Math.min(ONBOARDING_STEPS.indexOf(step) + 1, ONBOARDING_STEPS.length - 1)];
}

function mergedDraft(row: StoredProgress | null, request: ValidOnboardingMutation) {
  const current = row?.draft_data ?? {};
  switch (request.step) {
    case "language":
      return { ...current, locale: request.data.locale };
    case "role":
      return {
        ...current,
        accountRole: request.data.accountRole,
        roleDetails: undefined,
        companySectorSlugs: [],
      };
    case "identity_location":
      return { ...current, identity: request.data };
    case "agriculture":
      return { ...current, ...request.data };
    case "role_details":
      return {
        ...current,
        roleDetails: request.data,
        companySectorSlugs:
          request.data.accountRole === "agri_business"
            ? request.data.organization.companySectorSlugs
            : [],
      };
    case "review_visibility":
      return { ...current, reviewVisibility: request.data };
  }
}

function progressResult(row: StoredProgress): OnboardingProgressRecord {
  return {
    flowVersion: ONBOARDING_FLOW_VERSION,
    revision: row.revision,
    locale: (row.draft_data.locale ?? "en-IN") as SupportedLocale,
    accountRole: row.account_role,
    currentStep: row.current_step,
    completedSteps: row.completed_steps,
    selectedCategorySlugs: row.draft_data.selectedCategorySlugs ?? [],
    customCategoryLabels: row.draft_data.customCategoryLabels ?? [],
    companySectorSlugs: row.draft_data.companySectorSlugs ?? [],
    identity: row.draft_data.identity,
    roleDetails: row.draft_data.roleDetails,
    reviewVisibility: row.draft_data.reviewVisibility,
    lastIdempotencyKey: row.last_idempotency_key ?? undefined,
    status: row.status,
  };
}

const progressColumns =
  "account_role, current_step, completed_steps, draft_data, revision, last_idempotency_key, last_idempotency_fingerprint, status";

async function mutationFingerprint(request: ValidOnboardingMutation) {
  const bytes = new TextEncoder().encode(
    JSON.stringify({
      flowVersion: request.flowVersion,
      step: request.step,
      data: request.data,
    }),
  );
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

async function readProgress(supabase: Awaited<ReturnType<typeof createClient>>, profileId: string) {
  const { data, error } = await supabase
    .from("onboarding_progress")
    .select(progressColumns)
    .eq("profile_id", profileId)
    .maybeSingle();
  const row = (data as StoredProgress | null) ?? null;
  if (row) {
    const parsedDraft = onboardingDraftDataSchema.safeParse(row.draft_data);
    row.draft_data = parsedDraft.success ? parsedDraft.data : {};
  }
  return { row, error };
}

export async function saveOnboardingStepAction(
  input: unknown,
): Promise<OnboardingActionResult<OnboardingProgressRecord>> {
  if (!resumableOnboardingEnabled()) {
    return { ok: false, code: "FEATURE_DISABLED", revision: null };
  }
  const parsed = onboardingMutationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "INVALID_INPUT",
      revision: null,
      fieldErrors: fieldErrors(parsed.error),
    };
  }
  if (
    parsed.data.step === "language" &&
    !isFeatureEnabled("ENABLE_EXTENDED_LOCALES") &&
    !CORE_ONBOARDING_LOCALES.has(parsed.data.data.locale)
  ) {
    return { ok: false, code: "FEATURE_DISABLED", revision: null };
  }
  if (
    !isFeatureEnabled("ENABLE_AGRI_BUSINESSES") &&
    ((parsed.data.step === "role" &&
      parsed.data.data.accountRole === "agri_business") ||
      (parsed.data.step === "role_details" &&
        parsed.data.data.accountRole === "agri_business"))
  ) {
    return { ok: false, code: "FEATURE_DISABLED", revision: null };
  }

  const user = await requireUser({ allowIncomplete: true });
  if (user.demo) {
    const synthetic = {
      account_role:
        parsed.data.step === "role" ? parsed.data.data.accountRole : null,
      current_step: nextStep(parsed.data.step),
      completed_steps: ONBOARDING_STEPS.slice(0, ONBOARDING_STEPS.indexOf(parsed.data.step) + 1),
      draft_data: mergedDraft(null, parsed.data),
      revision: parsed.data.expectedRevision + 1,
      last_idempotency_key: parsed.data.idempotencyKey,
      last_idempotency_fingerprint: await mutationFingerprint(parsed.data),
      status: "in_progress" as const,
    } satisfies StoredProgress;
    return { ok: true, code: "SAVED", revision: synthetic.revision, data: progressResult(synthetic) };
  }

  const supabase = await createClient();
  const fingerprint = await mutationFingerprint(parsed.data);
  const { row, error: readError } = await readProgress(supabase, user.id);
  if (readError) return { ok: false, code: "INTERNAL_ERROR", revision: null };
  if (row?.last_idempotency_key === parsed.data.idempotencyKey) {
    if (row.last_idempotency_fingerprint !== fingerprint) {
      return { ok: false, code: "IDEMPOTENCY_CONFLICT", revision: row.revision };
    }
    return { ok: true, code: "IDEMPOTENT_REPLAY", revision: row.revision, data: progressResult(row) };
  }
  const requestedStepIndex = ONBOARDING_STEPS.indexOf(parsed.data.step);
  const precedingSteps = ONBOARDING_STEPS.slice(0, requestedStepIndex);
  const stepIsCurrentOrCompleted = Boolean(
    row &&
      (row.current_step === parsed.data.step ||
        row.completed_steps.includes(parsed.data.step)),
  );
  if (
    (!row && parsed.data.step !== "language") ||
    (row && !stepIsCurrentOrCompleted) ||
    (row && !precedingSteps.every((step) => row.completed_steps.includes(step))) ||
    (parsed.data.step === "role_details" &&
      parsed.data.data.accountRole !== row?.account_role) ||
    (parsed.data.step === "review_visibility" &&
      row?.account_role === "customer" &&
      parsed.data.data.profileVisibility !== "members")
  ) {
    return {
      ok: false,
      code: "INVALID_INPUT",
      revision: row?.revision ?? 0,
    };
  }
  if ((row?.revision ?? 0) !== parsed.data.expectedRevision) {
    return { ok: false, code: "REVISION_CONFLICT", revision: row?.revision ?? 0 };
  }

  const completedSteps = [...precedingSteps, parsed.data.step];
  const values = {
    account_role:
      parsed.data.step === "role" ? parsed.data.data.accountRole : row?.account_role ?? null,
    current_step: nextStep(parsed.data.step),
    completed_steps: completedSteps,
    draft_data: mergedDraft(row, parsed.data),
    last_idempotency_key: parsed.data.idempotencyKey,
    last_idempotency_fingerprint: fingerprint,
    status: "in_progress" as const,
  };

  const mutation = row
    ? supabase
        .from("onboarding_progress")
        .update({ ...values, revision: row.revision + 1 })
        .eq("profile_id", user.id)
        .eq("revision", parsed.data.expectedRevision)
    : supabase.from("onboarding_progress").insert({
        profile_id: user.id,
        flow_version: ONBOARDING_FLOW_VERSION,
        revision: 0,
        ...values,
      });
  const { data, error } = await mutation.select(progressColumns).maybeSingle();
  if (error || !data) {
    const latest = await readProgress(supabase, user.id);
    if (latest.row?.last_idempotency_key === parsed.data.idempotencyKey) {
      if (latest.row.last_idempotency_fingerprint !== fingerprint) {
        return {
          ok: false,
          code: "IDEMPOTENCY_CONFLICT",
          revision: latest.row.revision,
        };
      }
      return {
        ok: true,
        code: "IDEMPOTENT_REPLAY",
        revision: latest.row.revision,
        data: progressResult(latest.row),
      };
    }
    if (latest.row && latest.row.revision !== parsed.data.expectedRevision) {
      return { ok: false, code: "REVISION_CONFLICT", revision: latest.row.revision };
    }
    return { ok: false, code: "INTERNAL_ERROR", revision: latest.row?.revision ?? null };
  }

  const saved = data as StoredProgress;
  if (parsed.data.step === "language") {
    const cookieStore = await cookies();
    cookieStore.set(LOCALE_COOKIE_NAME, parsed.data.data.locale, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: LOCALE_COOKIE_MAX_AGE,
      path: "/",
    });
    await supabase
      .from("profiles")
      .update({ preferred_locale: parsed.data.data.locale })
      .eq("id", user.id);
  }
  return { ok: true, code: "SAVED", revision: saved.revision, data: progressResult(saved) };
}

export async function finalizeOnboardingAction(
  input: unknown,
): Promise<OnboardingActionResult<{ organizationId?: string }>> {
  if (!resumableOnboardingEnabled()) {
    return { ok: false, code: "FEATURE_DISABLED", revision: null };
  }
  const parsed = finalizeOnboardingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "INVALID_INPUT", revision: null, fieldErrors: fieldErrors(parsed.error) };
  }
  const user = await requireUser({ allowIncomplete: true });
  if (user.demo) {
    return { ok: true, code: "COMPLETED", revision: parsed.data.expectedRevision + 1, data: {} };
  }
  const supabase = await createClient();
  if (!isFeatureEnabled("ENABLE_AGRI_BUSINESSES")) {
    const progress = await readProgress(supabase, user.id);
    if (progress.error) {
      return { ok: false, code: "INTERNAL_ERROR", revision: null };
    }
    if (progress.row?.account_role === "agri_business") {
      return {
        ok: false,
        code: "FEATURE_DISABLED",
        revision: progress.row.revision,
      };
    }
  }
  const { data, error } = await supabase.rpc("finalize_onboarding", {
    expected_revision_input: parsed.data.expectedRevision,
    idempotency_key_input: parsed.data.idempotencyKey,
  });
  if (error) {
    const latest = await readProgress(supabase, user.id);
    const code = error.code === "40001" ? "REVISION_CONFLICT" : "INTERNAL_ERROR";
    return { ok: false, code, revision: latest.row?.revision ?? null };
  }
  const result = (Array.isArray(data) ? data[0] : data) as
    | { code?: string; revision?: number; organization_id?: string | null }
    | null;
  if (!result?.code || typeof result.revision !== "number") {
    return { ok: false, code: "INTERNAL_ERROR", revision: null };
  }
  const revision = result?.revision ?? parsed.data.expectedRevision + 1;
  if (result?.code === "REVISION_CONFLICT" || result?.code === "IDEMPOTENCY_CONFLICT") {
    return {
      ok: false,
      code: result.code,
      revision,
    };
  }
  return {
    ok: true,
    code: result?.code === "IDEMPOTENT_REPLAY" ? "IDEMPOTENT_REPLAY" : "COMPLETED",
    revision,
    data: { ...(result?.organization_id ? { organizationId: result.organization_id } : {}) },
  };
}
