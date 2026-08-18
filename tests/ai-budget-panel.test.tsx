import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AiBudgetPanel } from "@/features/ai-budget/budget-panel";
import type { AiFleetBudgetStatus } from "@/features/ai-budget/contracts";

const status: AiFleetBudgetStatus = {
  monthKey: "2026-08",
  fleetBudgetMicros: 10_000_000,
  allocatedBudgetMicros: 10_000_000,
  unallocatedBudgetMicros: 0,
  chargedMicros: 1_250_000,
  remainingMicros: 8_750_000,
  calls: 12,
  failedCalls: 1,
  pendingCalls: 2,
  workstreams: [
    { workstream: "website_greeting", budgetMicros: 5_000_000, chargedMicros: 1_000_000, remainingMicros: 4_000_000, calls: 8, failedCalls: 1, pendingCalls: 0 },
    { workstream: "blog_writing", budgetMicros: 2_000_000, chargedMicros: 200_000, remainingMicros: 1_800_000, calls: 3, failedCalls: 0, pendingCalls: 1 },
    { workstream: "growth_outreach", budgetMicros: 3_000_000, chargedMicros: 50_000, remainingMicros: 2_950_000, calls: 1, failedCalls: 0, pendingCalls: 1 },
    { workstream: "profile_drafting", budgetMicros: 0, chargedMicros: 0, remainingMicros: 0, calls: 0, failedCalls: 0, pendingCalls: 0 },
    { workstream: "customer_support", budgetMicros: 0, chargedMicros: 0, remainingMicros: 0, calls: 0, failedCalls: 0, pendingCalls: 0 },
    { workstream: "social_content", budgetMicros: 0, chargedMicros: 0, remainingMicros: 0, calls: 0, failedCalls: 0, pendingCalls: 0 },
  ],
};

describe("AiBudgetPanel", () => {
  it("renders the fleet ledger, allocations, and billing disclosure", () => {
    render(<AiBudgetPanel dashboard={{ available: true, status }} />);

    expect(screen.getByRole("heading", { name: "AI token and cost ledger" })).toBeInTheDocument();
    expect(screen.getByText("2026-08")).toBeInTheDocument();
    expect(screen.getByText(/\$0\.00 unallocated and unavailable to agents/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Growth outreach + OCR" })).toBeInTheDocument();
    expect(screen.getAllByText("Blocked")).toHaveLength(3);
    expect(screen.getByText(/not the Cloudflare invoice/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Workers AI dashboard/i })).toHaveAttribute("target", "_blank");
    expect(screen.getByRole("link", { name: /Cloudflare billable usage/i })).toHaveAttribute("target", "_blank");
  });

  it("keeps approved caps visible when live ledger status is unavailable", () => {
    render(<AiBudgetPanel dashboard={{ available: false }} />);

    expect(screen.getByRole("status")).toHaveTextContent("Live ledger usage is unavailable");
    expect(screen.getByText("$5.00 cap")).toBeInTheDocument();
    expect(screen.getAllByText("Blocked")).toHaveLength(3);
  });
});
