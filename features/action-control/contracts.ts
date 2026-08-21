import { z } from "zod";

export const LIVE_ACTION_POLICY_VERSION = "live-action-policy-v1" as const;
export const LIVE_ACTION_RELEASE_KEY = "live_agent_execution" as const;

export const ACTION_EXECUTORS = [
  "consent_outreach",
  "in_app_lifecycle",
  "support_reply",
  "owned_site_publish",
  "marketplace_recommendation",
  "experiment",
  "engineering_pr",
  "canary_release",
] as const;

export const actionExecutorSchema = z.enum(ACTION_EXECUTORS);
export type ActionExecutor = z.infer<typeof actionExecutorSchema>;

export const actionTypeSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9_]{3,80}$/);

export const sha256Schema = z.string().regex(/^[0-9a-f]{64}$/);
const actorIdSchema = z.uuid();

export type BoundedJsonValue =
  | null
  | boolean
  | number
  | string
  | BoundedJsonValue[]
  | { [key: string]: BoundedJsonValue };

const jsonKeySchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[A-Za-z][A-Za-z0-9_.-]*$/)
  .refine(
    (key) => !["__proto__", "constructor", "prototype"].includes(key),
    "Unsafe object key",
  );

export const boundedJsonValueSchema: z.ZodType<BoundedJsonValue> = z.lazy(() =>
  z.union([
    z.null(),
    z.boolean(),
    z
      .number()
      .finite()
      .min(-Number.MAX_SAFE_INTEGER)
      .max(Number.MAX_SAFE_INTEGER),
    z.string().max(4_000),
    z.array(boundedJsonValueSchema).max(50),
    boundedJsonRecordSchema,
  ]),
);

export const boundedJsonRecordSchema: z.ZodType<
  Record<string, BoundedJsonValue>
> = z
  .preprocess((value, context) => {
    if (
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value) &&
      Object.keys(value).some((key) =>
        ["__proto__", "constructor", "prototype"].includes(key),
      )
    ) {
      context.addIssue({ code: "custom", message: "Unsafe object key" });
      return z.NEVER;
    }
    if (
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value) &&
      Object.getPrototypeOf(value) !== Object.prototype &&
      Object.getPrototypeOf(value) !== null
    ) {
      context.addIssue({ code: "custom", message: "JSON object must be plain" });
      return z.NEVER;
    }
    return value;
  }, z.record(jsonKeySchema, boundedJsonValueSchema))
  .superRefine((value, context) => {
    if (Object.keys(value).length > 50) {
      context.addIssue({
        code: "custom",
        message: "JSON objects may contain at most 50 keys",
      });
    }
  });

export const consentedRecipientScopeSchema = z
  .object({
    scopeType: z.literal("consented_recipient"),
    consentRecordId: z.uuid(),
    recipientHash: sha256Schema,
  })
  .strict();

export const memberLifecycleScopeSchema = z
  .object({
    scopeType: z.literal("member_lifecycle"),
    memberId: z.uuid(),
  })
  .strict();

export const supportCaseScopeSchema = z
  .object({
    scopeType: z.literal("support_case"),
    caseId: z.uuid(),
    replyProposalId: z.uuid(),
  })
  .strict();

export const ownedSiteDraftScopeSchema = z
  .object({
    scopeType: z.literal("owned_site_draft"),
    draftId: z.uuid(),
    slug: z
      .string()
      .min(3)
      .max(120)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  })
  .strict();

export const marketplaceMemberScopeSchema = z
  .object({
    scopeType: z.literal("marketplace_member"),
    memberId: z.uuid(),
    listingIds: z.array(z.uuid()).min(1).max(10),
  })
  .strict();

export const experimentCohortScopeSchema = z
  .object({
    scopeType: z.literal("experiment_cohort"),
    experimentId: z.uuid(),
    cohortId: z.uuid(),
  })
  .strict();

export const repositoryBranchScopeSchema = z
  .object({
    scopeType: z.literal("repository_branch"),
    repository: z
      .string()
      .min(3)
      .max(180)
      .regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/),
    branch: z
      .string()
      .min(3)
      .max(180)
      .regex(/^[A-Za-z0-9][A-Za-z0-9._/-]*$/),
  })
  .strict();

export const canaryArtifactScopeSchema = z
  .object({
    scopeType: z.literal("canary_artifact"),
    artifactSha256: sha256Schema,
    trafficPercent: z.number().int().min(1).max(100),
  })
  .strict();

export const actionTargetScopeSchema = z.discriminatedUnion("scopeType", [
  consentedRecipientScopeSchema,
  memberLifecycleScopeSchema,
  supportCaseScopeSchema,
  ownedSiteDraftScopeSchema,
  marketplaceMemberScopeSchema,
  experimentCohortScopeSchema,
  repositoryBranchScopeSchema,
  canaryArtifactScopeSchema,
]);

export type ActionTargetScope = z.infer<typeof actionTargetScopeSchema>;

const actionWindowShape = {
  notBefore: z.iso.datetime({ offset: true }),
  expiresAt: z.iso.datetime({ offset: true }),
} as const;

