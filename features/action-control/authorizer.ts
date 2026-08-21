import { z } from "zod";
import {
  actionApprovalSchema,
  actionAuthorizationSchema,
  boundedJsonRecordSchema,
  LIVE_ACTION_RELEASE_KEY,
  type ActionApproval,
  type ActionAuthorization,
} from "./contracts";
import {
  executorControlSchema,
  executorHasCapability,
  runtimeReleaseControlsSchema,
  type RuntimeReleaseControls,
} from "./executors";
import { actionPayloadMatchesHash } from "./hashing";
import { assertAuthorizationMatchesPolicy } from "./policy";

export const actionBudgetUsageSchema = z
  .object({
    dailyActions: z.number().int().nonnegative().max(10_000_000),
    monthlyActions: z.number().int().nonnegative().max(100_000_000),
    dailySpendPaise: z.number().int().nonnegative().max(10_000_000_000),
  })
  .strict();

export type ActionBudgetUsage = z.infer<typeof actionBudgetUsageSchema>;

export const dispatchAuthorizationInputSchema = z
  .object({
    authorization: actionAuthorizationSchema,
    payload: boundedJsonRecordSchema,
    approvals: z.array(actionApprovalSchema).max(2),
    verifierActorId: z.uuid(),
    usage: actionBudgetUsageSchema,
  })
  .strict();

export type DispatchAuthorizationInput = z.infer<
  typeof dispatchAuthorizationInputSchema
>;

export type DispatchAuthorizationCode =
  | "AUTHORIZED"
  | "ACTION_NOT_YET_VALID"
  | "ACTION_AUTHORIZATION_EXPIRED"
  | "ACTION_AUTHORIZATION_INACTIVE"
  | "ACTION_PAYLOAD_MISMATCH"
  | "ACTION_POLICY_MISMATCH"
  | "ACTION_APPROVALS_INSUFFICIENT"
  | "ACTION_APPROVER_CONFLICT"
  | "ACTION_VERIFIER_CONFLICT"
  | "ACTION_RELEASE_DISABLED"
  | "EXECUTOR_DISABLED"
  | "EXECUTOR_CAPABILITY_DENIED"
  | "ACTION_DAILY_BUDGET_EXCEEDED"
  | "ACTION_MONTHLY_BUDGET_EXCEEDED"
  | "ACTION_SPEND_BUDGET_EXCEEDED"
  | "ACTION_CANARY_STAGE_DENIED"
  | "SHADOW_MODE";

export type DispatchAuthorizationDecision =
  | {
      authorized: true;
      code: "AUTHORIZED";
      authorization: ActionAuthorization;
      executorControl: z.infer<typeof executorControlSchema>;
    }
  | {
      authorized: false;
      code: Exclude<DispatchAuthorizationCode, "AUTHORIZED">;
    };

function deny(
  code: Exclude<DispatchAuthorizationCode, "AUTHORIZED">,
): DispatchAuthorizationDecision {
  return { authorized: false, code };
}

function approvalsSatisfyAuthorization(
  authorization: ActionAuthorization,
  approvals: ActionApproval[],
  verifierActorId: string,
): DispatchAuthorizationDecision | null {
  if (approvals.length !== authorization.requiredApprovals) {
    return deny("ACTION_APPROVALS_INSUFFICIENT");
  }
  const approved = approvals.filter(
    (approval) =>
      approval.authorizationId === authorization.authorizationId &&
      approval.proposalRevision === authorization.proposalRevision &&
      approval.decision === "approved",
  );
  const approverIds = new Set(approved.map((approval) => approval.approverActorId));
  const ordinals = new Set(approved.map((approval) => approval.ordinal));
  if (
    approved.length !== authorization.requiredApprovals ||
    approverIds.size !== authorization.requiredApprovals ||
    ordinals.size !== authorization.requiredApprovals ||
    approved.some(
      (approval) =>
        approval.ordinal < 1 ||
        approval.ordinal > authorization.requiredApprovals,
    )
  ) {
    return deny("ACTION_APPROVALS_INSUFFICIENT");
  }
  if (approverIds.has(authorization.proposerActorId)) {
    return deny("ACTION_APPROVER_CONFLICT");
  }
  if (
    verifierActorId === authorization.proposerActorId ||
    approverIds.has(verifierActorId)
  ) {
    return deny("ACTION_VERIFIER_CONFLICT");
  }
  return null;
}

