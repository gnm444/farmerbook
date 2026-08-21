import { describe, expect, it } from "vitest";
import {
  COMPANY_AGENT_ROLES,
  type CompanyAgentRole,
} from "@/features/managed-agents/contracts";
import type {
  CompanyMetrics,
  CompanyObjective,
} from "@/features/company-agents/contracts";
import { assertCompanyAgentRoleLock } from "@/features/company-agents/contracts";
import { buildCompanyProposal } from "@/features/company-agents/policy";

const now = new Date("2026-08-19T00:00:00.000Z");
const metrics: CompanyMetrics = {
  capturedAt: now.toISOString(),
  registeredUsers: 1_000,
  activatedUsers: 350,
  monthlyActiveUsers: 220,
  registeredFarmers: 650,
  registeredBuyers: 250,
  registeredWholesalers: 75,
  registeredAgriBusinesses: 25,
  activePosts: 120,
  activeListings: 80,
  activeListingsWithoutEnquiries: 50,
  marketEnquiries: 42,
  wonMarketEnquiries: 5,
  openSupportCases: 8,
  technicalSupportCases: 3,
  pendingReports: 4,
  pendingCompanyProposals: 6,
  pendingActionProposals: 2,
  managedRunFailures24h: 1,
};
const objectives: CompanyObjective[] = [
  {
    id: "00000000-0000-4000-8000-000000001001",
    metricKey: "registered_users",
    displayName: "Registered users",
    targetValue: 100_000,
    startsAt: now.toISOString(),
    deadlineAt: "2027-02-15T00:00:00.000Z",
    status: "active",
  },
  {
    id: "00000000-0000-4000-8000-000000001002",
    metricKey: "activated_users",
    displayName: "Activated users",
    targetValue: 40_000,
    startsAt: now.toISOString(),
    deadlineAt: "2027-02-15T00:00:00.000Z",
    status: "active",
  },
  {
    id: "00000000-0000-4000-8000-000000001003",
    metricKey: "monthly_active_users",
    displayName: "Monthly active users",
    targetValue: 25_000,
    startsAt: now.toISOString(),
    deadlineAt: "2027-02-15T00:00:00.000Z",
    status: "active",
  },
];

describe("AI company deterministic policy", () => {
  it("creates one bounded aggregate-only proposal for every company role", () => {
    const outputs = COMPANY_AGENT_ROLES.map((role) => buildCompanyProposal({
      role,
      metrics,
      objectives,
      now,
    }));
    expect(outputs).toHaveLength(15);
    expect(new Set(outputs.map((output) => output.actionKind)).size).toBe(15);
    for (const output of outputs) {
      expect(output.title.length).toBeGreaterThanOrEqual(5);
      expect(output.summary.length).toBeGreaterThanOrEqual(20);
      expect(output.summary).not.toMatch(/@|\+91|phone|email address/i);
      for (const [key, value] of Object.entries(output.evidence)) {
        expect(metrics).toHaveProperty(key, value);
      }
    }
  });

  it("handles zero denominators and an expired deadline without NaN or Infinity", () => {
    const zeroMetrics = Object.fromEntries(
      Object.entries(metrics).map(([key, value]) => [
        key,
        key === "capturedAt" ? value : 0,
      ]),
    ) as CompanyMetrics;
    const expired = objectives.map((item) => ({
      ...item,
      deadlineAt: "2026-08-18T00:00:00.000Z",
    }));
    for (const role of COMPANY_AGENT_ROLES) {
      const output = buildCompanyProposal({
        role,
        metrics: zeroMetrics,
        objectives: expired,
        now,
      });
      expect(output.summary).not.toMatch(/NaN|Infinity/);
    }
  });

  it("raises urgency for reliability and trust pressure", () => {
    expect(buildCompanyProposal({
      role: "qa_reliability",
      metrics: { ...metrics, managedRunFailures24h: 3 },
      objectives,
      now,
    }).priority).toBe("critical");
    expect(buildCompanyProposal({
      role: "governance_risk",
      metrics: { ...metrics, pendingReports: 25 },
      objectives,
      now,
    }).priority).toBe("critical");
  });

  it("locks one shared Durable Object instance to its first role", () => {
    expect(() => assertCompanyAgentRoleLock(null, "executive_strategy")).not.toThrow();
    expect(() => assertCompanyAgentRoleLock(
      "executive_strategy",
      "executive_strategy",
    )).not.toThrow();
    expect(() => assertCompanyAgentRoleLock(
      "executive_strategy",
      "growth_strategy" as CompanyAgentRole,
    )).toThrow("MANAGED_AGENT_ROLE_CONFLICT");
  });
});
