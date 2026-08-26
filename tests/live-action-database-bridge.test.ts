import { describe, expect, it, vi } from "vitest";
import type { DispatchAuthorizationInput } from "@/features/action-control/authorizer";
import { executeDatabaseAuthorizedAction } from "@/features/action-control/database-execution";
import {
  createLiveActionDatabaseGateway,
  LIVE_ACTION_RUNTIME_RPC_ALLOWLIST,
  LiveActionDatabaseGateway,
  type LiveActionPrincipal,
  type LiveActionRpcClient,
} from "@/features/action-control/database-gateway";
import { ExecutorRegistry } from "@/features/action-control/executors";
import { hashActionPayload } from "@/features/action-control/hashing";
import { deriveActionAuthorization } from "@/features/action-control/policy";

const IDS = {
  authorization: "00000000-0000-4000-8000-000000005001",
  proposal: "00000000-0000-4000-8000-000000005002",
  proposer: "00000000-0000-4000-8000-000000005003",
  member: "00000000-0000-4000-8000-000000005004",
  otherMember: "00000000-0000-4000-8000-000000005005",
  verifier: "00000000-0000-4000-8000-000000005006",
  attempt: "00000000-0000-4000-8000-000000005007",
  claimIdempotency: "00000000-0000-4000-8000-000000005008",
  receiptIdempotency: "00000000-0000-4000-8000-000000005009",
} as const;

const NOW = new Date("2026-08-20T12:00:00.000Z");
const payload = { templateId: "welcome-v1", locale: "te-IN" };

async function input(
  executionMode: "shadow" | "live" = "live",
): Promise<DispatchAuthorizationInput> {
  const authorization = deriveActionAuthorization(
    {
      authorizationId: IDS.authorization,
      proposalId: IDS.proposal,
      proposalRevision: 2,
      proposerActorId: IDS.proposer,
      executor: "in_app_lifecycle",
      actionType: "in_app_lifecycle_message",
      targetScope: {
        scopeType: "member_lifecycle",
        memberId: IDS.member,
      },
      payloadSha256: await hashActionPayload(payload),
      maxActions: 1,
      maxSpendPaise: 0,
      canaryStage: 1,
      notBefore: "2026-08-20T00:00:00.000Z",
      expiresAt: "2026-08-21T00:00:00.000Z",
      idempotencyKey: "00000000-0000-4000-8000-000000005010",
    },
    { executionMode },
  );
  return {
    authorization,
    payload,
    approvals: [],
    verifierActorId: IDS.verifier,
    usage: {
      dailyActions: 999,
      monthlyActions: 999,
      dailySpendPaise: 999,
    },
  };
}

function gatewayWithRows(options: {
  targetMemberId?: string;
  recordError?: boolean;
}) {
  const calls: Array<{
    principal: LiveActionPrincipal;
    rpc: string;
    parameters: Record<string, unknown>;
  }> = [];
  const gateway = new LiveActionDatabaseGateway({
    clientForPrincipal(principal): LiveActionRpcClient {
      return {
        async rpc(rpc, parameters) {
          calls.push({ principal, rpc, parameters });
          if (rpc === "claim_live_agent_action_authorization") {
            return {
              data: [{
                code: "CLAIMED",
                attempt_id: IDS.attempt,
                lease_token: "lease-token-with-at-least-thirty-characters",
                lease_expires_at: "2026-08-20T12:01:00.000Z",
              }],
              error: null,
            };
          }
          if (rpc === "authorize_live_agent_action_dispatch") {
            return {
              data: [{
                code: "DISPATCH_AUTHORIZED",
                authorization_id: IDS.authorization,
                executor: "in_app_lifecycle",
                action_type: "in_app_lifecycle_message",
                target_scope: {
                  scopeType: "member_lifecycle",
                  memberId: options.targetMemberId ?? IDS.member,
                },
                payload_sha256: await hashActionPayload(payload),
                dispatch_lease_expires_at: "2026-08-20T12:01:00.000Z",
              }],
              error: null,
            };
          }
          if (options.recordError) {
            return {
              data: null,
              error: { details: "RECEIPT_WRITE_FAILED" },
            };
          }
          return {
            data: [{
              code: "RECEIPT_RECORDED",
              attempt_id: IDS.attempt,
              state: "unknown",
              receipt_sha256: "a".repeat(64),
            }],
            error: null,
          };
        },
      };
    },
  });
  return { gateway, calls };
}

function sequentialUuid() {
  const values = [IDS.claimIdempotency, IDS.receiptIdempotency];
  return () => values.shift() as `${string}-${string}-${string}-${string}-${string}`;
}

