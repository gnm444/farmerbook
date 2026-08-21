import { z } from "zod";
import { requireAdmin } from "@/features/auth/require-admin";
import { getCloudflareBindings } from "@/lib/cloudflare-bindings";
import { isDemoMode, isSupabaseConfigured } from "@/lib/env";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { createClient } from "@/lib/supabase/server";
import { actionExecutorSchema, actionRiskSchema } from "./contracts";
import { LIVE_ACTION_EXTERNAL_EXECUTORS_READY } from "./executors";

const authorizationStateSchema = z.enum([
  "pending_approval",
  "authorized",
  "revoked",
  "expired",
  "exhausted",
  "paused",
  "completed",
]);

const attemptStateSchema = z.enum([
  "prepared",
  "dispatched",
  "verified",
  "unknown",
  "failed",
  "compensated",
]);

const executorControlRowSchema = z.object({
  release_enabled: z.boolean(),
  executor: actionExecutorSchema,
  paused: z.boolean(),
  shadow_only: z.boolean(),
  daily_action_limit: z.coerce.number().int().nonnegative(),
  monthly_action_limit: z.coerce.number().int().nonnegative(),
  daily_spend_limit_paise: z.coerce.number().int().nonnegative(),
  monthly_spend_limit_paise: z.coerce.number().int().nonnegative(),
  canary_stage: z.coerce.number().int().min(0).max(20),
  revision: z.coerce.number().int().nonnegative(),
  pause_reason_code: z.string().min(2).max(80),
  updated_at: z.string(),
});

const authorizationRowSchema = z.object({
  authorization_id: z.uuid(),
  proposal_id: z.uuid(),
  proposal_revision: z.coerce.number().int().nonnegative(),
  executor: actionExecutorSchema,
  action_type: z.string().min(3).max(80),
  target_scope: z.record(z.string(), z.unknown()),
  target_scope_sha256: z.string().regex(/^[0-9a-f]{64}$/),
  payload_sha256: z.string().regex(/^[0-9a-f]{64}$/),
  risk_level: actionRiskSchema,
  approval_tier: z.coerce.number().int().min(0).max(5),
  state: authorizationStateSchema,
  revision: z.coerce.number().int().nonnegative(),
  approval_count: z.coerce.number().int().nonnegative(),
  required_approvals: z.coerce.number().int().min(0).max(2),
  max_actions: z.coerce.number().int().positive(),
  max_spend_paise: z.coerce.number().int().nonnegative(),
  canary_stage: z.coerce.number().int().min(0).max(20),
  not_before: z.string(),
  expires_at: z.string(),
  latest_attempt_state: attemptStateSchema.nullable(),
  latest_receipt_sha256: z.string().regex(/^[0-9a-f]{64}$/).nullable(),
  latest_verifier_identity: z.string().nullable(),
  created_at: z.string(),
});

export type LiveAgentExecutorControl = {
  releaseEnabled: boolean;
  executor: z.infer<typeof actionExecutorSchema>;
  paused: boolean;
  shadowOnly: boolean;
  dailyActionLimit: number;
  monthlyActionLimit: number;
  dailySpendLimitPaise: number;
  monthlySpendLimitPaise: number;
  canaryStage: number;
  revision: number;
  pauseReasonCode: string;
  updatedAt: string;
};

export type LiveActionAuthorizationSummary = {
  authorizationId: string;
  proposalId: string;
  proposalRevision: number;
  executor: z.infer<typeof actionExecutorSchema>;
  actionType: string;
  targetScope: Record<string, unknown>;
  targetScopeSha256: string;
  payloadSha256: string;
  riskLevel: z.infer<typeof actionRiskSchema>;
  approvalTier: number;
  state: z.infer<typeof authorizationStateSchema>;
  revision: number;
  approvalCount: number;
  requiredApprovals: number;
  maxActions: number;
  maxSpendPaise: number;
  canaryStage: number;
  notBefore: string;
  expiresAt: string;
  latestAttemptState: z.infer<typeof attemptStateSchema> | null;
  latestReceiptSha256: string | null;
  latestVerifierIdentity: string | null;
  createdAt: string;
};

