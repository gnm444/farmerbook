import { z } from "zod";
import { requireAdmin } from "@/features/auth/require-admin";
import {
  isCompanyAgentRole,
  type CompanyAgentRole,
} from "@/features/managed-agents/contracts";
import { getCloudflareBindings } from "@/lib/cloudflare-bindings";
import { isDemoMode, isSupabaseConfigured } from "@/lib/env";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { createClient } from "@/lib/supabase/server";
import {
  companyMetricsSchema,
  companyObjectiveSchema,
  companyProposalRowSchema,
  type CompanyMetrics,
  type CompanyObjective,
} from "./contracts";

export type CompanyProposal = {
  id: string;
  role: CompanyAgentRole;
  title: string;
  summary: string;
  actionKind: string;
  priority: "low" | "medium" | "high" | "critical";
  riskLevel: "low" | "medium" | "high";
  evidence: Record<string, unknown>;
  state: "pending" | "approved" | "rejected" | "escalated" | "obsolete";
  revision: number;
  reviewerReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

export type CompanyCommandCenterData = {
  configured: boolean;
  objectives: CompanyObjective[];
  metrics: CompanyMetrics | null;
  proposals: CompanyProposal[];
};

const objectiveRowSchema = z.object({
  id: z.uuid(),
  metric_key: z.string(),
  display_name: z.string(),
  target_value: z.coerce.number().int(),
  starts_at: z.string(),
  deadline_at: z.string(),
  status: z.string(),
});

const metricRowSchema = z.object({
  metrics: companyMetricsSchema,
});

const controlStatusRowSchema = z.object({
  managed_operations_enabled: z.boolean(),
  ai_company_enabled: z.boolean(),
});

export const DEFAULT_COMPANY_OBJECTIVES: CompanyObjective[] = [
  {
    id: "00000000-0000-4000-8000-000000001001",
    metricKey: "registered_users",
    displayName: "Registered users",
    targetValue: 100_000,
    startsAt: "2026-08-19T00:00:00.000Z",
    deadlineAt: "2027-02-15T00:00:00.000Z",
    status: "active",
  },
  {
    id: "00000000-0000-4000-8000-000000001002",
    metricKey: "activated_users",
    displayName: "Activated users",
    targetValue: 40_000,
    startsAt: "2026-08-19T00:00:00.000Z",
    deadlineAt: "2027-02-15T00:00:00.000Z",
    status: "active",
  },
  {
    id: "00000000-0000-4000-8000-000000001003",
    metricKey: "monthly_active_users",
    displayName: "Monthly active users",
    targetValue: 25_000,
    startsAt: "2026-08-19T00:00:00.000Z",
    deadlineAt: "2027-02-15T00:00:00.000Z",
    status: "active",
  },
];

function unavailable(): CompanyCommandCenterData {
  return {
    configured: false,
    objectives: DEFAULT_COMPANY_OBJECTIVES,
    metrics: null,
    proposals: [],
  };
}

export async function loadCompanyCommandCenter(): Promise<CompanyCommandCenterData> {
  await requireAdmin();
  if (
    !isFeatureEnabled("ENABLE_MANAGED_OPERATIONS_AGENTS") ||
    !isFeatureEnabled("ENABLE_AI_COMPANY") ||
    !isSupabaseConfigured() ||
    isDemoMode()
  ) {
    return unavailable();
  }
  const bindings = await getCloudflareBindings();
  if (
    !bindings?.COMPANY_OPERATIONS_AGENT ||
    !bindings.NEXT_PUBLIC_SITE_URL ||
    (bindings.MANAGED_AGENT_PROCESSOR_SECRET?.length ?? 0) < 32
  ) {
    return unavailable();
  }
  const supabase = await createClient();
  const [controlResult, objectivesResult, metricsResult, proposalsResult] = await Promise.all([
    supabase.rpc("ai_company_control_status"),
    supabase.rpc("list_ai_company_objectives"),
    supabase.rpc("ai_company_latest_metrics"),
    supabase.rpc("list_ai_company_proposals", { limit_input: 40 }),
  ]);
  if (
    controlResult.error || objectivesResult.error || metricsResult.error ||
    proposalsResult.error
  ) {
    return unavailable();
  }
  const controlRows = z.array(controlStatusRowSchema).parse(
    controlResult.data ?? [],
  );
  const controlsEnabled =
    controlRows[0]?.managed_operations_enabled === true &&
    controlRows[0]?.ai_company_enabled === true;
  const objectives = z.array(objectiveRowSchema).parse(
    objectivesResult.data ?? [],
  ).map((row) => companyObjectiveSchema.parse({
    id: row.id,
    metricKey: row.metric_key,
    displayName: row.display_name,
    targetValue: row.target_value,
    startsAt: row.starts_at,
    deadlineAt: row.deadline_at,
    status: row.status,
  }));
  const metricRows = z.array(metricRowSchema).parse(metricsResult.data ?? []);
  const proposals = z.array(companyProposalRowSchema).parse(
    proposalsResult.data ?? [],
  ).flatMap((row): CompanyProposal[] => {
    if (!isCompanyAgentRole(row.role)) return [];
    return [{
      id: row.id,
      role: row.role,
      title: row.title,
      summary: row.summary,
      actionKind: row.action_kind,
      priority: row.priority,
      riskLevel: row.risk_level,
      evidence: row.evidence,
      state: row.state,
      revision: row.revision,
      reviewerReason: row.reviewer_reason,
      createdAt: row.created_at,
      reviewedAt: row.reviewed_at,
    }];
  });
  return {
    configured: controlsEnabled,
    objectives: objectives.length ? objectives : DEFAULT_COMPANY_OBJECTIVES,
    metrics: metricRows[0]?.metrics ?? null,
    proposals,
  };
}
