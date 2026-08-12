import { AgentWorkflow } from "agents/workflows";
import type {
  AgentWorkflowEvent,
  AgentWorkflowStep,
} from "agents/workflows";
import type { FarmerProfileAgent } from "./managed-agent";
import {
  approvalWorkflowInputSchema,
  type ApprovalWorkflowInput,
} from "./schemas";

export class FarmerProfileApprovalWorkflow extends AgentWorkflow<
  FarmerProfileAgent,
  ApprovalWorkflowInput
> {
  async run(
    event: AgentWorkflowEvent<ApprovalWorkflowInput>,
    step: AgentWorkflowStep,
  ) {
    const input = approvalWorkflowInputSchema.parse(event.payload);
    await this.reportProgress({
      step: "farmer-approval",
      status: "running",
      message: "Waiting for the farmer to approve or reject the private sample.",
      percent: 0.5,
    });
    await this.waitForApproval(step, {
      timeout: "14 days",
      stepName: "wait-for-farmer-approval",
    });
    await step.do("record-farmer-approval", async () => {
      await this.agent.markApproved(input.sampleId);
      return { sampleId: input.sampleId, approved: true };
    });
    const result = { sampleId: input.sampleId, approved: true };
    await step.reportComplete(result);
    return result;
  }
}
