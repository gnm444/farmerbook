import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Cloudflare managed operations fleet configuration", () => {
  const vite = readFileSync("vite.config.ts", "utf8");
  const worker = readFileSync("worker/index.ts", "utf8");
  const environment = readFileSync(".env.example", "utf8");
  const runtime = readFileSync("features/managed-agents/runtime.ts", "utf8");
  const processorRoute = readFileSync("app/api/managed-agents/run/route.ts", "utf8");

  it("adds six named SQLite classes through additive migrations", () => {
    for (const name of [
      "OutreachGrowthAgent",
      "ProfileDraftingAgent",
      "VerificationTriageAgent",
      "CustomerSupportAgent",
      "SocialContentAgent",
      "OperationsSupervisorAgent",
    ]) {
      expect(vite).toContain(`class_name: "${name}"`);
      expect(vite).toContain(`"${name}"`);
      expect(worker).toContain(name);
    }
    expect(vite).toContain('tag: "farmer-profile-agent-v1"');
    expect(vite).toContain('tag: "managed-operations-agents-v1"');
    expect(vite).toContain('tag: "support-social-agents-v1"');
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
