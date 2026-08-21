import { Agent, type AgentContext } from "agents";
import { z } from "zod";
import {
  actionApprovalSchema,
  coordinatorStateSchema,
  liveActionWorkflowInputSchema,
  type LiveActionCoordinatorState,
  type LiveActionWorkflowInput,
} from "./contracts";
import { dispatchAuthorizationInputSchema } from "./authorizer";
import {
  executeDatabaseAuthorizedAction as executeDatabaseAuthorizedActionWithGateway,
} from "./database-execution";
import {
  createLiveActionDatabaseGateway,
  liveActionDatabaseConfigurationFromEnv,
} from "./database-gateway";
import { createDefaultExecutorRegistry } from "./executors";
import { actionPayloadMatchesHash } from "./hashing";
import { assertAuthorizationMatchesPolicy } from "./policy";

export const LIVE_ACTION_EXECUTION_WORKFLOW_BINDING =
  "LIVE_ACTION_EXECUTION_WORKFLOW" as const;
export const LIVE_ACTION_COORDINATOR_AGENT_BINDING =
  "LIVE_ACTION_COORDINATOR_AGENT" as const;

export const EXECUTOR_SERVICE_ACTOR_ID =
  "00000000-0000-4000-8000-00000000e001" as const;
export const INDEPENDENT_VERIFIER_ACTOR_ID =
  "00000000-0000-4000-8000-00000000a001" as const;

export interface LiveActionCoordinatorEnv extends Cloudflare.Env {
  ENABLE_LIVE_AGENT_EXECUTION?: string;
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
  LIVE_ACTION_COORDINATOR_AGENT: DurableObjectNamespace<LiveActionCoordinatorAgent>;
  LIVE_ACTION_EXECUTION_WORKFLOW: Workflow<LiveActionWorkflowInput>;
}

const approvalSubmissionSchema = z
  .object({
    workflowId: z.string().min(1).max(200),
    approval: actionApprovalSchema,
  })
  .strict();

export class LiveActionCoordinatorAgent extends Agent<
  LiveActionCoordinatorEnv,
  LiveActionCoordinatorState
