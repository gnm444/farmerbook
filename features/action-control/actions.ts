"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/features/auth/require-admin";
import { isDemoMode, isSupabaseConfigured } from "@/lib/env";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { createClient } from "@/lib/supabase/server";
import { actionExecutorSchema } from "./contracts";
import { LIVE_ACTION_EXTERNAL_EXECUTORS_READY } from "./executors";

const executorControlInputSchema = z.object({
  executor: actionExecutorSchema,
  paused: z.boolean(),
  dailyActionLimit: z.number().int().min(0).max(10_000),
  monthlyActionLimit: z.number().int().min(0).max(300_000),
  dailySpendLimitPaise: z.number().int().min(0).max(1_000_000_000),
  monthlySpendLimitPaise: z.number().int().min(0).max(10_000_000_000),
  canaryStage: z.number().int().min(0).max(20),
  reason: z.string().trim().min(5).max(1_000),
  idempotencyKey: z.uuid(),
});

const authorizationReviewInputSchema = z.object({
  authorizationId: z.uuid(),
  expectedRevision: z.number().int().nonnegative(),
  decision: z.enum(["approved", "rejected"]),
  reason: z.string().trim().min(5).max(1_000),
  idempotencyKey: z.uuid(),
});

const authorizationRevocationInputSchema = z.object({
  authorizationId: z.uuid(),
  expectedRevision: z.number().int().nonnegative(),
  reason: z.string().trim().min(5).max(1_000),
  idempotencyKey: z.uuid(),
});

function failure(message: string) {
  return { ok: false as const, message };
}

async function configuredAdmin() {
  const administrator = await requireAdmin();
  if (administrator.demo || isDemoMode() || !isSupabaseConfigured()) {
    return null;
  }
  return administrator;
}

export async function setLiveAgentExecutorPauseAction(rawInput: unknown) {
  const parsed = executorControlInputSchema.safeParse(rawInput);
  if (!parsed.success) return failure("Check the executor limits and reason.");
  if (!(await configuredAdmin())) return failure("The live-action control plane is unavailable.");
  if (!parsed.data.paused && !isFeatureEnabled("ENABLE_LIVE_AGENT_EXECUTION")) {
    return failure("The application live-execution gate is off; the executor cannot be resumed.");
  }
  if (!parsed.data.paused && !LIVE_ACTION_EXTERNAL_EXECUTORS_READY) {
    return failure("Phase 1 executor connectors and independent verification are not implemented; the executor must remain paused.");
  }
  const supabase = await createClient();
  const result = await supabase.rpc("set_live_agent_executor_pause", {
    executor_input: parsed.data.executor,
    paused_input: parsed.data.paused,
    daily_action_limit_input: parsed.data.dailyActionLimit,
    monthly_action_limit_input: parsed.data.monthlyActionLimit,
    daily_spend_limit_paise_input: parsed.data.dailySpendLimitPaise,
    monthly_spend_limit_paise_input: parsed.data.monthlySpendLimitPaise,
    canary_stage_input: parsed.data.canaryStage,
    reason_input: parsed.data.reason,
    idempotency_key_input: parsed.data.idempotencyKey,
  });
  if (result.error) return failure("The executor control change was not recorded.");
  revalidatePath("/admin/agents/actions");
  return {
    ok: true as const,
    message: parsed.data.paused
      ? "Executor paused. Existing external outcomes still require reconciliation."
      : "Executor resumed within the recorded caps. This did not execute an action.",
  };
}

export async function reviewLiveActionAuthorizationAction(rawInput: unknown) {
  if (!isFeatureEnabled("ENABLE_LIVE_AGENT_EXECUTION")) {
    return failure("The application live-execution gate is off.");
  }
  const parsed = authorizationReviewInputSchema.safeParse(rawInput);
  if (!parsed.success) return failure("Check the authorization decision and reason.");
  if (!(await configuredAdmin())) return failure("The live-action control plane is unavailable.");
  const supabase = await createClient();
  const result = await supabase.rpc("review_live_agent_action_authorization", {
    authorization_id_input: parsed.data.authorizationId,
    expected_revision_input: parsed.data.expectedRevision,
    decision_input: parsed.data.decision,
    reason_input: parsed.data.reason,
    idempotency_key_input: parsed.data.idempotencyKey,
  });
  if (result.error) return failure("The authorization review was not recorded. Refresh before retrying.");
  revalidatePath("/admin/agents/actions");
  return {
    ok: true as const,
    message: parsed.data.decision === "approved"
      ? "Approval recorded. Dispatch still requires every independent gate, quota and expiry check."
      : "Authorization rejected. No action was executed.",
  };
}

export async function revokeLiveActionAuthorizationAction(rawInput: unknown) {
  const parsed = authorizationRevocationInputSchema.safeParse(rawInput);
  if (!parsed.success) return failure("Check the authorization and revocation reason.");
  if (!(await configuredAdmin())) return failure("The live-action control plane is unavailable.");
  const supabase = await createClient();
  const result = await supabase.rpc("revoke_live_agent_action_authorization", {
    authorization_id_input: parsed.data.authorizationId,
    expected_revision_input: parsed.data.expectedRevision,
    reason_input: parsed.data.reason,
    idempotency_key_input: parsed.data.idempotencyKey,
  });
  if (result.error) return failure("The authorization was not revoked. Refresh before retrying.");
  revalidatePath("/admin/agents/actions");
  return {
    ok: true as const,
    message: "Authorization revoked. Any dispatched or unknown attempt still requires reconciliation.",
  };
}
