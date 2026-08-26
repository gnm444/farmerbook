import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  actionExecutorSchema,
  actionTargetScopeSchema,
  sha256Schema,
  type ActionExecutor,
  type ActionTargetScope,
} from "./contracts";

export const LIVE_ACTION_RUNTIME_RPC_ALLOWLIST = [
  "claim_live_agent_action_authorization",
  "authorize_live_agent_action_dispatch",
  "record_live_agent_action_receipt",
  "verify_live_agent_action_attempt",
] as const;

type LiveActionRuntimeRpc =
  (typeof LIVE_ACTION_RUNTIME_RPC_ALLOWLIST)[number];

type RpcError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

export type LiveActionRpcClient = {
  rpc(
    name: LiveActionRuntimeRpc,
    parameters: Record<string, unknown>,
  ): PromiseLike<{ data: unknown; error: RpcError | null }>;
};

export type LiveActionPrincipal =
  | `executor:${ActionExecutor}`
  | "verifier:action_verifier";

export type LiveActionPrincipalTokens = {
  executors?: Partial<Record<ActionExecutor, string>>;
  verifier?: string;
};

export type LiveActionDatabaseConfiguration = {
  supabaseUrl?: string;
  publishableKey?: string;
  principalTokens?: LiveActionPrincipalTokens;
};

// The migration currently validates action_principal claims but its runtime
// RPC grants still use Supabase's broad service_role. Do not allow environment-
// configured principals to activate until dedicated restricted PostgREST roles
// replace that grant model.
export const LIVE_ACTION_RESTRICTED_DATABASE_ROLES_READY = false as const;

const EXECUTOR_PRINCIPAL_BINDINGS = {
  consent_outreach: "LIVE_ACTION_CONSENT_OUTREACH_PRINCIPAL_JWT",
  in_app_lifecycle: "LIVE_ACTION_IN_APP_LIFECYCLE_PRINCIPAL_JWT",
  support_reply: "LIVE_ACTION_SUPPORT_REPLY_PRINCIPAL_JWT",
  owned_site_publish: "LIVE_ACTION_OWNED_SITE_PUBLISH_PRINCIPAL_JWT",
  marketplace_recommendation:
    "LIVE_ACTION_MARKETPLACE_RECOMMENDATION_PRINCIPAL_JWT",
  experiment: "LIVE_ACTION_EXPERIMENT_PRINCIPAL_JWT",
  engineering_pr: "LIVE_ACTION_ENGINEERING_PR_PRINCIPAL_JWT",
  canary_release: "LIVE_ACTION_CANARY_RELEASE_PRINCIPAL_JWT",
} as const satisfies Record<ActionExecutor, string>;

type LiveActionPrincipalEnv = {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
  LIVE_ACTION_CONSENT_OUTREACH_PRINCIPAL_JWT?: string;
  LIVE_ACTION_IN_APP_LIFECYCLE_PRINCIPAL_JWT?: string;
  LIVE_ACTION_SUPPORT_REPLY_PRINCIPAL_JWT?: string;
  LIVE_ACTION_OWNED_SITE_PUBLISH_PRINCIPAL_JWT?: string;
  LIVE_ACTION_MARKETPLACE_RECOMMENDATION_PRINCIPAL_JWT?: string;
  LIVE_ACTION_EXPERIMENT_PRINCIPAL_JWT?: string;
  LIVE_ACTION_ENGINEERING_PR_PRINCIPAL_JWT?: string;
  LIVE_ACTION_CANARY_RELEASE_PRINCIPAL_JWT?: string;
  LIVE_ACTION_ACTION_VERIFIER_PRINCIPAL_JWT?: string;
};

const claimRowSchema = z
  .object({
    code: z.enum(["CLAIMED", "IDEMPOTENT_REPLAY_NO_TOKEN"]),
    attempt_id: z.uuid(),
    lease_token: z.string().min(30).nullable(),
    lease_expires_at: z.iso.datetime({ offset: true }),
  })
  .strict();

const authorizationRowSchema = z
  .object({
    code: z.enum(["DISPATCH_AUTHORIZED", "IDEMPOTENT_REPLAY"]),
    authorization_id: z.uuid(),
    executor: actionExecutorSchema,
    action_type: z.string().regex(/^[a-z0-9_]{3,80}$/),
    target_scope: actionTargetScopeSchema,
    payload_sha256: sha256Schema,
    dispatch_lease_expires_at: z.iso.datetime({ offset: true }),
  })
  .strict();

const receiptRowSchema = z
  .object({
    code: z.enum(["RECEIPT_RECORDED", "IDEMPOTENT_REPLAY"]),
    attempt_id: z.uuid(),
    state: z.enum(["dispatched", "unknown"]),
    receipt_sha256: sha256Schema,
  })
  .strict();

const verificationRowSchema = z
  .object({
    code: z.enum(["VERIFICATION_RECORDED", "IDEMPOTENT_REPLAY"]),
    attempt_id: z.uuid(),
    state: z.enum(["verified", "unknown", "failed"]),
  })
  .strict();

function firstRow(rawData: unknown) {
  return Array.isArray(rawData) ? rawData[0] : rawData;
}

function databaseFailure(operation: string, error: RpcError) {
  const detail = [error.code, error.details, error.message]
    .filter(Boolean)
    .join(" ")
    .toUpperCase();
  const knownCode = detail.match(/[A-Z][A-Z0-9_]{2,80}/)?.[0];
  return new Error(knownCode ?? `LIVE_ACTION_${operation}_FAILED`);
}

