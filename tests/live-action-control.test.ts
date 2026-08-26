import { describe, expect, it, vi } from "vitest";
import {
  actionAuthorizationSchema,
  actionExecutionReceiptSchema,
  actionIntentSchema,
  boundedJsonRecordSchema,
  LIVE_ACTION_POLICY_VERSION,
  LIVE_ACTION_RELEASE_KEY,
  type ActionAuthorization,
} from "@/features/action-control/contracts";
import {
  authorizeActionDispatch,
  type DispatchAuthorizationInput,
} from "@/features/action-control/authorizer";
import {
  DEFAULT_EXECUTOR_CONTROLS,
  ExecutorRegistry,
  defaultRuntimeReleaseControls,
  type RuntimeReleaseControls,
} from "@/features/action-control/executors";
import {
  actionPayloadMatchesHash,
  canonicalizeActionPayload,
  hashActionPayload,
} from "@/features/action-control/hashing";
import {
  assertAuthorizationMatchesPolicy,
  deriveActionAuthorization,
  deriveActionPolicy,
} from "@/features/action-control/policy";
import {
  createPreparedReceipt,
  mayRetryDispatch,
  transitionExecutionReceipt,
} from "@/features/action-control/verifier";

const IDS = {
  authorization: "00000000-0000-4000-8000-000000000101",
  proposal: "00000000-0000-4000-8000-000000000102",
  proposer: "00000000-0000-4000-8000-000000000103",
  member: "00000000-0000-4000-8000-000000000104",
  verifier: "00000000-0000-4000-8000-000000000105",
  approverOne: "00000000-0000-4000-8000-000000000106",
  approverTwo: "00000000-0000-4000-8000-000000000107",
  consent: "00000000-0000-4000-8000-000000000108",
  draft: "00000000-0000-4000-8000-000000000109",
  attempt: "00000000-0000-4000-8000-000000000110",
  executor: "00000000-0000-4000-8000-000000000111",
} as const;

const NOW = new Date("2026-08-20T12:00:00.000Z");
const NOT_BEFORE = "2026-08-20T00:00:00.000Z";
const EXPIRES_AT = "2026-08-21T00:00:00.000Z";
const payload = {
  templateId: "welcome-v1",
  variables: { locale: "te-IN", progress: 0.5 },
};

async function lifecycleIntent() {
  return actionIntentSchema.parse({
    authorizationId: IDS.authorization,
    proposalId: IDS.proposal,
    proposalRevision: 3,
    proposerActorId: IDS.proposer,
    executor: "in_app_lifecycle",
    actionType: "in_app_lifecycle_message",
    targetScope: { scopeType: "member_lifecycle", memberId: IDS.member },
    payloadSha256: await hashActionPayload(payload),
    maxActions: 1,
    maxSpendPaise: 0,
    canaryStage: 1,
    notBefore: NOT_BEFORE,
    expiresAt: EXPIRES_AT,
    idempotencyKey: "00000000-0000-4000-8000-000000000112",
  });
}

function enabledControls(
  authorization: ActionAuthorization,
): RuntimeReleaseControls {
  return {
    globalEnabled: true,
    releaseKey: LIVE_ACTION_RELEASE_KEY,
    policyVersion: LIVE_ACTION_POLICY_VERSION,
    executors: {
      ...DEFAULT_EXECUTOR_CONTROLS,
      [authorization.executor]: {
        executor: authorization.executor,
        enabled: true,
        allowedActionTypes: [authorization.actionType],
        dailyActionCap: authorization.maxActions,
        monthlyActionCap: authorization.maxActions * 10,
        dailySpendCapPaise: authorization.maxSpendPaise,
        canaryStage: authorization.canaryStage,
        policyVersion: LIVE_ACTION_POLICY_VERSION,
        releaseKey: LIVE_ACTION_RELEASE_KEY,
      },
    },
  };
}

