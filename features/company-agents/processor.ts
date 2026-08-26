import { z } from "zod";
import { uuidFromText } from "@/features/outreach/crypto";
import type { CompanyAgentRole } from "@/features/managed-agents/contracts";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  companyObjectiveSchema,
  companyProposalRecordSchema,
  companySnapshotRecordSchema,
} from "./contracts";
import { buildCompanyProposal, COMPANY_POLICY_VERSION } from "./policy";

const objectiveRowSchema = z.object({
  id: z.uuid(),
  metric_key: z.string(),
  display_name: z.string(),
  target_value: z.coerce.number().int(),
  starts_at: z.string(),
  deadline_at: z.string(),
  status: z.string(),
});

function firstRow(value: unknown) {
  return Array.isArray(value) ? value[0] : value;
}

export async function runCompanyAgent(
  role: CompanyAgentRole,
  runId: string,
) {
  const supabase = createAdminClient();
  const snapshotKey = await uuidFromText(
    `ai-company-snapshot:${runId}:company-metrics-v1`,
  );
  const snapshotResult = await supabase.rpc("record_ai_company_snapshot", {
    run_id_input: runId,
    idempotency_key_input: snapshotKey,
  });
  if (snapshotResult.error) throw new Error("COMPANY_SNAPSHOT_FAILED");
  const snapshot = companySnapshotRecordSchema.parse(firstRow(snapshotResult.data));

  const objectivesResult = await supabase
    .from("company_objectives")
    .select("id, metric_key, display_name, target_value, starts_at, deadline_at, status")
    .in("status", ["active", "completed"])
    .order("target_value", { ascending: false });
  if (objectivesResult.error) throw new Error("COMPANY_OBJECTIVES_FAILED");
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
  const draft = buildCompanyProposal({
    role,
    metrics: snapshot.metrics,
    objectives,
    now: new Date(snapshot.metrics.capturedAt),
  });
  const proposalKey = await uuidFromText(
    `ai-company-proposal:${runId}:${role}:${snapshot.snapshot_id}:${COMPANY_POLICY_VERSION}`,
  );
  const proposalResult = await supabase.rpc("record_ai_company_proposal", {
    run_id_input: runId,
    snapshot_id_input: snapshot.snapshot_id,
    title_input: draft.title,
    summary_input: draft.summary,
    action_kind_input: draft.actionKind,
    priority_input: draft.priority,
    risk_level_input: draft.riskLevel,
    evidence_input: draft.evidence,
    idempotency_key_input: proposalKey,
  });
  if (proposalResult.error) throw new Error("COMPANY_PROPOSAL_FAILED");
  const proposal = companyProposalRecordSchema.parse(firstRow(proposalResult.data));
  return {
    claimed: 1,
    succeeded: 1,
    failed: 0,
    summary: {
      proposalsPendingReview: proposal.state === "pending" ? 1 : 0,
      aggregateSnapshotRecorded: true,
      policyVersion: COMPANY_POLICY_VERSION,
      externalActionsExecuted: 0,
      modelCalls: 0,
    },
  };
}
