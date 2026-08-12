import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  flags: new Map<string, boolean>(),
  process: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  isDemoMode: () => false,
  isSupabaseConfigured: () => true,
}));
vi.mock("@/lib/feature-flags", () => ({
  isFeatureEnabled: (name: string) => mocks.flags.get(name) ?? false,
}));
vi.mock("@/features/managed-agents/processor", () => ({
  processManagedAgentRun: mocks.process,
}));

import { POST } from "@/app/api/managed-agents/run/route";

const secret = "m".repeat(48);
const validBody = {
  role: "outreach_growth",
  instanceName: "farmerbook-outreach-growth",
  trigger: "scheduled",
  maxItems: 10,
  idempotencyKey: "00000000-0000-4000-8000-000000000701",
};

function request(body: unknown, bearer = secret) {
  return new Request("https://farmerbook.in/api/managed-agents/run", {
    method: "POST",
    headers: {
      authorization: `Bearer ${bearer}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

describe("private managed-agent processor route", () => {
  beforeEach(() => {
    process.env.MANAGED_AGENT_PROCESSOR_SECRET = secret;
    mocks.flags.clear();
    mocks.flags.set("ENABLE_MANAGED_OPERATIONS_AGENTS", true);
    mocks.flags.set("ENABLE_OUTREACH_AGENT", true);
    mocks.flags.set("ENABLE_PROFILE_RESEARCH_AGENT", true);
    mocks.process.mockReset();
    mocks.process.mockResolvedValue({
      code: "SUCCEEDED",
      runId: "00000000-0000-4000-8000-000000000702",
      claimed: 1,
      succeeded: 1,
      failed: 0,
      summary: { delivered: 1 },
    });
  });

  it("is absent while the fleet flag is disabled", async () => {
    mocks.flags.set("ENABLE_MANAGED_OPERATIONS_AGENTS", false);
    expect((await POST(request(validBody))).status).toBe(404);
    expect(mocks.process).not.toHaveBeenCalled();
  });

  it("rejects missing or incorrect internal bearer credentials", async () => {
    expect((await POST(request(validBody, "incorrect"))).status).toBe(403);
    expect(mocks.process).not.toHaveBeenCalled();
  });

  it("rejects invalid or role-disabled work before processing", async () => {
    expect((await POST(request({ ...validBody, maxItems: 1000 }))).status).toBe(400);
    mocks.flags.set("ENABLE_OUTREACH_AGENT", false);
    expect((await POST(request(validBody))).status).toBe(404);
    expect(mocks.process).not.toHaveBeenCalled();
  });

  it("accepts one bounded authenticated internal run", async () => {
    const response = await POST(request(validBody));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      code: "SUCCEEDED",
      claimed: 1,
    });
    expect(mocks.process).toHaveBeenCalledWith(validBody);
  });
});