function dispatchInput(
  authorization: ActionAuthorization,
  approvals: DispatchAuthorizationInput["approvals"] = [],
): DispatchAuthorizationInput {
  return {
    authorization,
    payload,
    approvals,
    verifierActorId: IDS.verifier,
    usage: { dailyActions: 0, monthlyActions: 0, dailySpendPaise: 0 },
  };
}

describe("live action contracts and canonical payload hashing", () => {
  it("uses stable canonical JSON independent of object key order", async () => {
    const left = { b: [2, 1], a: { y: true, x: "value" } };
    const right = { a: { x: "value", y: true }, b: [2, 1] };
    expect(canonicalizeActionPayload(left)).toBe(
      canonicalizeActionPayload(right),
    );
    expect(await hashActionPayload(left)).toBe(await hashActionPayload(right));
    expect(
      await actionPayloadMatchesHash(right, await hashActionPayload(left)),
    ).toBe(true);
  });

  it("rejects unknown fields, unsafe keys and invalid authorization windows", async () => {
    const intent = await lifecycleIntent();
    expect(() => actionIntentSchema.parse({ ...intent, unexpected: true })).toThrow();
    expect(() =>
      boundedJsonRecordSchema.parse(
        JSON.parse('{"__proto__":{"polluted":true}}'),
      ),
    ).toThrow(/Unsafe object key/i);
    expect(() =>
      actionIntentSchema.parse({
        ...intent,
        expiresAt: "2026-08-28T00:00:00.001Z",
      }),
    ).toThrow(/7 days/i);
  });

  it("bounds canonical payload depth and rejects undefined values", () => {
    expect(() => canonicalizeActionPayload({ value: undefined })).toThrow();
    let nested: Record<string, unknown> = { leaf: true };
    for (let index = 0; index < 18; index += 1) nested = { nested };
    expect(() => canonicalizeActionPayload(nested)).toThrow(
      "ACTION_PAYLOAD_TOO_DEEP",
    );
  });
});

describe("deterministic live action policy", () => {
  it("derives tier and risk server-side and defaults to shadow mode", async () => {
    const authorization = deriveActionAuthorization(await lifecycleIntent());
    expect(authorization).toMatchObject({
      approvalTier: 2,
      requiredApprovals: 0,
      riskLevel: "low",
      executionMode: "shadow",
      status: "approved",
      policyVersion: LIVE_ACTION_POLICY_VERSION,
    });
  });

  it("detects a caller attempting to downgrade derived policy", async () => {
    const authorization = deriveActionAuthorization(await lifecycleIntent(), {
      executionMode: "live",
    });
    const downgraded = actionAuthorizationSchema.parse({
      ...authorization,
      approvalTier: 0,
    });
    expect(() => assertAuthorizationMatchesPolicy(downgraded)).toThrow(
      "AUTHORIZATION_POLICY_MISMATCH",
    );
  });

  it("denies mismatched capabilities, scopes and shadow-only executors", async () => {
    const baseIntent = await lifecycleIntent();
    expect(() =>
      deriveActionPolicy("support_reply", "consented_email_dispatch"),
    ).toThrow("EXECUTOR_CAPABILITY_DENIED");
    expect(() =>
      deriveActionAuthorization({
        ...baseIntent,
        targetScope: {
          scopeType: "support_case",
          caseId: IDS.member,
          replyProposalId: IDS.proposal,
        },
      }),
    ).toThrow("ACTION_TARGET_SCOPE_DENIED");
    const experimentIntent = {
      ...baseIntent,
      executor: "experiment",
      actionType: "experiment_assignment_create",
      targetScope: {
        scopeType: "experiment_cohort",
        experimentId: IDS.member,
        cohortId: IDS.proposal,
      },
      canaryStage: 0,
    };
    expect(() =>
      deriveActionAuthorization(experimentIntent, { executionMode: "live" }),
    ).toThrow("ACTION_LIVE_EXECUTION_PROHIBITED");
  });
});