export async function authorizeActionDispatch(
  rawInput: unknown,
  rawControls: RuntimeReleaseControls,
  options: { now?: Date } = {},
): Promise<DispatchAuthorizationDecision> {
  const input = dispatchAuthorizationInputSchema.parse(rawInput);
  const controls = runtimeReleaseControlsSchema.parse(rawControls);
  const now = options.now ?? new Date();
  try {
    assertAuthorizationMatchesPolicy(input.authorization);
  } catch {
    return deny("ACTION_POLICY_MISMATCH");
  }
  if (input.authorization.executionMode !== "live") {
    return deny("SHADOW_MODE");
  }
  if (input.authorization.status !== "approved") {
    return deny("ACTION_AUTHORIZATION_INACTIVE");
  }
  if (now.getTime() < Date.parse(input.authorization.notBefore)) {
    return deny("ACTION_NOT_YET_VALID");
  }
  if (now.getTime() >= Date.parse(input.authorization.expiresAt)) {
    return deny("ACTION_AUTHORIZATION_EXPIRED");
  }
  if (
    !(await actionPayloadMatchesHash(
      input.payload,
      input.authorization.payloadSha256,
    ))
  ) {
    return deny("ACTION_PAYLOAD_MISMATCH");
  }
  if (
    !controls.globalEnabled ||
    controls.releaseKey !== LIVE_ACTION_RELEASE_KEY ||
    controls.policyVersion !== input.authorization.policyVersion
  ) {
    return deny("ACTION_RELEASE_DISABLED");
  }
  const executorControl = controls.executors[input.authorization.executor];
  if (!executorControl?.enabled) return deny("EXECUTOR_DISABLED");
  if (
    !executorHasCapability(
      input.authorization.executor,
      input.authorization.actionType,
    ) ||
    !executorControl.allowedActionTypes.includes(input.authorization.actionType)
  ) {
    return deny("EXECUTOR_CAPABILITY_DENIED");
  }
  if (
    input.authorization.canaryStage < 1 ||
    input.authorization.canaryStage > executorControl.canaryStage
  ) {
    return deny("ACTION_CANARY_STAGE_DENIED");
  }
  const approvalFailure = approvalsSatisfyAuthorization(
    input.authorization,
    input.approvals,
    input.verifierActorId,
  );
  if (approvalFailure) return approvalFailure;
  if (
    input.approvals.some((approval) => {
      const decidedAt = Date.parse(approval.decidedAt);
      return (
        decidedAt < Date.parse(input.authorization.notBefore) ||
        decidedAt > now.getTime() ||
        decidedAt >= Date.parse(input.authorization.expiresAt)
      );
    })
  ) {
    return deny("ACTION_APPROVALS_INSUFFICIENT");
  }
  if (
    input.usage.dailyActions + input.authorization.maxActions >
    executorControl.dailyActionCap
  ) {
    return deny("ACTION_DAILY_BUDGET_EXCEEDED");
  }
  if (
    input.usage.monthlyActions + input.authorization.maxActions >
    executorControl.monthlyActionCap
  ) {
    return deny("ACTION_MONTHLY_BUDGET_EXCEEDED");
  }
  if (
    input.usage.dailySpendPaise + input.authorization.maxSpendPaise >
    executorControl.dailySpendCapPaise
  ) {
    return deny("ACTION_SPEND_BUDGET_EXCEEDED");
  }
  return {
    authorized: true,
    code: "AUTHORIZED",
    authorization: input.authorization,
    executorControl,
  };
}
