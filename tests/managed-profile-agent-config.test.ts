import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Cloudflare managed profile agent configuration", () => {
  const vite = readFileSync("vite.config.ts", "utf8");
  const worker = readFileSync("worker/index.ts", "utf8");
  const environment = readFileSync(".env.example", "utf8");

  it("configures a SQLite Agent, additive migration, Workflow and AI binding", () => {
    expect(vite).toContain('import agents from "agents/vite"');
    expect(vite).toContain("agents()");
    expect(vite).toContain('name: "FARMER_PROFILE_AGENT"');
    expect(vite).toContain('new_sqlite_classes: ["FarmerProfileAgent"]');
    expect(vite).toContain('binding: "FARMER_PROFILE_APPROVAL_WORKFLOW"');
    expect(vite).toContain('ai: { binding: "AI" }');
    expect(worker).toContain("export { FarmerProfileAgent }");
    expect(worker).toContain("export { FarmerProfileApprovalWorkflow }");
  });

  it("exports both Worker entrypoint classes without exposing a public agent route", () => {
    expect(worker).toContain("FarmerProfileAgent");
    expect(worker).toContain("FarmerProfileApprovalWorkflow");
    expect(worker).not.toContain("routeAgentRequest");
  });

  it("keeps the Brave token server-side and requires an explicit storage-rights gate", () => {
    expect(environment).toContain("BRAVE_SEARCH_API_KEY=");
    expect(environment).toContain("BRAVE_SEARCH_STORAGE_RIGHTS_CONFIRMED=false");
    expect(vite).not.toContain("BRAVE_SEARCH_API_KEY");
    expect(vite).toContain("BRAVE_SEARCH_STORAGE_RIGHTS_CONFIRMED");
  });
});
