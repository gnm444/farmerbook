import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CompanyCommandCenter } from "@/features/company-agents/company-command-center";
import { DEFAULT_COMPANY_OBJECTIVES } from "@/features/company-agents/queries";

const review = vi.fn();
vi.mock("@/features/company-agents/actions", () => ({
  reviewAiCompanyProposalAction: (...args: unknown[]) => review(...args),
}));

const metrics = {
  capturedAt: "2026-08-19T00:00:00.000Z",
  registeredUsers: 100,
  activatedUsers: 40,
  monthlyActiveUsers: 25,
  registeredFarmers: 60,
  registeredBuyers: 25,
  registeredWholesalers: 10,
  registeredAgriBusinesses: 5,
  activePosts: 20,
  activeListings: 10,
  activeListingsWithoutEnquiries: 5,
  marketEnquiries: 8,
  wonMarketEnquiries: 2,
  openSupportCases: 1,
  technicalSupportCases: 0,
  pendingReports: 0,
  pendingCompanyProposals: 1,
  pendingActionProposals: 0,
  managedRunFailures24h: 0,
};

const proposal = {
  id: "00000000-0000-4000-8000-000000001020",
  role: "executive_strategy" as const,
  title: "Set the next company-wide growth focus",
  summary: "Review the aggregate registration and activation gap for the next operating cycle.",
  actionKind: "strategic_focus",
  priority: "high" as const,
  riskLevel: "medium" as const,
  evidence: { registeredUsers: 100, activatedUsers: 40 },
  state: "pending" as const,
  revision: 0,
  reviewerReason: null,
  createdAt: "2026-08-19T00:00:00.000Z",
  reviewedAt: null,
};

describe("AI company command center", () => {
  it("shows the safely-off objectives with disabled review controls", () => {
    render(<CompanyCommandCenter
      configured={false}
      objectives={DEFAULT_COMPANY_OBJECTIVES}
      metrics={null}
      proposals={[proposal]}
    />);
    expect(screen.getByText(/AI company is safely off/i)).toBeInTheDocument();
    expect(screen.getByText("1,00,000", { exact: false })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /approve for backlog/i })).toBeDisabled();
    expect(screen.getByText(/never executes an external action/i)).toBeInTheDocument();
  });

  it("shows aggregate metrics and submits a review-only decision", async () => {
    review.mockResolvedValue({ ok: false, message: "Recorded test decision." });
    render(<CompanyCommandCenter
      configured
      objectives={DEFAULT_COMPANY_OBJECTIVES}
      metrics={metrics}
      proposals={[proposal]}
    />);
    expect(screen.getByText(/product-event proxy/i)).toBeInTheDocument();
    expect(screen.getByText("Listings without enquiries")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /approve for backlog/i }));
    expect(await screen.findByText("Recorded test decision.")).toBeInTheDocument();
    expect(review).toHaveBeenCalledWith(expect.objectContaining({
      proposalId: proposal.id,
      decision: "approved",
      expectedRevision: 0,
    }));
  });
});
