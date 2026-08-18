import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("private AI fleet budget Agent configuration", () => {
  const vite = readFileSync("vite.config.ts", "utf8");
  const worker = readFileSync("worker/index.ts", "utf8");
  const agent = readFileSync("features/ai-budget/agent.ts", "utf8");

  it("uses a forward-only private SQLite Durable Object binding", () => {
    expect(vite).toContain('name: "AI_FLEET_BUDGET_AGENT"');
    expect(vite).toContain('class_name: "AiFleetBudgetAgent"');
    expect(vite).toContain('tag: "ai-fleet-budget-agent-v1"');
    expect(vite).toContain('new_sqlite_classes: ["AiFleetBudgetAgent"]');
    expect(vite.indexOf('tag: "ai-fleet-budget-agent-v1"')).toBeGreaterThan(
      vite.indexOf('tag: "blog-writing-agent-v1"'),
    );
    expect(worker).toContain('export { AiFleetBudgetAgent }');
    expect(worker).not.toContain("routeAgentRequest");
  });

  it("stores only bounded spend metadata", () => {
    expect(agent).toContain("ai_fleet_reservations");
    expect(agent).toContain("charged_micros");
    expect(agent).toContain("estimated_input_tokens");
    expect(agent).not.toMatch(/prompt_text|message_text|support_question|model_output/);
    expect(agent).not.toMatch(/DELETE FROM ai_fleet_reservations\s+WHERE id/);
  });

  it("leaves no feature-level raw Workers AI bypass", () => {
    const files = [
      "features/website-greeter/agent.ts",
      "features/blog/agent.ts",
      "features/outreach/agent.ts",
      "features/outreach/ocr.ts",
      "features/profile-agent/profile-builder.ts",
      "features/customer-operations/ai.ts",
    ];
    for (const file of files) {
      expect(readFileSync(file, "utf8"), file).not.toMatch(
        /\.AI\.run|\bai\.run|runtime\.ai\.run/,
      );
    }
    expect(readFileSync("features/ai-budget/inference.ts", "utf8"))
      .toContain("runtime.ai.run");
  });
});
