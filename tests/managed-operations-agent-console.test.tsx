import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ManagedAgentConsole } from "@/features/managed-agents/managed-agent-console";
import { MANAGED_AGENT_DEFINITIONS } from "@/features/managed-agents/contracts";

vi.mock("@/features/managed-agents/actions", () => ({
  manageManagedAgentAction: vi.fn(),
}));

describe("managed operations fleet console", () => {
  const agents = MANAGED_AGENT_DEFINITIONS.map((definition) => ({
    role: definition.role,
    division: definition.division,
    commandAvailable: false,
    displayName: definition.displayName,
    description: definition.description,
    boundary: definition.boundary,
    enabled: false,
    runtimeState: "paused" as const,
    intervalSeconds: definition.defaultIntervalSeconds,
    maxItemsPerRun: definition.defaultMaxItemsPerRun,
    lastRunAt: null,
    lastSuccessAt: null,
    lastFailureAt: null,
    lastFailureCode: null,
    consecutiveFailures: 0,
    runsLast24Hours: 0,
    successesLast24Hours: 0,
    failuresLast24Hours: 0,
  }));

  it("shows all roles and a clear safely-off state", () => {
    render(<ManagedAgentConsole agents={agents} recentRuns={[]} configured={false} />);
    expect(screen.getByText(/fleet is safely off/i)).toBeInTheDocument();
    for (const agent of MANAGED_AGENT_DEFINITIONS) {
      expect(screen.getByRole("heading", { name: agent.displayName })).toBeInTheDocument();
      expect(screen.getByText(agent.boundary)).toBeInTheDocument();
    }
    expect(screen.getAllByRole("button", { name: /resume/i }).every(
      (button) => button.hasAttribute("disabled"),
    )).toBe(true);
  });
});
