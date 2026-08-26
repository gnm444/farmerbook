import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Cloudflare managed operations fleet configuration", () => {
  const vite = readFileSync("vite.config.ts", "utf8");
  const worker = readFileSync("worker/index.ts", "utf8");
  const environment = readFileSync(".env.example", "utf8");
  const runtime = readFileSync("features/managed-agents/runtime.ts", "utf8");
  const processorRoute = readFileSync("app/api/managed-agents/run/route.ts", "utf8");

  it("preserves six specialized classes and adds one shared company class", () => {
    for (const name of [
      "OutreachGrowthAgent",
      "ProfileDraftingAgent",
      "VerificationTriageAgent",
      "CustomerSupportAgent",
      "SocialContentAgent",
      "OperationsSupervisorAgent",
      "CompanyOperationsAgent",
      "LiveActionCoordinatorAgent",
    ]) {
      expect(vite).toContain(`class_name: "${name}"`);
      expect(vite).toContain(`"${name}"`);
      expect(worker).toContain(name);
    }
    expect(vite).toContain('tag: "farmer-profile-agent-v1"');
    expect(vite).toContain('tag: "managed-operations-agents-v1"');
    expect(vite).toContain('tag: "support-social-agents-v1"');
    expect(vite).toContain('tag: "ai-company-agent-v1"');
    expect(vite).toContain('tag: "live-action-coordinator-agent-v1"');
    expect(vite).toContain('binding: "LIVE_ACTION_EXECUTION_WORKFLOW"');
    expect(vite).toContain('class_name: "LiveActionExecutionWorkflow"');
    expect(environment).toContain("ENABLE_AI_COMPANY=false");
    expect(environment).toContain("ENABLE_LIVE_AGENT_EXECUTION=false");
    expect(vite).toContain("ENABLE_LIVE_AGENT_EXECUTION");
  });

  it("keeps the Agent fleet private and the processor bearer server-side", () => {
    expect(worker).not.toContain("routeAgentRequest");
    expect(environment).toContain("MANAGED_AGENT_PROCESSOR_SECRET=");
    expect(environment).toContain("ENABLE_MANAGED_OPERATIONS_AGENTS=false");
    expect(environment).toContain("ENABLE_SUPPORT_SOCIAL_PILOT=false");
    expect(vite).not.toContain("process.env.MANAGED_AGENT_PROCESSOR_SECRET");
    expect(processorRoute).toContain("constantTimeEqual(provided, expected)");
    expect(processorRoute).toContain("expected.length < 32");
  });

  it("uses idempotent recurring schedules and pauses after three failures", () => {
    expect(runtime).toContain("this.scheduleEvery(");
    expect(runtime).toContain("await this.listSchedules()");
    expect(runtime).toContain("failures >= 3");
    expect(runtime).toContain("await this.clearSchedules()");
  });
});
