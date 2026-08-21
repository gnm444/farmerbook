import {
  actionIntentSchema,
  actionTargetScopeSchema,
  LIVE_ACTION_POLICY_VERSION,
  type ActionAuthorization,
  type ActionExecutionMode,
  type ActionExecutor,
  type ActionIntent,
  type ActionRisk,
} from "./contracts";
import { assertExecutorCapability } from "./executors";

type ActionPolicyRule = {
  executor: ActionExecutor;
  actionType: string;
  scopeType: ReturnType<typeof actionTargetScopeSchema.parse>["scopeType"];
  riskLevel: ActionRisk;
  approvalTier: 0 | 1 | 2 | 3 | 4 | 5;
  requiredApprovals: 0 | 1 | 2;
  maxActions: number;
  maxSpendPaise: number;
  maximumCanaryStage: number;
  liveEligible: boolean;
  reversible: boolean;
};

export const ACTION_POLICY_RULES = {
  "consent_outreach:consented_email_dispatch": {
    executor: "consent_outreach",
    actionType: "consented_email_dispatch",
    scopeType: "consented_recipient",
    riskLevel: "high",
    approvalTier: 3,
    requiredApprovals: 1,
    maxActions: 1,
    maxSpendPaise: 0,
    maximumCanaryStage: 1,
    liveEligible: true,
    reversible: false,
  },
  "in_app_lifecycle:in_app_lifecycle_message": {
    executor: "in_app_lifecycle",
    actionType: "in_app_lifecycle_message",
    scopeType: "member_lifecycle",
    riskLevel: "low",
    approvalTier: 2,
    requiredApprovals: 0,
    maxActions: 1,
    maxSpendPaise: 0,
    maximumCanaryStage: 1,
    liveEligible: true,
    reversible: true,
  },
  "support_reply:approved_support_reply_send": {
    executor: "support_reply",
    actionType: "approved_support_reply_send",
    scopeType: "support_case",
    riskLevel: "medium",
    approvalTier: 3,
    requiredApprovals: 1,
    maxActions: 1,
    maxSpendPaise: 0,
    maximumCanaryStage: 1,
    liveEligible: true,
    reversible: false,
  },
  "owned_site_publish:owned_site_article_publish": {
    executor: "owned_site_publish",
    actionType: "owned_site_article_publish",
    scopeType: "owned_site_draft",
    riskLevel: "high",
    approvalTier: 4,
    requiredApprovals: 2,
    maxActions: 1,
    maxSpendPaise: 0,
    maximumCanaryStage: 1,
    liveEligible: true,
    reversible: true,
  },
  "marketplace_recommendation:marketplace_recommendation_create": {
    executor: "marketplace_recommendation",
    actionType: "marketplace_recommendation_create",
    scopeType: "marketplace_member",
    riskLevel: "medium",
    approvalTier: 2,
    requiredApprovals: 0,
    maxActions: 1,
    maxSpendPaise: 0,
    maximumCanaryStage: 0,
    liveEligible: false,
    reversible: true,
  },
  "experiment:experiment_assignment_create": {
    executor: "experiment",
    actionType: "experiment_assignment_create",
    scopeType: "experiment_cohort",
    riskLevel: "high",
    approvalTier: 4,
    requiredApprovals: 2,
    maxActions: 100,
    maxSpendPaise: 0,
    maximumCanaryStage: 0,
    liveEligible: false,
    reversible: true,
  },
  "engineering_pr:engineering_pull_request_create": {
    executor: "engineering_pr",
    actionType: "engineering_pull_request_create",
    scopeType: "repository_branch",
    riskLevel: "medium",
    approvalTier: 3,
    requiredApprovals: 1,
    maxActions: 1,
    maxSpendPaise: 0,
    maximumCanaryStage: 0,
    liveEligible: false,
    reversible: true,
  },
  "canary_release:canary_release_deploy": {
    executor: "canary_release",
    actionType: "canary_release_deploy",
    scopeType: "canary_artifact",
    riskLevel: "critical",
    approvalTier: 4,
    requiredApprovals: 2,
    maxActions: 1,
    maxSpendPaise: 0,
    maximumCanaryStage: 0,
    liveEligible: false,
    reversible: true,
  },
} as const satisfies Record<string, ActionPolicyRule>;

