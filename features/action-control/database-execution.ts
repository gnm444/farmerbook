import { dispatchAuthorizationInputSchema } from "./authorizer";
import {
  type LiveActionDatabaseGateway,
} from "./database-gateway";
import { type ExecutorRegistry } from "./executors";
import {
  actionPayloadMatchesHash,
  canonicalizeActionPayload,
  hashActionPayload,
} from "./hashing";
import { assertAuthorizationMatchesPolicy } from "./policy";

export type DatabaseAuthorizedExecutionResult =
  | {
      code: "SHADOW_VALIDATED";
      authorizationId: string;
      externalActions: 0;
    }
  | {
      code: "DISPATCHED";
      authorizationId: string;
      attemptId: string;
      providerReceiptSha256: string;
      receiptPersisted: true;
    }
  | {
      code: "UNKNOWN";
      authorizationId: string;
      attemptId: string;
      failureCode: string;
      receiptPersisted: boolean;
    };

type DatabaseExecutionDependencies = {
  executionEnabled: () => boolean;
  getGateway: () => LiveActionDatabaseGateway;
  executorRegistry: ExecutorRegistry;
  now?: () => Date;
  randomUUID?: () => `${string}-${string}-${string}-${string}-${string}`;
};

function safeFailureCode(raw: unknown, fallback: string) {
  const source = raw instanceof Error ? raw.message : "";
  const code = source.match(/[A-Z][A-Z0-9_]{2,80}/)?.[0];
  return code ?? fallback;
}

function assertExactDatabaseAuthorization(
  authorization: {
    authorizationId: string;
    executor: string;
    actionType: string;
    targetScope: Record<string, unknown>;
    payloadSha256: string;
  },
  databaseAuthorization: {
    authorization_id: string;
    executor: string;
    action_type: string;
    target_scope: Record<string, unknown>;
    payload_sha256: string;
    dispatch_lease_expires_at: string;
  },
  now: Date,
) {
  if (
    databaseAuthorization.authorization_id !== authorization.authorizationId ||
    databaseAuthorization.executor !== authorization.executor ||
    databaseAuthorization.action_type !== authorization.actionType ||
    databaseAuthorization.payload_sha256 !== authorization.payloadSha256 ||
    canonicalizeActionPayload(databaseAuthorization.target_scope) !==
      canonicalizeActionPayload(authorization.targetScope) ||
    Date.parse(databaseAuthorization.dispatch_lease_expires_at) <= now.getTime()
  ) {
    throw new Error("ACTION_DATABASE_AUTHORIZATION_MISMATCH");
  }
}

