import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ rpc: mocks.rpc, from: mocks.from }),
}));

import { runCompanyAgent } from "@/features/company-agents/processor";

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
  pendingCompanyProposals: 0,
  pendingActionProposals: 0,
  managedRunFailures24h: 0,
};

const objectiveRows = [
  ["00000000-0000-4000-8000-000000001001", "registered_users", "Registered users", 100_000],
  ["00000000-0000-4000-8000-000000001002", "activated_users", "Activated users", 40_000],
  ["00000000-0000-4000-8000-000000001003", "monthly_active_users", "Monthly active users", 25_000],
].map(([id, metric_key, display_name, target_value]) => ({
  id,
  metric_key,
  display_name,
  target_value,
  starts_at: "2026-08-19T00:00:00.000Z",
  deadline_at: "2027-02-15T00:00:00.000Z",
  status: "active",
}));

function objectiveQuery() {
  const query = {
    select: vi.fn(() => query),
    in: vi.fn(() => query),
    order: vi.fn(async () => ({ data: objectiveRows, error: null })),
  };
  return query;
}

describe("AI company managed processor", () => {
  beforeEach(() => {
    mocks.rpc.mockReset();
    mocks.from.mockReset();
    mocks.from.mockReturnValue(objectiveQuery());
    mocks.rpc.mockImplementation(async (name: string) => {
      if (name === "record_ai_company_snapshot") {
        return {
          data: [{
            code: "RECORDED",
            snapshot_id: "00000000-0000-4000-8000-000000001011",
            metrics,
          }],
          error: null,
        };
      }
      if (name === "record_ai_company_proposal") {
        return {
          data: [{
            code: "RECORDED",
            proposal_id: "00000000-0000-4000-8000-000000001012",
            state: "pending",
            revision: 0,
          }],
          error: null,
        };
      }
      return { data: null, error: { details: "UNEXPECTED_RPC" } };
    });
  });

  it("records one aggregate snapshot and one pending proposal without model or external work", async () => {
    const result = await runCompanyAgent(
      "executive_strategy",
      "00000000-0000-4000-8000-000000001010",
    );
    expect(result).toEqual({
      claimed: 1,
      succeeded: 1,
      failed: 0,
      summary: {
        proposalsPendingReview: 1,
        aggregateSnapshotRecorded: true,
        policyVersion: "company-policy-v1",
        externalActionsExecuted: 0,
        modelCalls: 0,
      },
    });
    expect(mocks.rpc).toHaveBeenNthCalledWith(
      1,
      "record_ai_company_snapshot",
      expect.objectContaining({
        run_id_input: "00000000-0000-4000-8000-000000001010",
      }),
    );
    expect(mocks.rpc).toHaveBeenNthCalledWith(
      2,
      "record_ai_company_proposal",
      expect.objectContaining({
        risk_level_input: "medium",
        evidence_input: expect.objectContaining({ registeredUsers: 100 }),
      }),
    );
  });

  it("fails closed before proposal creation when the snapshot cannot be recorded", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { details: "FEATURE_DISABLED" } });
    await expect(runCompanyAgent(
      "growth_strategy",
      "00000000-0000-4000-8000-000000001013",
    )).rejects.toThrow("COMPANY_SNAPSHOT_FAILED");
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