describe("live-action database gateway", () => {
  it("contains only the execution bridge RPC allowlist", () => {
    expect(LIVE_ACTION_RUNTIME_RPC_ALLOWLIST).toEqual([
      "claim_live_agent_action_authorization",
      "authorize_live_agent_action_dispatch",
      "record_live_agent_action_receipt",
      "verify_live_agent_action_attempt",
    ]);
  });

  it("fails closed when the exact scoped executor principal is absent", async () => {
    const gateway = createLiveActionDatabaseGateway({
      supabaseUrl: "https://example.supabase.co",
      publishableKey: "publishable-test-key",
      principalTokens: { executors: {} },
    });
    await expect(gateway.claimAuthorization({
      authorizationId: IDS.authorization,
      executor: "in_app_lifecycle",
      requestSha256: "a".repeat(64),
      idempotencyKey: IDS.claimIdempotency,
    })).rejects.toThrow("ACTION_PRINCIPAL_NOT_CONFIGURED");
  });

  it("keeps environment-configured principals blocked until restricted database roles exist", async () => {
    const gateway = createLiveActionDatabaseGateway({
      supabaseUrl: "https://example.supabase.co",
      publishableKey: "publishable-test-key",
      principalTokens: {
        executors: { in_app_lifecycle: "synthetic-principal-token" },
      },
    });
    await expect(gateway.claimAuthorization({
      authorizationId: IDS.authorization,
      executor: "in_app_lifecycle",
      requestSha256: "a".repeat(64),
      idempotencyKey: IDS.claimIdempotency,
    })).rejects.toThrow("ACTION_RESTRICTED_DATABASE_ROLE_NOT_IMPLEMENTED");
  });

  it("uses a separate verifier principal for verification writes", async () => {
    const principals: LiveActionPrincipal[] = [];
    const gateway = new LiveActionDatabaseGateway({
      clientForPrincipal(principal) {
        principals.push(principal);
        return {
          async rpc() {
            return {
              data: [{
                code: "VERIFICATION_RECORDED",
                attempt_id: IDS.attempt,
                state: "verified",
              }],
              error: null,
            };
          },
        };
      },
    });
    await gateway.verifyAttempt({
      attemptId: IDS.attempt,
      result: "verified",
      verification: { reconciliationCode: "POSTCONDITION_CONFIRMED" },
      idempotencyKey: IDS.receiptIdempotency,
    });
    expect(principals).toEqual(["verifier:action_verifier"]);
  });
});

describe("database-backed live action execution", () => {
  it("keeps shadow execution database-free and executor-free", async () => {
    const dispatch = vi.fn();
    const result = await executeDatabaseAuthorizedAction(await input("shadow"), {
      executionEnabled: () => false,
      getGateway: () => {
        throw new Error("DATABASE_MUST_NOT_BE_CALLED");
      },
      executorRegistry: new ExecutorRegistry([{
        executor: "in_app_lifecycle",
        capabilities: ["in_app_lifecycle_message"],
        dispatch,
      }]),
    });
    expect(result).toMatchObject({
      code: "SHADOW_VALIDATED",
      externalActions: 0,
    });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("claims, atomically authorizes, dispatches once, then records an unverified receipt as unknown", async () => {
    const { gateway, calls } = gatewayWithRows({});
    const dispatch = vi.fn(async () => ({
      code: "DISPATCHED" as const,
      providerReceiptSha256: "b".repeat(64),
    }));
    const result = await executeDatabaseAuthorizedAction(await input(), {
      executionEnabled: () => true,
      getGateway: () => gateway,
      executorRegistry: new ExecutorRegistry([{
        executor: "in_app_lifecycle",
        capabilities: ["in_app_lifecycle_message"],
        dispatch,
      }]),
      now: () => NOW,
      randomUUID: sequentialUuid(),
    });
    expect(result).toMatchObject({
      code: "UNKNOWN",
      attemptId: IDS.attempt,
      failureCode: "VERIFIER_NOT_REGISTERED",
      receiptPersisted: true,
    });
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({
      attemptId: IDS.attempt,
      providerIdempotencyKey: expect.stringMatching(/^[0-9a-f]{64}$/),
    }));
    expect(calls.map((call) => call.rpc)).toEqual([
      "claim_live_agent_action_authorization",
      "authorize_live_agent_action_dispatch",
      "record_live_agent_action_receipt",
    ]);
    expect(calls.every(
      (call) => call.principal === "executor:in_app_lifecycle",
    )).toBe(true);
    expect(calls[1]?.parameters).toMatchObject({
      attempt_id_input: IDS.attempt,
      payload_sha256_input: await hashActionPayload(payload),
      target_scope_input: {
        scopeType: "member_lifecycle",
        memberId: IDS.member,
      },
    });
    expect(calls[2]?.parameters).toMatchObject({
      result_input: "unknown",
      receipt_input: {
        providerReceiptSha256: "b".repeat(64),
        reconciliationCode: "VERIFIER_NOT_REGISTERED",
      },
    });
  });

  it("refuses a database response whose target is not byte-for-byte canonical-equivalent", async () => {
    const { gateway, calls } = gatewayWithRows({
      targetMemberId: IDS.otherMember,
    });
    const dispatch = vi.fn();
    await expect(executeDatabaseAuthorizedAction(await input(), {
      executionEnabled: () => true,
      getGateway: () => gateway,
      executorRegistry: new ExecutorRegistry([{
        executor: "in_app_lifecycle",
        capabilities: ["in_app_lifecycle_message"],
        dispatch,
      }]),
      now: () => NOW,
      randomUUID: sequentialUuid(),
    })).rejects.toThrow("ACTION_DATABASE_AUTHORIZATION_MISMATCH");
    expect(dispatch).not.toHaveBeenCalled();
    expect(calls.map((call) => call.rpc)).toEqual([
      "claim_live_agent_action_authorization",
      "authorize_live_agent_action_dispatch",
    ]);
  });

  it("never retries dispatch when the provider receipt cannot be persisted", async () => {
    const { gateway } = gatewayWithRows({ recordError: true });
    const dispatch = vi.fn(async () => ({
      code: "DISPATCHED" as const,
      providerReceiptSha256: "b".repeat(64),
    }));
    const result = await executeDatabaseAuthorizedAction(await input(), {
      executionEnabled: () => true,
      getGateway: () => gateway,
      executorRegistry: new ExecutorRegistry([{
        executor: "in_app_lifecycle",
        capabilities: ["in_app_lifecycle_message"],
        dispatch,
      }]),
      now: () => NOW,
      randomUUID: sequentialUuid(),
    });
    expect(result).toMatchObject({
      code: "UNKNOWN",
      failureCode: "ACTION_RECEIPT_PERSISTENCE_UNKNOWN",
      receiptPersisted: false,
    });
    expect(dispatch).toHaveBeenCalledTimes(1);
  });
});