export type LiveActionConsoleData = {
  available: boolean;
  applicationEnabled: boolean;
  releaseEnabled: boolean;
  runtimeBound: boolean;
  canaryReady: boolean;
  controls: LiveAgentExecutorControl[];
  authorizations: LiveActionAuthorizationSummary[];
};

function unavailable(applicationEnabled = false): LiveActionConsoleData {
  return {
    available: false,
    applicationEnabled,
    releaseEnabled: false,
    runtimeBound: false,
    canaryReady: false,
    controls: [],
    authorizations: [],
  };
}

export async function loadLiveActionConsole(): Promise<LiveActionConsoleData> {
  await requireAdmin();
  const applicationEnabled = isFeatureEnabled("ENABLE_LIVE_AGENT_EXECUTION");
  if (!isSupabaseConfigured() || isDemoMode()) return unavailable(applicationEnabled);

  const bindings = await getCloudflareBindings();
  const runtimeBound = Boolean(
    bindings &&
      "LIVE_ACTION_COORDINATOR_AGENT" in bindings &&
      "LIVE_ACTION_EXECUTION_WORKFLOW" in bindings,
  );
  const supabase = await createClient();
  const [controlsResult, authorizationsResult] = await Promise.all([
    supabase.rpc("live_agent_executor_controls"),
    supabase.rpc("live_agent_action_dashboard", { limit_input: 100 }),
  ]);
  if (controlsResult.error || authorizationsResult.error) {
    return unavailable(applicationEnabled);
  }
  const controlRows = z.array(executorControlRowSchema).parse(
    controlsResult.data ?? [],
  );
  const authorizationRows = z.array(authorizationRowSchema).parse(
    authorizationsResult.data ?? [],
  );
  const controls = controlRows.map((row): LiveAgentExecutorControl => ({
    releaseEnabled: row.release_enabled,
    executor: row.executor,
    paused: row.paused,
    shadowOnly: row.shadow_only,
    dailyActionLimit: row.daily_action_limit,
    monthlyActionLimit: row.monthly_action_limit,
    dailySpendLimitPaise: row.daily_spend_limit_paise,
    monthlySpendLimitPaise: row.monthly_spend_limit_paise,
    canaryStage: row.canary_stage,
    revision: row.revision,
    pauseReasonCode: row.pause_reason_code,
    updatedAt: row.updated_at,
  }));
  return {
    available: controlRows.length > 0,
    applicationEnabled,
    releaseEnabled:
      controlRows.length > 0 && controlRows.every((row) => row.release_enabled),
    runtimeBound,
    canaryReady: LIVE_ACTION_EXTERNAL_EXECUTORS_READY,
    controls,
    authorizations: authorizationRows.map((row) => ({
      authorizationId: row.authorization_id,
      proposalId: row.proposal_id,
      proposalRevision: row.proposal_revision,
      executor: row.executor,
      actionType: row.action_type,
      targetScope: row.target_scope,
      targetScopeSha256: row.target_scope_sha256,
      payloadSha256: row.payload_sha256,
      riskLevel: row.risk_level,
      approvalTier: row.approval_tier,
      state: row.state,
      revision: row.revision,
      approvalCount: row.approval_count,
      requiredApprovals: row.required_approvals,
      maxActions: row.max_actions,
      maxSpendPaise: row.max_spend_paise,
      canaryStage: row.canary_stage,
      notBefore: row.not_before,
      expiresAt: row.expires_at,
      latestAttemptState: row.latest_attempt_state,
      latestReceiptSha256: row.latest_receipt_sha256,
      latestVerifierIdentity: row.latest_verifier_identity,
      createdAt: row.created_at,
    })),
  };
}