> {
  private readonly bindings: LiveActionCoordinatorEnv;
  private readonly executorRegistry = createDefaultExecutorRegistry();

  constructor(ctx: AgentContext, env: LiveActionCoordinatorEnv) {
    super(ctx, env);
    this.bindings = env;
  }

  initialState: LiveActionCoordinatorState = {
    authorizationId: null,
    workflowId: null,
    executor: null,
    payloadSha256: null,
    status: "idle",
    lastFailureCode: null,
    updatedAt: new Date(0).toISOString(),
  };

  validateStateChange(nextState: LiveActionCoordinatorState) {
    coordinatorStateSchema.parse(nextState);
  }

  async beginExecution(rawInput: unknown) {
    const input = liveActionWorkflowInputSchema.parse(rawInput);
    assertAuthorizationMatchesPolicy(input.authorization);
    if (
      !(await actionPayloadMatchesHash(
        input.payload,
        input.authorization.payloadSha256,
      ))
    ) {
      throw new Error("ACTION_PAYLOAD_MISMATCH");
    }
    if (
      input.authorization.executionMode === "live" &&
      this.bindings.ENABLE_LIVE_AGENT_EXECUTION !== "true"
    ) {
      this.setState({
        ...this.state,
        authorizationId: input.authorization.authorizationId,
        executor: input.authorization.executor,
        payloadSha256: input.authorization.payloadSha256,
        status: "paused",
        lastFailureCode: "ACTION_RELEASE_DISABLED",
        updatedAt: new Date().toISOString(),
      });
      throw new Error("ACTION_RELEASE_DISABLED");
    }
    if (
      this.state.workflowId &&
      this.state.authorizationId === input.authorization.authorizationId &&
      this.state.payloadSha256 === input.authorization.payloadSha256
    ) {
      return { workflowId: this.state.workflowId, code: "IDEMPOTENT_REPLAY" };
    }
    if (this.state.workflowId) throw new Error("COORDINATOR_ACTION_CONFLICT");
    const workflowId = await this.runWorkflow(
      LIVE_ACTION_EXECUTION_WORKFLOW_BINDING,
      input,
      {
        id: input.authorization.authorizationId,
        agentBinding: LIVE_ACTION_COORDINATOR_AGENT_BINDING,
        metadata: {
          authorizationId: input.authorization.authorizationId,
          executor: input.authorization.executor,
          executionMode: input.authorization.executionMode,
        },
      },
    );
    this.setState({
      ...this.state,
      authorizationId: input.authorization.authorizationId,
      workflowId,
      executor: input.authorization.executor,
      payloadSha256: input.authorization.payloadSha256,
      status:
        input.authorization.requiredApprovals > 0
          ? "approval_pending"
          : "authorizing",
      lastFailureCode: null,
      updatedAt: new Date().toISOString(),
    });
    return { workflowId, code: "STARTED" };
  }

  async submitApproval(rawInput: unknown) {
    const input = approvalSubmissionSchema.parse(rawInput);
    if (
      input.workflowId !== this.state.workflowId ||
      input.approval.authorizationId !== this.state.authorizationId
    ) {
      throw new Error("COORDINATOR_ACTION_CONFLICT");
    }
    await this.sendWorkflowEvent(
      LIVE_ACTION_EXECUTION_WORKFLOW_BINDING,
      input.workflowId,
      {
        type: `live-action-approval-${input.approval.ordinal}`,
        payload: input.approval,
      },
    );
    return { code: "APPROVAL_SUBMITTED" as const };
  }

  async validateWorkflowInput(rawInput: unknown) {
    const input = liveActionWorkflowInputSchema.parse(rawInput);
    const rule = assertAuthorizationMatchesPolicy(input.authorization);
    if (
      !(await actionPayloadMatchesHash(
        input.payload,
        input.authorization.payloadSha256,
      ))
    ) {
      throw new Error("ACTION_PAYLOAD_MISMATCH");
    }
    return {
      authorizationId: input.authorization.authorizationId,
      requiredApprovals: rule.requiredApprovals,
      reversible: rule.reversible,
      executionMode: input.authorization.executionMode,
    };
  }

  async executeDatabaseAuthorizedAction(rawInput: unknown) {
    const input = dispatchAuthorizationInputSchema.parse(rawInput);
    return executeDatabaseAuthorizedActionWithGateway(input, {
      executionEnabled: () =>
        this.bindings.ENABLE_LIVE_AGENT_EXECUTION === "true",
      getGateway: () =>
        createLiveActionDatabaseGateway(
          liveActionDatabaseConfigurationFromEnv(this.bindings),
        ),
      executorRegistry: this.executorRegistry,
    });
  }

  async onWorkflowComplete(
    _workflowName: string,
    workflowId: string,
    result?: unknown,
  ) {
    if (workflowId !== this.state.workflowId) return;
    const shadowValidated =
      typeof result === "object" &&
      result !== null &&
      "code" in result &&
      result.code === "SHADOW_VALIDATED";
    const resultState =
      typeof result === "object" && result !== null && "state" in result
        ? result.state
        : null;
    this.setState({
      ...this.state,
      status: shadowValidated
        ? "shadow_validated"
        : resultState === "verified"
          ? "verified"
          : resultState === "unknown" || resultState === "failed"
            ? "paused"
            : "verification_pending",
      lastFailureCode:
        resultState === "unknown" || resultState === "failed"
          ? "ACTION_RECONCILIATION_REQUIRED"
          : null,
      updatedAt: new Date().toISOString(),
    });
  }

  async onWorkflowError(
    _workflowName: string,
    workflowId: string,
    error: string,
  ) {
    if (workflowId !== this.state.workflowId) return;
    const failureCode = error.match(/[A-Z][A-Z0-9_]{2,80}/)?.[0] ??
      "ACTION_WORKFLOW_FAILED";
    this.setState({
      ...this.state,
      status: /DISABLED|UNKNOWN|MISMATCH|DENIED|EXPIRED/.test(failureCode)
        ? "paused"
        : "failed",
      lastFailureCode: failureCode,
      updatedAt: new Date().toISOString(),
    });
  }
}