describe("dispatch authorization and executor isolation", () => {
  it("fails closed with the default release controls", async () => {
    const authorization = deriveActionAuthorization(await lifecycleIntent(), {
      executionMode: "live",
    });
    await expect(
      authorizeActionDispatch(
        dispatchInput(authorization),
        defaultRuntimeReleaseControls(),
        { now: NOW },
      ),
    ).resolves.toEqual({ authorized: false, code: "ACTION_RELEASE_DISABLED" });
  });

  it("authorizes only exact payload, capability, canary and budget scope", async () => {
    const authorization = deriveActionAuthorization(await lifecycleIntent(), {
      executionMode: "live",
    });
    const controls = enabledControls(authorization);
    await expect(
      authorizeActionDispatch(dispatchInput(authorization), controls, { now: NOW }),
    ).resolves.toMatchObject({ authorized: true, code: "AUTHORIZED" });
    await expect(
      authorizeActionDispatch(
        { ...dispatchInput(authorization), payload: { templateId: "changed" } },
        controls,
        { now: NOW },
      ),
    ).resolves.toEqual({ authorized: false, code: "ACTION_PAYLOAD_MISMATCH" });
    await expect(
      authorizeActionDispatch(
        {
          ...dispatchInput(authorization),
          usage: { dailyActions: 1, monthlyActions: 0, dailySpendPaise: 0 },
        },
        controls,
        { now: NOW },
      ),
    ).resolves.toEqual({
      authorized: false,
      code: "ACTION_DAILY_BUDGET_EXCEEDED",
    });
  });

  it("enforces distinct proposer, approver and verifier identities", async () => {
    const consentPayload = { templateId: "consent-welcome-v1" };
    const authorization = deriveActionAuthorization(
      {
        ...(await lifecycleIntent()),
        executor: "consent_outreach",
        actionType: "consented_email_dispatch",
        targetScope: {
          scopeType: "consented_recipient",
          consentRecordId: IDS.consent,
          recipientHash: "c".repeat(64),
        },
        payloadSha256: await hashActionPayload(consentPayload),
        maxActions: 1,
      },
      { executionMode: "live" },
    );
    const approvedAuthorization = actionAuthorizationSchema.parse({
      ...authorization,
      status: "approved",
    });
    const approval = {
      authorizationId: authorization.authorizationId,
      proposalRevision: authorization.proposalRevision,
      ordinal: 1,
      approverActorId: IDS.proposer,
      decision: "approved" as const,
      reasonSha256: "d".repeat(64),
      decidedAt: NOW.toISOString(),
    };
    const input = {
      ...dispatchInput(approvedAuthorization, [approval]),
      payload: consentPayload,
    };
    await expect(
      authorizeActionDispatch(input, enabledControls(approvedAuthorization), {
        now: NOW,
      }),
    ).resolves.toEqual({ authorized: false, code: "ACTION_APPROVER_CONFLICT" });
  });

  it("requires two distinct approvals for Tier 4 owned-site publication", async () => {
    const authorization = deriveActionAuthorization(
      {
        ...(await lifecycleIntent()),
        executor: "owned_site_publish",
        actionType: "owned_site_article_publish",
        targetScope: {
          scopeType: "owned_site_draft",
          draftId: IDS.draft,
          slug: "farmerbook-canary-story",
        },
      },
      { executionMode: "live" },
    );
    const approvedAuthorization = actionAuthorizationSchema.parse({
      ...authorization,
      status: "approved",
    });
    const approvals = [IDS.approverOne, IDS.approverTwo].map(
      (approverActorId, index) => ({
        authorizationId: authorization.authorizationId,
        proposalRevision: authorization.proposalRevision,
        ordinal: index + 1,
        approverActorId,
        decision: "approved" as const,
        reasonSha256: `${index + 1}`.repeat(64),
        decidedAt: NOW.toISOString(),
      }),
    );
    expect(authorization).toMatchObject({
      approvalTier: 4,
      requiredApprovals: 2,
      riskLevel: "high",
    });
    await expect(
      authorizeActionDispatch(
        dispatchInput(approvedAuthorization, approvals.slice(0, 1)),
        enabledControls(approvedAuthorization),
        { now: NOW },
      ),
    ).resolves.toEqual({
      authorized: false,
      code: "ACTION_APPROVALS_INSUFFICIENT",
    });
    await expect(
      authorizeActionDispatch(
        dispatchInput(approvedAuthorization, approvals),
        enabledControls(approvedAuthorization),
        { now: NOW },
      ),
    ).resolves.toMatchObject({ authorized: true, code: "AUTHORIZED" });
  });

  it("has no default callable executors and never calls a fake provider", async () => {
    const authorization = deriveActionAuthorization(await lifecycleIntent(), {
      executionMode: "live",
    });
    const fakeProvider = vi.fn();
    const registry = new ExecutorRegistry();
    await expect(registry.dispatch(authorization, payload, {
      attemptId: IDS.attempt,
      providerIdempotencyKey: "e".repeat(64),
    })).resolves.toEqual({
      code: "FAILED",
      failureCode: "EXECUTOR_NOT_REGISTERED",
    });
    expect(fakeProvider).not.toHaveBeenCalled();
  });
});

