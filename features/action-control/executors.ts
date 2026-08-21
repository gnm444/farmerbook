import { z } from "zod";
import {
  ACTION_EXECUTORS,
  actionExecutorSchema,
  actionTypeSchema,
  LIVE_ACTION_POLICY_VERSION,
  LIVE_ACTION_RELEASE_KEY,
  type ActionAuthorization,
  type ActionExecutor,
} from "./contracts";

export const EXECUTOR_CAPABILITIES = {
  consent_outreach: ["consented_email_dispatch"],
  in_app_lifecycle: ["in_app_lifecycle_message"],
  support_reply: ["approved_support_reply_send"],
  owned_site_publish: ["owned_site_article_publish"],
  marketplace_recommendation: ["marketplace_recommendation_create"],
  experiment: ["experiment_assignment_create"],
  engineering_pr: ["engineering_pull_request_create"],
  canary_release: ["canary_release_deploy"],
} as const satisfies Record<ActionExecutor, readonly string[]>;

export type ExecutorCapability =
  (typeof EXECUTOR_CAPABILITIES)[ActionExecutor][number];

export const executorControlSchema = z
  .object({
    executor: actionExecutorSchema,
    enabled: z.boolean(),
    allowedActionTypes: z.array(actionTypeSchema).max(8),
    dailyActionCap: z.number().int().min(0).max(10_000),
    monthlyActionCap: z.number().int().min(0).max(100_000),
    dailySpendCapPaise: z.number().int().min(0).max(1_000_000_000),
    canaryStage: z.number().int().min(0).max(20),
    policyVersion: z.literal(LIVE_ACTION_POLICY_VERSION),
    releaseKey: z.literal(LIVE_ACTION_RELEASE_KEY),
  })
  .strict();

export type ExecutorControl = z.infer<typeof executorControlSchema>;

export const runtimeReleaseControlsSchema = z
  .object({
    globalEnabled: z.boolean(),
    releaseKey: z.literal(LIVE_ACTION_RELEASE_KEY),
    policyVersion: z.literal(LIVE_ACTION_POLICY_VERSION),
    executors: z.partialRecord(actionExecutorSchema, executorControlSchema),
  })
  .strict();

export type RuntimeReleaseControls = z.infer<
  typeof runtimeReleaseControlsSchema
>;

export type ScopedExecutorResult =
  | {
      code: "DISPATCHED";
      providerReceiptSha256: string;
    }
  | {
      code: "FAILED" | "UNKNOWN";
      failureCode: string;
    };

export type ScopedExecutor = {
  executor: ActionExecutor;
  capabilities: readonly string[];
  dispatch: (input: {
    authorization: ActionAuthorization;
    payload: Record<string, unknown>;
    attemptId: string;
    providerIdempotencyKey: string;
  }) => Promise<ScopedExecutorResult>;
};

// Phase 1 intentionally ships no external executor implementation. Keep the
// administrator resume path closed until restricted database roles, isolated
// connector services and an independent verifier are implemented and tested.
export const LIVE_ACTION_EXTERNAL_EXECUTORS_READY = false as const;

export const DEFAULT_EXECUTOR_CONTROLS: Readonly<
  Record<ActionExecutor, ExecutorControl>
> = Object.freeze(
  Object.fromEntries(
    ACTION_EXECUTORS.map((executor) => [
      executor,
      Object.freeze({
        executor,
        enabled: false,
        allowedActionTypes: [],
        dailyActionCap: 0,
        monthlyActionCap: 0,
        dailySpendCapPaise: 0,
        canaryStage: 0,
        policyVersion: LIVE_ACTION_POLICY_VERSION,
        releaseKey: LIVE_ACTION_RELEASE_KEY,
      }),
    ]),
  ) as unknown as Record<ActionExecutor, ExecutorControl>,
);

export function executorHasCapability(
  executor: ActionExecutor,
  actionType: string,
) {
  return (EXECUTOR_CAPABILITIES[executor] as readonly string[]).includes(
    actionType,
  );
}

export function assertExecutorCapability(
  executor: ActionExecutor,
  actionType: string,
) {
  if (!executorHasCapability(executor, actionType)) {
    throw new Error("EXECUTOR_CAPABILITY_DENIED");
  }
}

export function defaultRuntimeReleaseControls(): RuntimeReleaseControls {
  return {
    globalEnabled: false,
    releaseKey: LIVE_ACTION_RELEASE_KEY,
    policyVersion: LIVE_ACTION_POLICY_VERSION,
    executors: { ...DEFAULT_EXECUTOR_CONTROLS },
  };
}

export class ExecutorRegistry {
  readonly #executors = new Map<ActionExecutor, ScopedExecutor>();

  constructor(executors: readonly ScopedExecutor[] = []) {
    for (const executor of executors) {
      if (this.#executors.has(executor.executor)) {
        throw new Error("EXECUTOR_DUPLICATE_REGISTRATION");
      }
      for (const capability of executor.capabilities) {
        assertExecutorCapability(executor.executor, capability);
      }
      this.#executors.set(executor.executor, executor);
    }
  }

  has(executor: ActionExecutor) {
    return this.#executors.has(executor);
  }

  async dispatch(
    authorization: ActionAuthorization,
    payload: Record<string, unknown>,
    context: { attemptId: string; providerIdempotencyKey: string },
  ): Promise<ScopedExecutorResult> {
    assertExecutorCapability(authorization.executor, authorization.actionType);
    const scopedExecutor = this.#executors.get(authorization.executor);
    if (!scopedExecutor) {
      return { code: "FAILED", failureCode: "EXECUTOR_NOT_REGISTERED" };
    }
    if (!scopedExecutor.capabilities.includes(authorization.actionType)) {
      return { code: "FAILED", failureCode: "EXECUTOR_CAPABILITY_DENIED" };
    }
    return scopedExecutor.dispatch({ authorization, payload, ...context });
  }
}

export function createDefaultExecutorRegistry() {
  return new ExecutorRegistry();
}
