import { Agent, type AgentContext } from "agents";
import type { WorkersAiBinding } from "@/lib/cloudflare-bindings";
import { buildManagedFarmerProfileSample } from "./profile-builder";
import {
  approvalWorkflowInputSchema,
  managedProfileAgentInputSchema,
  type ApprovalWorkflowInput,
} from "./schemas";

export type FarmerProfileAgentState = {
  sampleId: string | null;
  workflowId: string | null;
  status:
    | "idle"
    | "generating"
    | "draft_ready"
    | "approval_pending"
    | "approved"
    | "rejected"
    | "expired"
    | "failed";
  sampleFingerprint: string | null;
  updatedAt: string;
  lastFailureCode: string | null;
};

export interface FarmerProfileAgentEnv extends Cloudflare.Env {
  AI?: WorkersAiBinding;
  FARMER_PROFILE_AGENT: DurableObjectNamespace<FarmerProfileAgent>;
  FARMER_PROFILE_APPROVAL_WORKFLOW: Workflow<ApprovalWorkflowInput>;
}

export class FarmerProfileAgent extends Agent<
  FarmerProfileAgentEnv,
  FarmerProfileAgentState
> {
  private readonly bindings: FarmerProfileAgentEnv;

  constructor(ctx: AgentContext, env: FarmerProfileAgentEnv) {
    super(ctx, env);
    this.bindings = env;
  }

  initialState: FarmerProfileAgentState = {
    sampleId: null,
    workflowId: null,
    status: "idle",
    sampleFingerprint: null,
    updatedAt: new Date(0).toISOString(),
    lastFailureCode: null,
  };

  async generateSample(rawInput: unknown) {
    const input = managedProfileAgentInputSchema.parse(rawInput);
    this.setState({
      ...this.state,
      sampleId: input.sampleId,
      status: "generating",
      updatedAt: new Date().toISOString(),
      lastFailureCode: null,
    });
    try {
      const result = await buildManagedFarmerProfileSample(
        input,
        this.bindings.AI,
      );
      this.setState({
        ...this.state,
        sampleId: input.sampleId,
        status: "draft_ready",
        updatedAt: new Date().toISOString(),
        lastFailureCode: result.run.failureCode,
      });
      return result;
    } catch {
      this.setState({
        ...this.state,
        status: "failed",
        updatedAt: new Date().toISOString(),
        lastFailureCode: "PROFILE_GENERATION_FAILED",
      });
      throw new Error("PROFILE_GENERATION_FAILED");
    }
  }

  async beginApproval(rawInput: unknown) {
    const input = approvalWorkflowInputSchema.parse(rawInput);
    if (this.state.sampleId && this.state.sampleId !== input.sampleId) {
      throw new Error("AGENT_SAMPLE_CONFLICT");
    }
    if (
      this.state.workflowId &&
      this.state.sampleFingerprint === input.sampleFingerprint
    ) {
      return { workflowId: this.state.workflowId, code: "IDEMPOTENT_REPLAY" };
    }
    const workflowId = await this.runWorkflow(
      "FARMER_PROFILE_APPROVAL_WORKFLOW",
      input,
      {
        id: input.sampleId,
        agentBinding: "FARMER_PROFILE_AGENT",
        metadata: { sampleId: input.sampleId },
      },
    );
    this.setState({
      ...this.state,
      sampleId: input.sampleId,
      workflowId,
      status: "approval_pending",
      sampleFingerprint: input.sampleFingerprint,
      updatedAt: new Date().toISOString(),
      lastFailureCode: null,
    });
    return { workflowId, code: "STARTED" };
  }

  async approveSample(input: { sampleId: string; workflowId: string }) {
    if (
      this.state.sampleId !== input.sampleId ||
      this.state.workflowId !== input.workflowId
    ) {
      throw new Error("AGENT_SAMPLE_CONFLICT");
    }
    await this.approveWorkflow(input.workflowId, {
      reason: "The invitation holder approved the private sample profile.",
      metadata: { sampleId: input.sampleId },
    });
  }

  async rejectSample(input: { sampleId: string; workflowId: string }) {
    if (
      this.state.sampleId !== input.sampleId ||
      this.state.workflowId !== input.workflowId
    ) {
      throw new Error("AGENT_SAMPLE_CONFLICT");
    }
    await this.rejectWorkflow(input.workflowId, {
      reason: "The invitation holder rejected the private sample profile.",
    });
    this.setState({
      ...this.state,
      status: "rejected",
      updatedAt: new Date().toISOString(),
    });
  }

  async markApproved(sampleId: string) {
    if (this.state.sampleId !== sampleId) {
      throw new Error("AGENT_SAMPLE_CONFLICT");
    }
    this.setState({
      ...this.state,
      status: "approved",
      updatedAt: new Date().toISOString(),
    });
  }

  async onWorkflowError(
    _workflowName: string,
    workflowId: string,
    error: string,
  ) {
    if (workflowId !== this.state.workflowId) return;
    const rejected = /reject/i.test(error);
    this.setState({
      ...this.state,
      status: rejected ? "rejected" : "expired",
      updatedAt: new Date().toISOString(),
      lastFailureCode: rejected ? null : "APPROVAL_EXPIRED",
    });
  }
}