describe("verification state machine", () => {
  it("requires an independent verifier for a valid terminal success", async () => {
    const authorization = deriveActionAuthorization(await lifecycleIntent(), {
      executionMode: "live",
    });
    const prepared = createPreparedReceipt({
      attemptId: IDS.attempt,
      authorization,
      executorActorId: IDS.executor,
      at: NOW.toISOString(),
    });
    const dispatched = transitionExecutionReceipt(
      prepared,
      {
        type: "dispatch_recorded",
        providerReceiptSha256: "e".repeat(64),
        at: NOW.toISOString(),
      },
      { reversible: true },
    );
    expect(() =>
      transitionExecutionReceipt(
        dispatched,
        {
          type: "verification_confirmed",
          verifierActorId: IDS.executor,
          evidenceSha256: "f".repeat(64),
          at: NOW.toISOString(),
        },
        { reversible: true },
      ),
    ).toThrow("VERIFIER_ACTOR_CONFLICT");
    const verified = transitionExecutionReceipt(
      dispatched,
      {
        type: "verification_confirmed",
        verifierActorId: IDS.verifier,
        evidenceSha256: "f".repeat(64),
        at: NOW.toISOString(),
      },
      { reversible: true, disallowedVerifierActorIds: [IDS.proposer] },
    );
    expect(actionExecutionReceiptSchema.parse(verified)).toMatchObject({
      state: "verified",
      pauseRequired: false,
      verifierActorId: IDS.verifier,
    });
  });

  it("pauses unknown outcomes, forbids blind retry and gates compensation", async () => {
    const authorization = deriveActionAuthorization(await lifecycleIntent(), {
      executionMode: "live",
    });
    const prepared = createPreparedReceipt({
      attemptId: IDS.attempt,
      authorization,
      executorActorId: IDS.executor,
      at: NOW.toISOString(),
    });
    const unknown = transitionExecutionReceipt(
      prepared,
      {
        type: "dispatch_unknown",
        failureCode: "PROVIDER_OUTCOME_UNKNOWN",
        at: NOW.toISOString(),
      },
      { reversible: true },
    );
    expect(unknown).toMatchObject({ state: "unknown", pauseRequired: true });
    expect(mayRetryDispatch(unknown)).toBe(false);
    expect(() =>
      transitionExecutionReceipt(
        unknown,
        {
          type: "dispatch_recorded",
          providerReceiptSha256: "a".repeat(64),
          at: NOW.toISOString(),
        },
        { reversible: true },
      ),
    ).toThrow("ATTEMPT_TRANSITION_DENIED");
    expect(() =>
      transitionExecutionReceipt(
        unknown,
        {
          type: "compensation_confirmed",
          verifierActorId: IDS.verifier,
          evidenceSha256: "b".repeat(64),
          at: NOW.toISOString(),
        },
        { reversible: false },
      ),
    ).toThrow("ATTEMPT_COMPENSATION_DENIED");
  });
});
