import { describe, expect, it } from "vitest";
import {
  COMPANY_AGENT_ROLES,
  MANAGED_AGENT_DEFINITIONS,
  SPECIALIZED_AGENT_ROLES,
  managedAgentCommandSchema,
  managedAgentRunRequestSchema,
} from "@/features/managed-agents/contracts";
import { verificationTriageDecision } from "@/features/managed-agents/processor";

describe("managed operations agent contracts", () => {
  it("defines six specialized and fifteen company roles", () => {
    expect(MANAGED_AGENT_DEFINITIONS.map((agent) => agent.role)).toEqual([
      ...SPECIALIZED_AGENT_ROLES,
      ...COMPANY_AGENT_ROLES,
    ]);
    expect(COMPANY_AGENT_ROLES).toHaveLength(15);
    expect(MANAGED_AGENT_DEFINITIONS.filter(
      (agent) => agent.division === "specialized_operations",
    )).toHaveLength(6);
    expect(MANAGED_AGENT_DEFINITIONS.filter(
      (agent) => agent.division === "company",
    )).toHaveLength(15);
    expect(MANAGED_AGENT_DEFINITIONS.every((agent) => agent.boundary.length > 40)).toBe(true);
  });

  it("bounds schedules, batches, instances and idempotency keys", () => {
    expect(() => managedAgentCommandSchema.parse({
      role: "outreach_growth",
      operation: "resume",
      intervalSeconds: 299,
      maxItemsPerRun: 10,
      reason: "Approved staging initialization.",
      idempotencyKey: crypto.randomUUID(),
    })).toThrow();
    expect(() => managedAgentRunRequestSchema.parse({
      role: "outreach_growth",
      instanceName: "FarmerBook/unsafe",
      trigger: "scheduled",
      maxItems: 10,
      idempotencyKey: crypto.randomUUID(),
    })).toThrow();
  });

  it("never treats missing provider evidence as verified", () => {
    expect(verificationTriageDecision({
      method: "government_kyc",
      providerReceiptId: null,
      expiresAt: null,
    })).toEqual({
      recommendation: "awaiting_provider_receipt",
      riskLevel: "medium",
      reasonCodes: ["PROVIDER_RECEIPT_MISSING"],
    });
  });

  it("routes community and interview evidence to a person", () => {
    expect(verificationTriageDecision({
      method: "community_vouch",
      providerReceiptId: null,
      expiresAt: null,
    }).recommendation).toBe("manual_review_required");
  });

  it("rejects expired and unknown verification evidence", () => {
    expect(verificationTriageDecision({
      method: "social_oauth",
      providerReceiptId: "receipt-1",
      expiresAt: "2020-01-01T00:00:00.000Z",
    }).recommendation).toBe("reject_incomplete_evidence");
    expect(verificationTriageDecision({
      method: "follower_count",
      providerReceiptId: "many-followers",
      expiresAt: null,
    }).reasonCodes).toEqual(["UNSUPPORTED_METHOD"]);
  });
});
