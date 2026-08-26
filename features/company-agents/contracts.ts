import { z } from "zod";
import {
  managedAgentRoleSchema,
  type CompanyAgentRole,
} from "@/features/managed-agents/contracts";

export function assertCompanyAgentRoleLock(
  currentRole: CompanyAgentRole | null,
  requestedRole: CompanyAgentRole,
) {
  if (currentRole && currentRole !== requestedRole) {
    throw new Error("MANAGED_AGENT_ROLE_CONFLICT");
  }
}

const aggregateCountSchema = z.number().int().nonnegative().max(100_000_000);

export const companyMetricsSchema = z.object({
  capturedAt: z.iso.datetime({ offset: true }),
  registeredUsers: aggregateCountSchema,
  activatedUsers: aggregateCountSchema,
  monthlyActiveUsers: aggregateCountSchema,
  registeredFarmers: aggregateCountSchema,
  registeredBuyers: aggregateCountSchema,
  registeredWholesalers: aggregateCountSchema,
  registeredAgriBusinesses: aggregateCountSchema,
  activePosts: aggregateCountSchema,
  activeListings: aggregateCountSchema,
  activeListingsWithoutEnquiries: aggregateCountSchema,
  marketEnquiries: aggregateCountSchema,
  wonMarketEnquiries: aggregateCountSchema,
  openSupportCases: aggregateCountSchema,
  technicalSupportCases: aggregateCountSchema,
  pendingReports: aggregateCountSchema,
  pendingCompanyProposals: aggregateCountSchema,
  pendingActionProposals: aggregateCountSchema,
  managedRunFailures24h: aggregateCountSchema,
});

export type CompanyMetrics = z.infer<typeof companyMetricsSchema>;

export const companyObjectiveMetricSchema = z.enum([
  "registered_users",
  "activated_users",
  "monthly_active_users",
]);

export type CompanyObjectiveMetric = z.infer<
  typeof companyObjectiveMetricSchema
>;

export const companyObjectiveSchema = z.object({
  id: z.uuid(),
  metricKey: companyObjectiveMetricSchema,
  displayName: z.string().min(3).max(80),
  targetValue: z.number().int().positive().max(100_000_000),
  startsAt: z.iso.datetime({ offset: true }),
  deadlineAt: z.iso.datetime({ offset: true }),
  status: z.enum(["active", "paused", "completed", "cancelled"]),
});

export type CompanyObjective = z.infer<typeof companyObjectiveSchema>;

export const companyProposalActionSchema = z.enum([
  "strategic_focus",
  "resolve_blocker",
  "improve_measurement",
  "review_risk",
  "audit_control",
  "grow_activation",
  "acquire_farmers",
  "acquire_buyers",
  "improve_onboarding",
  "improve_liquidity",
  "plan_editorial",
  "investigate_product",
  "investigate_engineering",
  "expand_qa",
  "review_support_trust",
]);

export const companyProposalDraftSchema = z.object({
  title: z.string().trim().min(5).max(160),
  summary: z.string().trim().min(20).max(2_000),
  actionKind: companyProposalActionSchema,
  priority: z.enum(["low", "medium", "high", "critical"]),
  riskLevel: z.enum(["low", "medium", "high"]),
  evidence: z.record(
    z.string(),
    z.union([aggregateCountSchema, z.string().max(100)]),
  ),
});

export type CompanyProposalDraft = z.infer<
  typeof companyProposalDraftSchema
>;

export const companyProposalReviewSchema = z.object({
  proposalId: z.uuid(),
  decision: z.enum(["approved", "rejected", "escalated", "obsolete"]),
  expectedRevision: z.number().int().nonnegative(),
  reason: z.string().trim().min(5).max(1_000),
  idempotencyKey: z.uuid(),
});

export const companyProposalRecordSchema = z.object({
  code: z.enum(["RECORDED", "IDEMPOTENT_REPLAY"]),
  proposal_id: z.uuid(),
  state: z.enum(["pending", "approved", "rejected", "escalated", "obsolete"]),
  revision: z.number().int().nonnegative(),
});

export const companySnapshotRecordSchema = z.object({
  code: z.enum(["RECORDED", "IDEMPOTENT_REPLAY"]),
  snapshot_id: z.uuid(),
  metrics: companyMetricsSchema,
});

export const companyProposalRowSchema = z.object({
  id: z.uuid(),
  role: managedAgentRoleSchema,
  title: z.string(),
  summary: z.string(),
  action_kind: companyProposalActionSchema,
  priority: z.enum(["low", "medium", "high", "critical"]),
  risk_level: z.enum(["low", "medium", "high"]),
  evidence: z.record(z.string(), z.unknown()),
  state: z.enum(["pending", "approved", "rejected", "escalated", "obsolete"]),
  revision: z.number().int().nonnegative(),
  reviewer_reason: z.string().nullable(),
  created_at: z.string(),
  reviewed_at: z.string().nullable(),
});