export async function executeDatabaseAuthorizedAction(
  rawInput: unknown,
  dependencies: DatabaseExecutionDependencies,
): Promise<DatabaseAuthorizedExecutionResult> {
  const input = dispatchAuthorizationInputSchema.parse(rawInput);
  const { authorization, payload } = input;
  assertAuthorizationMatchesPolicy(authorization);
  if (
    !(await actionPayloadMatchesHash(payload, authorization.payloadSha256))
  ) {
    throw new Error("ACTION_PAYLOAD_MISMATCH");
  }
  if (authorization.executionMode === "shadow") {
    return {
      code: "SHADOW_VALIDATED",
      authorizationId: authorization.authorizationId,
      externalActions: 0,
    };
  }
  if (!dependencies.executionEnabled()) {
    throw new Error("ACTION_RELEASE_DISABLED");
  }

  const now = dependencies.now ?? (() => new Date());
  const randomUUID = dependencies.randomUUID ?? (() => crypto.randomUUID());
  const gateway = dependencies.getGateway();
  const requestSha256 = await hashActionPayload({
    authorizationId: authorization.authorizationId,
    executor: authorization.executor,
    actionType: authorization.actionType,
    targetScope: authorization.targetScope,
    payloadSha256: authorization.payloadSha256,
    spendPaise: authorization.maxSpendPaise,
  });
  const claim = await gateway.claimAuthorization({
    authorizationId: authorization.authorizationId,
    executor: authorization.executor,
    requestSha256,
    idempotencyKey: randomUUID(),
  });
  if (claim.code !== "CLAIMED" || !claim.lease_token) {
    throw new Error("ACTION_LEASE_TOKEN_UNAVAILABLE");
  }
  if (!dependencies.executionEnabled()) {
    throw new Error("ACTION_RELEASE_DISABLED");
  }

  // This database RPC atomically rechecks the frozen authorization, current
  // proposal revision, executor pause/canary controls, approvals, exact scope,
  // payload hash and budgets. Keep it in the same no-retry call as dispatch.
  const databaseAuthorization = await gateway.authorizeDispatch({
    executor: authorization.executor,
    attemptId: claim.attempt_id,
    leaseToken: claim.lease_token,
    payloadSha256: authorization.payloadSha256,
    targetScope: authorization.targetScope,
    spendPaise: authorization.maxSpendPaise,
  });
  assertExactDatabaseAuthorization(
    authorization,
    databaseAuthorization,
    now(),
  );
  if (!dependencies.executionEnabled()) {
    throw new Error("ACTION_RELEASE_DISABLED");
  }

  const receiptIdempotencyKey = randomUUID();
  const providerIdempotencyKey = await hashActionPayload({
    authorizationId: authorization.authorizationId,
    attemptId: claim.attempt_id,
    payloadSha256: authorization.payloadSha256,
  });
  let dispatch:
    | { code: "DISPATCHED"; providerReceiptSha256: string }
    | { code: "UNKNOWN" | "FAILED"; failureCode: string };
  try {
    dispatch = await dependencies.executorRegistry.dispatch(
      authorization,
      payload,
      { attemptId: claim.attempt_id, providerIdempotencyKey },
    );
  } catch (error) {
    dispatch = {
      code: "UNKNOWN",
      failureCode: safeFailureCode(error, "EXECUTOR_OUTCOME_UNKNOWN"),
    };
  }
  if (
    dispatch.code === "DISPATCHED" &&
    !/^[0-9a-f]{64}$/.test(dispatch.providerReceiptSha256)
  ) {
    dispatch = {
      code: "UNKNOWN",
      failureCode: "PROVIDER_RECEIPT_INVALID",
    };
  }

  const occurredAt = now().toISOString();
  if (dispatch.code === "DISPATCHED") {
    try {
      await gateway.recordReceipt({
        executor: authorization.executor,
        attemptId: claim.attempt_id,
        leaseToken: claim.lease_token,
        // Provider acceptance is not independent verification. Persist it as
        // unknown so the SQL control plane auto-pauses this executor until a
        // separately credentialed verifier reconciles the attempt.
        result: "unknown",
        receipt: {
          provider: authorization.executor,
          providerReceiptSha256: dispatch.providerReceiptSha256,
          occurredAt,
          reconciliationCode: "VERIFIER_NOT_REGISTERED",
          reasonCode: "VERIFIER_NOT_REGISTERED",
        },
        idempotencyKey: receiptIdempotencyKey,
      });
      return {
        code: "UNKNOWN",
        authorizationId: authorization.authorizationId,
        attemptId: claim.attempt_id,
        failureCode: "VERIFIER_NOT_REGISTERED",
        receiptPersisted: true,
      };
    } catch {
      // The provider may have accepted the action even when receipt persistence
      // is ambiguous. Never retry dispatch; reconciliation owns this outcome.
      return {
        code: "UNKNOWN",
        authorizationId: authorization.authorizationId,
        attemptId: claim.attempt_id,
        failureCode: "ACTION_RECEIPT_PERSISTENCE_UNKNOWN",
        receiptPersisted: false,
      };
    }
  }

  const failureCode = safeFailureCode(
    new Error(dispatch.failureCode),
    "EXECUTOR_OUTCOME_UNKNOWN",
  );
  try {
    await gateway.recordReceipt({
      executor: authorization.executor,
      attemptId: claim.attempt_id,
      leaseToken: claim.lease_token,
      result: "unknown",
      receipt: {
        provider: authorization.executor,
        occurredAt,
        reconciliationCode: "ACTION_RECONCILIATION_REQUIRED",
        reasonCode: failureCode,
      },
      idempotencyKey: receiptIdempotencyKey,
    });
    return {
      code: "UNKNOWN",
      authorizationId: authorization.authorizationId,
      attemptId: claim.attempt_id,
      failureCode,
      receiptPersisted: true,
    };
  } catch {
    return {
      code: "UNKNOWN",
      authorizationId: authorization.authorizationId,
      attemptId: claim.attempt_id,
      failureCode: "ACTION_RECEIPT_PERSISTENCE_UNKNOWN",
      receiptPersisted: false,
    };
  }
}