export type DerivedActionPolicy = (typeof ACTION_POLICY_RULES)[keyof typeof ACTION_POLICY_RULES];

export function deriveActionPolicy(
  executor: ActionExecutor,
  actionType: string,
): DerivedActionPolicy {
  assertExecutorCapability(executor, actionType);
  const key = `${executor}:${actionType}` as keyof typeof ACTION_POLICY_RULES;
  const rule = ACTION_POLICY_RULES[key];
  if (!rule) throw new Error("ACTION_POLICY_PROHIBITED");
  return rule;
}

export function deriveActionAuthorization(
  rawIntent: unknown,
  options: { executionMode?: ActionExecutionMode } = {},
): ActionAuthorization {
  const intent = actionIntentSchema.parse(rawIntent);
  const rule = deriveActionPolicy(intent.executor, intent.actionType);
  const executionMode = options.executionMode ?? "shadow";
  if (intent.targetScope.scopeType !== rule.scopeType) {
    throw new Error("ACTION_TARGET_SCOPE_DENIED");
  }
  if (intent.maxActions > rule.maxActions) {
    throw new Error("ACTION_COUNT_BUDGET_DENIED");
  }
  if (intent.maxSpendPaise > rule.maxSpendPaise) {
    throw new Error("ACTION_SPEND_BUDGET_DENIED");
  }
  if (intent.canaryStage > rule.maximumCanaryStage) {
    throw new Error("ACTION_CANARY_STAGE_DENIED");
  }
  if (executionMode === "live" && !rule.liveEligible) {
    throw new Error("ACTION_LIVE_EXECUTION_PROHIBITED");
  }
  return {
    ...intent,
    approvalTier: rule.approvalTier,
    requiredApprovals: rule.requiredApprovals,
    riskLevel: rule.riskLevel,
    executionMode,
    status: rule.requiredApprovals === 0 ? "approved" : "pending",
    policyVersion: LIVE_ACTION_POLICY_VERSION,
  };
}

export function assertAuthorizationMatchesPolicy(
  authorization: ActionAuthorization,
) {
  const rule = deriveActionPolicy(
    authorization.executor,
    authorization.actionType,
  );
  if (
    authorization.policyVersion !== LIVE_ACTION_POLICY_VERSION ||
    authorization.approvalTier !== rule.approvalTier ||
    authorization.requiredApprovals !== rule.requiredApprovals ||
    authorization.riskLevel !== rule.riskLevel ||
    authorization.targetScope.scopeType !== rule.scopeType ||
    authorization.maxActions > rule.maxActions ||
    authorization.maxSpendPaise > rule.maxSpendPaise ||
    authorization.canaryStage > rule.maximumCanaryStage ||
    (authorization.executionMode === "live" && !rule.liveEligible)
  ) {
    throw new Error("AUTHORIZATION_POLICY_MISMATCH");
  }
  return rule;
}

export function toActionIntent(authorization: ActionAuthorization): ActionIntent {
  return actionIntentSchema.parse({
    authorizationId: authorization.authorizationId,
    proposalId: authorization.proposalId,
    proposalRevision: authorization.proposalRevision,
    proposerActorId: authorization.proposerActorId,
    executor: authorization.executor,
    actionType: authorization.actionType,
    targetScope: authorization.targetScope,
    payloadSha256: authorization.payloadSha256,
    maxActions: authorization.maxActions,
    maxSpendPaise: authorization.maxSpendPaise,
    canaryStage: authorization.canaryStage,
    notBefore: authorization.notBefore,
    expiresAt: authorization.expiresAt,
    idempotencyKey: authorization.idempotencyKey,
  });
}
