import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AiFleetBudgetAgent } from "@/features/ai-budget/agent";
import { aiFleetBudgetAgentStub } from "@/features/ai-budget/runtime";

const { getAgentByNameMock } = vi.hoisted(() => ({
  getAgentByNameMock: vi.fn(),
}));

vi.mock("agents", () => ({
  getAgentByName: getAgentByNameMock,
}));

describe("AI fleet budget Agent runtime", () => {
  beforeEach(() => {
    getAgentByNameMock.mockReset();
  });

  it("awaits the Agents SDK named-instance initializer before RPC", async () => {
    const namespace = {} as DurableObjectNamespace<AiFleetBudgetAgent>;
    const service = { reserve: vi.fn(), settle: vi.fn(), status: vi.fn() };
    getAgentByNameMock.mockResolvedValue(service);

    await expect(aiFleetBudgetAgentStub({
      AI_FLEET_BUDGET_AGENT: namespace,
    })).resolves.toBe(service);
    expect(getAgentByNameMock).toHaveBeenCalledOnce();
    expect(getAgentByNameMock).toHaveBeenCalledWith(
      namespace,
      "farmerbook-ai-fleet-budget",
    );
  });

  it("returns null without a configured private binding", async () => {
    await expect(aiFleetBudgetAgentStub(null)).resolves.toBeNull();
    await expect(aiFleetBudgetAgentStub({})).resolves.toBeNull();
    expect(getAgentByNameMock).not.toHaveBeenCalled();
  });
});
