import { AgentWorkflow } from "agents/workflows";
import type {
  AgentWorkflowEvent,
  AgentWorkflowStep,
} from "agents/workflows";
import type { LiveActionCoordinatorAgent } from "./coordinator-agent";
import {
  EXECUTOR_SERVICE_ACTOR_ID,
  INDEPENDENT_VERIFIER_ACTOR_ID,
} from "./coordinator-agent";
import {
  actionApprovalSchema,
  liveActionWorkflowInputSchema,
  type ActionApproval,
  type LiveActionWorkflowInput,
} from "./contracts";
import {
  createPreparedReceipt,
  transitionExecutionReceipt,
} from "./verifier";

export type LiveActionWorkflowProgress = {
  step: "freeze" | "approval" | "authorize" | "dispatch" | "verify";
  status: "running" | "complete" | "error";
  message: string;
  percent: number;
};

export class LiveActionExecutionWorkflow extends AgentWorkflow<
  LiveActionCoordinatorAgent,
  LiveActionWorkflowInput,
  LiveActionWorkflowProgress
> {
  async run(
    event: AgentWorkflowEvent<LiveActionWorkflowInput>,
    step: AgentWorkflowStep,
  ) {
    const input = liveActionWorkflowInputSchema.parse(event.payload);
    await this.reportProgress({
      step: "freeze",
      status: "running",
      message: "Freezing the exact action scope and payload hash.",
      percent: 0.1,
    });
    const preparation = await step.do("freeze-action-authorization", async () => {
      const remote = await this.agent.validateWorkflowInput(input);
      return {
        authorizationId: remote.authorizationId,
        requiredApprovals: remote.requiredApprovals,
        reversible: remote.reversible,
        executionMode: remote.executionMode,
      };
    });
    if (preparation.executionMode === "shadow") {
      const result = {
        code: "SHADOW_VALIDATED" as const,
        authorizationId: preparation.authorizationId,
        externalActions: 0 as const,
      };
      await this.reportProgress({
        step: "verify",
        status: "complete",
        message: "Shadow validation completed without calling an executor.",
        percent: 1,
      });
      await step.reportComplete(result);
      return result;
    }

    const approvals: ActionApproval[] = [];
    for (let ordinal = 1; ordinal <= preparation.requiredApprovals; ordinal += 1) {
      await this.reportProgress({
        step: "approval",
        status: "running",
        message: `Waiting for approval ${ordinal} of ${preparation.requiredApprovals}.`,
        percent: 0.2,
      });
      const approvalEvent = await step.waitForEvent<ActionApproval>(
        `wait-for-live-action-approval-${ordinal}`,
        {
          type: `live-action-approval-${ordinal}`,
          timeout: "7 days",
        },
      );
      const approval = actionApprovalSchema.parse(approvalEvent.payload);
      if (
        approval.ordinal !== ordinal ||
        approval.authorizationId !== input.authorization.authorizationId ||
        approval.proposalRevision !== input.authorization.proposalRevision ||
        approval.decision !== "approved"
      ) {
        throw new Error("ACTION_APPROVAL_REJECTED");
      }
      approvals.push(approval);
    }

    const approvedAuthorization = {
      ...input.authorization,
      status: "approved" as const,
    };
    const dispatchInput = {
      authorization: approvedAuthorization,
      payload: input.payload,
      approvals,
      verifierActorId: INDEPENDENT_VERIFIER_ACTOR_ID,
      usage: {
        dailyActions: 0,
        monthlyActions: 0,
        dailySpendPaise: 0,
      },
    };
    await this.reportProgress({
      step: "authorize",
      status: "running",
      message:
        "Claiming the database lease and atomically rechecking exact scope, approvals, canary and budgets.",
      percent: 0.45,
    });
    await this.reportProgress({
      step: "dispatch",
      status: "running",
      message:
        "Authorizing immediately before the capability-scoped executor; dispatch has zero retries.",
      percent: 0.65,
    });
    const dispatch = await step.do(
      "database-authorize-and-dispatch-no-retry",
      { retries: { limit: 0, delay: 0 } },
      async () => {
        const remote =
          await this.agent.executeDatabaseAuthorizedAction(dispatchInput);
        const at = new Date().toISOString();
        if (remote.code === "SHADOW_VALIDATED") {
          return {
            code: "SHADOW_VALIDATED" as const,
            authorizationId: remote.authorizationId,
            externalActions: 0 as const,
            at,
          };
        }
        if (remote.code === "DISPATCHED") {
          return {
            code: "DISPATCHED" as const,
            authorizationId: remote.authorizationId,
            attemptId: remote.attemptId,
            providerReceiptSha256: remote.providerReceiptSha256,
            receiptPersisted: true as const,
            at,
          };
        }
        return {
          code: "UNKNOWN" as const,
          authorizationId: remote.authorizationId,
          attemptId: remote.attemptId,
          failureCode: remote.failureCode,
          receiptPersisted: remote.receiptPersisted,
          at,
        };
      },
    );
    if (dispatch.code === "SHADOW_VALIDATED") {
      throw new Error("ACTION_EXECUTION_MODE_CHANGED");
    }
    const at = dispatch.at;
    const preparedReceipt = createPreparedReceipt({
      attemptId: dispatch.attemptId,
      authorization: approvedAuthorization,
      executorActorId: EXECUTOR_SERVICE_ACTOR_ID,
      at,
    });
    const receipt =
      dispatch.code === "DISPATCHED"
        ? transitionExecutionReceipt(
            transitionExecutionReceipt(
              preparedReceipt,
              {
                type: "dispatch_recorded",
                providerReceiptSha256: dispatch.providerReceiptSha256,
                at,
              },
              { reversible: preparation.reversible },
            ),
            {
              type: "dispatch_unknown",
              failureCode: "VERIFIER_NOT_REGISTERED",
              at,
            },
            { reversible: preparation.reversible },
          )
        : transitionExecutionReceipt(
            preparedReceipt,
            {
              type: "dispatch_unknown",
              failureCode: dispatch.failureCode,
              at,
            },
            { reversible: preparation.reversible },
          );
    await this.reportProgress({
      step: "verify",
      status: receipt.state === "failed" ? "error" : "complete",
      message:
        receipt.state === "unknown"
          ? "Outcome requires reconciliation; executor must remain paused."
          : "Execution attempt was recorded without blind retry.",
      percent: 1,
    });
    await step.reportComplete(receipt);
    return receipt;
  }
}