function validateActionWindow(
  value: { notBefore: string; expiresAt: string },
  context: z.RefinementCtx,
) {
  const notBefore = Date.parse(value.notBefore);
  const expiresAt = Date.parse(value.expiresAt);
  if (expiresAt <= notBefore) {
    context.addIssue({
      code: "custom",
      path: ["expiresAt"],
      message: "Authorization must expire after it becomes valid",
    });
  }
  if (expiresAt - notBefore > 7 * 24 * 60 * 60 * 1_000) {
    context.addIssue({
      code: "custom",
      path: ["expiresAt"],
      message: "Authorization lifetime may not exceed 7 days",
    });
  }
}

const actionIntentObjectSchema = z
  .object({
    authorizationId: z.uuid(),
    proposalId: z.uuid(),
    proposalRevision: z.number().int().nonnegative().max(1_000_000),
    proposerActorId: actorIdSchema,
    executor: actionExecutorSchema,
    actionType: actionTypeSchema,
    targetScope: actionTargetScopeSchema,
    payloadSha256: sha256Schema,
    maxActions: z.number().int().min(1).max(10_000),
    maxSpendPaise: z.number().int().min(0).max(1_000_000_000),
    canaryStage: z.number().int().min(0).max(20),
    ...actionWindowShape,
    idempotencyKey: z.uuid(),
  })
  .strict();

export const actionIntentSchema = actionIntentObjectSchema.superRefine(
  validateActionWindow,
);

export type ActionIntent = z.infer<typeof actionIntentSchema>;

export const actionRiskSchema = z.enum(["low", "medium", "high", "critical"]);
export type ActionRisk = z.infer<typeof actionRiskSchema>;

export const actionExecutionModeSchema = z.enum(["shadow", "live"]);
export type ActionExecutionMode = z.infer<typeof actionExecutionModeSchema>;

export const actionAuthorizationStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
  "revoked",
  "expired",
  "consumed",
]);

export const actionAuthorizationSchema = actionIntentObjectSchema
  .extend({
    approvalTier: z.number().int().min(0).max(5),
    requiredApprovals: z.number().int().min(0).max(2),
    riskLevel: actionRiskSchema,
    executionMode: actionExecutionModeSchema,
    status: actionAuthorizationStatusSchema,
    policyVersion: z.literal(LIVE_ACTION_POLICY_VERSION),
  })
  .strict()
  .superRefine(validateActionWindow);

export type ActionAuthorization = z.infer<typeof actionAuthorizationSchema>;

export const actionApprovalSchema = z
  .object({
    authorizationId: z.uuid(),
    proposalRevision: z.number().int().nonnegative().max(1_000_000),
    ordinal: z.number().int().min(1).max(2),
    approverActorId: actorIdSchema,
    decision: z.enum(["approved", "rejected"]),
    reasonSha256: sha256Schema,
    decidedAt: z.iso.datetime({ offset: true }),
  })
  .strict();

export type ActionApproval = z.infer<typeof actionApprovalSchema>;

export const actionAttemptStateSchema = z.enum([
  "prepared",
  "dispatched",
  "verified",
  "unknown",
  "failed",
  "compensated",
]);

export type ActionAttemptState = z.infer<typeof actionAttemptStateSchema>;

export const actionExecutionReceiptSchema = z
  .object({
    attemptId: z.uuid(),
    authorizationId: z.uuid(),
    executor: actionExecutorSchema,
    actionType: actionTypeSchema,
    payloadSha256: sha256Schema,
    state: actionAttemptStateSchema,
    executorActorId: actorIdSchema,
    providerReceiptSha256: sha256Schema.nullable(),
    verifierActorId: actorIdSchema.nullable(),
    verificationEvidenceSha256: sha256Schema.nullable(),
    failureCode: z
      .string()
      .regex(/^[A-Z][A-Z0-9_]{2,80}$/)
      .nullable(),
    pauseRequired: z.boolean(),
    updatedAt: z.iso.datetime({ offset: true }),
  })
  .strict();

export type ActionExecutionReceipt = z.infer<
  typeof actionExecutionReceiptSchema
>;

export const liveActionWorkflowInputSchema = z
  .object({
    authorization: actionAuthorizationSchema,
    payload: boundedJsonRecordSchema,
  })
  .strict();

export type LiveActionWorkflowInput = z.infer<
  typeof liveActionWorkflowInputSchema
>;

export const coordinatorStateSchema = z
  .object({
    authorizationId: z.uuid().nullable(),
    workflowId: z.string().min(1).max(200).nullable(),
    executor: actionExecutorSchema.nullable(),
    payloadSha256: sha256Schema.nullable(),
    status: z.enum([
      "idle",
      "shadow_validated",
      "approval_pending",
      "authorizing",
      "dispatch_blocked",
      "verification_pending",
      "verified",
      "failed",
      "paused",
    ]),
    lastFailureCode: z
      .string()
      .regex(/^[A-Z][A-Z0-9_]{2,80}$/)
      .nullable(),
    updatedAt: z.iso.datetime({ offset: true }),
  })
  .strict();

export type LiveActionCoordinatorState = z.infer<
  typeof coordinatorStateSchema
>;