function tokenForPrincipal(
  tokens: LiveActionPrincipalTokens | undefined,
  principal: LiveActionPrincipal,
) {
  if (principal === "verifier:action_verifier") return tokens?.verifier;
  return tokens?.executors?.[actionExecutorSchema.parse(principal.slice(9))];
}

export function liveActionDatabaseConfigurationFromEnv(
  rawEnv: LiveActionPrincipalEnv,
): LiveActionDatabaseConfiguration {
  const env = rawEnv as LiveActionPrincipalEnv & Record<string, string | undefined>;
  const executors: Partial<Record<ActionExecutor, string>> = {};
  for (const executor of actionExecutorSchema.options) {
    const token = env[EXECUTOR_PRINCIPAL_BINDINGS[executor]];
    if (token) executors[executor] = token;
  }
  return {
    supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    principalTokens: {
      executors,
      verifier: env.LIVE_ACTION_ACTION_VERIFIER_PRINCIPAL_JWT,
    },
  };
}

export class LiveActionDatabaseGateway {
  readonly #clientForPrincipal: (
    principal: LiveActionPrincipal,
  ) => LiveActionRpcClient;

  constructor(options: {
    clientForPrincipal: (
      principal: LiveActionPrincipal,
    ) => LiveActionRpcClient;
  }) {
    this.#clientForPrincipal = options.clientForPrincipal;
  }

  private async call(
    principal: LiveActionPrincipal,
    rpc: LiveActionRuntimeRpc,
    parameters: Record<string, unknown>,
  ) {
    if (!LIVE_ACTION_RUNTIME_RPC_ALLOWLIST.includes(rpc)) {
      throw new Error("LIVE_ACTION_RPC_NOT_ALLOWED");
    }
    const { data, error } = await this.#clientForPrincipal(principal).rpc(
      rpc,
      parameters,
    );
    if (error) throw databaseFailure(rpc.toUpperCase(), error);
    return firstRow(data);
  }

  async claimAuthorization(input: {
    authorizationId: string;
    executor: ActionExecutor;
    requestSha256: string;
    idempotencyKey: string;
  }) {
    return claimRowSchema.parse(
      await this.call(
        `executor:${input.executor}`,
        "claim_live_agent_action_authorization",
        {
          authorization_id_input: input.authorizationId,
          executor_input: input.executor,
          request_sha256_input: input.requestSha256,
          idempotency_key_input: input.idempotencyKey,
        },
      ),
    );
  }

  async authorizeDispatch(input: {
    executor: ActionExecutor;
    attemptId: string;
    leaseToken: string;
    payloadSha256: string;
    targetScope: ActionTargetScope;
    spendPaise: number;
  }) {
    return authorizationRowSchema.parse(
      await this.call(
        `executor:${input.executor}`,
        "authorize_live_agent_action_dispatch",
        {
          attempt_id_input: input.attemptId,
          lease_token_input: input.leaseToken,
          payload_sha256_input: input.payloadSha256,
          target_scope_input: input.targetScope,
          spend_paise_input: input.spendPaise,
        },
      ),
    );
  }

  async recordReceipt(input: {
    executor: ActionExecutor;
    attemptId: string;
    leaseToken: string;
    result: "dispatched" | "unknown";
    receipt: Record<string, string | number>;
    idempotencyKey: string;
  }) {
    const row = receiptRowSchema.parse(
      await this.call(
        `executor:${input.executor}`,
        "record_live_agent_action_receipt",
        {
          attempt_id_input: input.attemptId,
          lease_token_input: input.leaseToken,
          result_input: input.result,
          receipt_input: input.receipt,
          idempotency_key_input: input.idempotencyKey,
        },
      ),
    );
    if (row.state !== input.result) {
      throw new Error("ACTION_RECEIPT_STATE_MISMATCH");
    }
    return row;
  }

  async verifyAttempt(input: {
    attemptId: string;
    result: "verified" | "unknown" | "failed";
    verification: Record<string, string | number>;
    idempotencyKey: string;
  }) {
    return verificationRowSchema.parse(
      await this.call(
        "verifier:action_verifier",
        "verify_live_agent_action_attempt",
        {
          attempt_id_input: input.attemptId,
          verifier_identity_input: "action_verifier",
          result_input: input.result,
          verification_input: input.verification,
          idempotency_key_input: input.idempotencyKey,
        },
      ),
    );
  }
}

export function createLiveActionDatabaseGateway(
  configuration: LiveActionDatabaseConfiguration,
) {
  return new LiveActionDatabaseGateway({
    clientForPrincipal(principal) {
      const supabaseUrl = configuration.supabaseUrl?.trim();
      const publishableKey = configuration.publishableKey?.trim();
      const principalToken = tokenForPrincipal(
        configuration.principalTokens,
        principal,
      )?.trim();
      if (!supabaseUrl || !publishableKey || !principalToken) {
        throw new Error("ACTION_PRINCIPAL_NOT_CONFIGURED");
      }
      if (!LIVE_ACTION_RESTRICTED_DATABASE_ROLES_READY) {
        throw new Error("ACTION_RESTRICTED_DATABASE_ROLE_NOT_IMPLEMENTED");
      }
      return createClient(supabaseUrl, publishableKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: {
          headers: { Authorization: `Bearer ${principalToken}` },
        },
      }) as unknown as LiveActionRpcClient;
    },
  });
}
