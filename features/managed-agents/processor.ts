import { z } from "zod";
import { sha256, uuidFromText } from "@/features/outreach/crypto";
import { processOutreachBatch } from "@/features/outreach/processor";
import { createConfiguredOutreachProvider } from "@/features/outreach/providers";
import type { FarmerProfileAgent } from "@/features/profile-agent/managed-agent";
import type { ManagedProfileAgentInput } from "@/features/profile-agent/schemas";
import { getCloudflareBindings } from "@/lib/cloudflare-bindings";
import { DEFAULT_LOCALE, normalizeLocale } from "@/lib/i18n/locales";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  managedAgentRunRequestSchema,
  type ManagedAgentRole,
  type ManagedAgentRunResult,
} from "./contracts";

const beginRunSchema = z.object({
  code: z.enum(["STARTED", "IDEMPOTENT_REPLAY", "SKIPPED_BUSY"]),
  run_id: z.uuid(),
  max_items_per_run: z.number().int().min(1).max(25),
});

const savedSampleSchema = z.object({
  code: z.enum(["CREATED", "IDEMPOTENT_REPLAY"]),
  sample_id: z.uuid(),
  revision: z.number().int().nonnegative(),
});

const profileCandidateSchema = z.object({
  id: z.uuid(),
  normalized_source_url: z.url(),
  source_type: z.enum([
    "website",
    "youtube",
    "instagram",
    "facebook",
    "linkedin",
    "other_social",
  ]),
  source_title: z.string().nullable(),
  source_excerpt: z.string().min(2).max(8_000),
  source_hash: z.string().regex(/^[0-9a-f]{64}$/),
  business_name: z.string().min(2).max(120),
  preferred_locale: z.string(),
  updated_at: z.string(),
});

const pendingClaimSchema = z.object({
  id: z.uuid(),
  method: z.string(),
  provider_receipt_id: z.string().nullable(),
  expires_at: z.string().nullable(),
});

type RunCounts = {
  claimed: number;
  succeeded: number;
  failed: number;
  summary: Record<string, string | number | boolean | null>;
  failureCode?: string;
};

function firstRow(value: unknown) {
  return Array.isArray(value) ? value[0] : value;
}

function boundedFailureCode(caught: unknown) {
  return (caught instanceof Error ? caught.message : "MANAGED_AGENT_FAILED")
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 80) || "MANAGED_AGENT_FAILED";
}

async function managedProfileAgent(name: string) {
  const bindings = await getCloudflareBindings();
  if (!bindings?.FARMER_PROFILE_AGENT) return null;
  const { getAgentByName } = await import("agents");
  return getAgentByName(
    bindings.FARMER_PROFILE_AGENT,
    name,
  ) as Promise<DurableObjectStub<FarmerProfileAgent>>;
}

async function runOutreachGrowth(maxItems: number): Promise<RunCounts> {
  const supabase = createAdminClient();
  const [cleanup, scheduled] = await Promise.all([
    supabase.rpc("purge_expired_outreach_research", { limit_input: 100 }),
    supabase.rpc("schedule_due_outreach_followups", { limit_input: 25 }),
  ]);
  if (cleanup.error) throw new Error("OUTREACH_CLEANUP_FAILED");
  if (scheduled.error) throw new Error("OUTREACH_SCHEDULING_FAILED");
  const provider = createConfiguredOutreachProvider();
  if (!provider.configured) throw new Error("OUTREACH_PROVIDER_NOT_CONFIGURED");
  const result = await processOutreachBatch({
    supabase,
    provider,
    limit: maxItems,
  });
  return {
    claimed: result.claimed,
    succeeded: result.delivered,
    failed: result.failed,
    summary: {
      expiredResearchPurged: Number(cleanup.data ?? 0),
      followupsScheduled: Number(scheduled.data ?? 0),
      providerConfigured: true,
    },
    failureCode: result.failed > 0 ? "OUTREACH_DELIVERY_PARTIAL" : undefined,
  };
}

async function saveAutomatedProfileCandidate(
  candidate: z.infer<typeof profileCandidateSchema>,
) {
  const supabase = createAdminClient();
  const sampleId = await uuidFromText(
    `managed-profile-operations:${candidate.id}:${candidate.source_hash}`,
  );
  const instanceName = `prospect-${candidate.id}`;
  const agent = await managedProfileAgent(instanceName);
  if (!agent) throw new Error("PROFILE_AGENT_BINDING_UNAVAILABLE");
  const evidence: ManagedProfileAgentInput["evidence"] = [{
    sourceUrl: candidate.normalized_source_url,
    sourceType: candidate.source_type,
    sourceTitle: candidate.source_title ?? undefined,
    sourceText: candidate.source_excerpt,
    sourceHash: candidate.source_hash,
    collectedAt: new Date(candidate.updated_at).toISOString(),
  }];
  const generated = await agent.generateSample({
    sampleId,
    prospectId: candidate.id,
    subjectName: candidate.business_name,
    preferredLocale:
      normalizeLocale(candidate.preferred_locale) ?? DEFAULT_LOCALE,
    evidence,
  });
  const fingerprint = await sha256(JSON.stringify({
    prospectId: candidate.id,
    subjectName: candidate.business_name,
    sourceHashes: [candidate.source_hash],
    promptVersion: generated.run.promptVersion,
  }));
  const idempotencyKey = await uuidFromText(
    `managed-profile-operations-save:${candidate.id}:${candidate.source_hash}`,
  );
  const saved = await supabase.rpc("save_managed_profile_sample", {
    prospect_id_input: candidate.id,
    subject_name_input: candidate.business_name,
    sample_data_input: generated.sample,
    sources_input: evidence,
    agent_instance_name_input: instanceName,
    run_input: generated.run,
    sample_fingerprint_input: fingerprint,
    idempotency_key_input: idempotencyKey,
  });
  if (saved.error) throw new Error("PROFILE_SAMPLE_SAVE_FAILED");
  const savedRow = savedSampleSchema.parse(firstRow(saved.data));
  const workflow = await agent.beginApproval({
    sampleId: savedRow.sample_id,
    sampleFingerprint: fingerprint,
  });
  const link = await supabase.rpc("set_managed_profile_sample_workflow", {
    sample_id_input: savedRow.sample_id,
    workflow_id_input: workflow.workflowId,
    sample_fingerprint_input: fingerprint,
  });
  if (link.error) throw new Error("PROFILE_WORKFLOW_LINK_FAILED");
  return savedRow.code;
}

async function runProfileDrafting(maxItems: number): Promise<RunCounts> {
  const supabase = createAdminClient();
  const candidatesResult = await supabase
    .from("outreach_prospects")
    .select(
      "id, normalized_source_url, source_type, source_title, source_excerpt, source_hash, business_name, preferred_locale, updated_at",
    )
    .in("status", ["consented", "qualified", "introduction_queued"])
    .in("suggested_role", ["farmer", "unknown"])
    .in("source_type", [
      "website",
      "youtube",
      "instagram",
      "facebook",
      "linkedin",
      "other_social",
    ])
    .not("source_excerpt", "is", null)
    .not("business_name", "is", null)
    .order("updated_at", { ascending: true })
    .limit(Math.min(maxItems * 3, 25));
  if (candidatesResult.error) throw new Error("PROFILE_CANDIDATE_LOOKUP_FAILED");
  const candidatePool = z.array(profileCandidateSchema).parse(
    candidatesResult.data ?? [],
  );
  if (!candidatePool.length) {
    return {
      claimed: 0,
      succeeded: 0,
      failed: 0,
      summary: {
        privateSamplesCreated: 0,
        approvalRequired: true,
        publishedProfilesCreated: 0,
      },
    };
  }
  const existingResult = await supabase
    .from("managed_profile_samples")
    .select("prospect_id")
    .in("prospect_id", candidatePool.map((candidate) => candidate.id));
  if (existingResult.error) throw new Error("PROFILE_SAMPLE_LOOKUP_FAILED");
  const existing = new Set(
    (existingResult.data ?? []).map((row) => String(row.prospect_id)),
  );
  const candidates = candidatePool
    .filter((candidate) => !existing.has(candidate.id))
    .slice(0, maxItems);
  let succeeded = 0;
  let failed = 0;
  for (const candidate of candidates) {
    try {
      await saveAutomatedProfileCandidate(candidate);
      succeeded += 1;
    } catch {
      failed += 1;
    }
  }
  return {
    claimed: candidates.length,
    succeeded,
    failed,
    summary: {
      privateSamplesCreated: succeeded,
      approvalRequired: true,
      publishedProfilesCreated: 0,
    },
    failureCode: failed > 0 ? "PROFILE_DRAFTING_PARTIAL" : undefined,
  };
}

const deterministicProviderMethods = new Set([
  "email_link",
  "phone_otp",
  "whatsapp_link",
  "social_oauth",
  "government_kyc",
  "liveness_match",
  "bank_name_match",
  "organization_registry",
  "farmer_registry",
]);
const manualReviewMethods = new Set([
  "community_vouch",
  "live_interview",
  "service_area_evidence",
  "transaction_history",
]);

export function verificationTriageDecision(input: {
  method: string;
  providerReceiptId: string | null;
  expiresAt: string | null;
}) {
  if (input.expiresAt && new Date(input.expiresAt).getTime() <= Date.now()) {
    return {
      recommendation: "reject_incomplete_evidence" as const,
      riskLevel: "high" as const,
      reasonCodes: ["EVIDENCE_EXPIRED"] as const,
    };
  }
  if (deterministicProviderMethods.has(input.method)) {
    return input.providerReceiptId
      ? {
          recommendation: "ready_for_service_review" as const,
          riskLevel: "low" as const,
          reasonCodes: ["DETERMINISTIC_PROVIDER_RESULT_PRESENT"] as const,
        }
      : {
          recommendation: "awaiting_provider_receipt" as const,
          riskLevel: "medium" as const,
          reasonCodes: ["PROVIDER_RECEIPT_MISSING"] as const,
        };
  }
  if (manualReviewMethods.has(input.method)) {
    return {
      recommendation: "manual_review_required" as const,
      riskLevel: "medium" as const,
      reasonCodes: ["HUMAN_REVIEW_METHOD"] as const,
    };
  }
  return {
    recommendation: "reject_incomplete_evidence" as const,
    riskLevel: "high" as const,
    reasonCodes: ["UNSUPPORTED_METHOD"] as const,
  };
}

async function runVerificationTriage(
  runId: string,
  maxItems: number,
): Promise<RunCounts> {
  const supabase = createAdminClient();
  const claimsResult = await supabase
    .from("profile_verification_claims")
    .select("id, method, provider_receipt_id, expires_at")
    .eq("state", "pending")
    .order("created_at", { ascending: true })
    .limit(Math.min(maxItems * 3, 25));
  if (claimsResult.error) throw new Error("PENDING_CLAIMS_LOOKUP_FAILED");
  const claimPool = z.array(pendingClaimSchema).parse(claimsResult.data ?? []);
  if (!claimPool.length) {
    return {
      claimed: 0,
      succeeded: 0,
      failed: 0,
      summary: {
        recommendationsRecorded: 0,
        verificationClaimsChanged: 0,
        badgesIssued: 0,
      },
    };
  }
  const priorResult = await supabase
    .from("managed_verification_triage")
    .select("claim_id")
    .in("claim_id", claimPool.map((claim) => claim.id));
  if (priorResult.error) throw new Error("VERIFICATION_TRIAGE_LOOKUP_FAILED");
  const prior = new Set(
    (priorResult.data ?? []).map((row) => String(row.claim_id)),
  );
  const claims = claimPool
    .filter((claim) => !prior.has(claim.id))
    .slice(0, maxItems);
  let succeeded = 0;
  let failed = 0;
  for (const claim of claims) {
    const decision = verificationTriageDecision({
      method: claim.method,
      providerReceiptId: claim.provider_receipt_id,
      expiresAt: claim.expires_at,
    });
    const recorded = await supabase.rpc("record_managed_verification_triage", {
      run_id_input: runId,
      claim_id_input: claim.id,
      recommendation_input: decision.recommendation,
      risk_level_input: decision.riskLevel,
      reason_codes_input: [...decision.reasonCodes],
    });
    if (recorded.error) failed += 1;
    else succeeded += 1;
  }
  return {
    claimed: claims.length,
    succeeded,
    failed,
    summary: {
      recommendationsRecorded: succeeded,
      verificationClaimsChanged: 0,
      badgesIssued: 0,
    },
    failureCode: failed > 0 ? "VERIFICATION_TRIAGE_PARTIAL" : undefined,
  };
}

async function runOperationsSupervisor(maxItems: number): Promise<RunCounts> {
  const supabase = createAdminClient();
  const staleBefore = new Date(Date.now() - 15 * 60 * 1_000).toISOString();
  const staleResult = await supabase
    .from("managed_operations_agent_runs")
    .select("id")
    .eq("state", "running")
    .lt("started_at", staleBefore)
    .limit(maxItems);
  if (staleResult.error) throw new Error("SUPERVISOR_STALE_RUN_LOOKUP_FAILED");
  let closed = 0;
  for (const stale of staleResult.data ?? []) {
    const result = await supabase.rpc("finish_managed_operations_agent_run", {
      run_id_input: stale.id,
      outcome_input: {
        state: "failed",
        claimed: 0,
        succeeded: 0,
        failed: 0,
        failureCode: "STALE_RUN_LEASE",
        summary: { staleRunClosed: true },
      },
    });
    if (!result.error) closed += 1;
  }
  const [agentResult, outboxResult] = await Promise.all([
    supabase.from("managed_operations_agents").select("role, enabled, runtime_state"),
    supabase.from("outreach_outbox").select("id", { count: "exact", head: true })
      .in("state", ["pending", "failed"]),
  ]);
  if (agentResult.error || outboxResult.error) {
    throw new Error("SUPERVISOR_HEALTH_LOOKUP_FAILED");
  }
  return {
    claimed: staleResult.data?.length ?? 0,
    succeeded: closed,
    failed: (staleResult.data?.length ?? 0) - closed,
    summary: {
      activeRoles: (agentResult.data ?? []).filter((row) => row.enabled).length,
      degradedRoles: (agentResult.data ?? []).filter(
        (row) => row.runtime_state === "degraded",
      ).length,
      staleRunsClosed: closed,
      outreachQueueAttention: outboxResult.count ?? 0,
    },
    failureCode:
      closed < (staleResult.data?.length ?? 0)
        ? "SUPERVISOR_PARTIAL"
        : undefined,
  };
}

async function dispatchRole(
  role: ManagedAgentRole,
  runId: string,
  maxItems: number,
) {
  if (role === "outreach_growth") return runOutreachGrowth(maxItems);
  if (role === "profile_drafting") return runProfileDrafting(maxItems);
  if (role === "verification_triage") {
    return runVerificationTriage(runId, maxItems);
  }
  return runOperationsSupervisor(maxItems);
}

export async function processManagedAgentRun(
  rawInput: unknown,
): Promise<ManagedAgentRunResult> {
  const input = managedAgentRunRequestSchema.parse(rawInput);
  const supabase = createAdminClient();
  const begun = await supabase.rpc("begin_managed_operations_agent_run", {
    role_input: input.role,
    instance_name_input: input.instanceName,
    trigger_type_input: input.trigger,
    idempotency_key_input: input.idempotencyKey,
  });
  if (begun.error) {
    throw new Error(String(begun.error.details ?? begun.error.code ?? "RUN_BEGIN_FAILED"));
  }
  const beginRow = beginRunSchema.parse(firstRow(begun.data));
  if (beginRow.code !== "STARTED") {
    return {
      code: "SKIPPED",
      runId: beginRow.run_id,
      claimed: 0,
      succeeded: 0,
      failed: 0,
      summary: { reason: beginRow.code },
    };
  }
  const maxItems = Math.min(input.maxItems, beginRow.max_items_per_run);
  let outcome: RunCounts;
  let state: "succeeded" | "partial" | "failed";
  try {
    outcome = await dispatchRole(input.role, beginRow.run_id, maxItems);
    state = outcome.failed > 0 ? "partial" : "succeeded";
  } catch (caught) {
    state = "failed";
    outcome = {
      claimed: 0,
      succeeded: 0,
      failed: 0,
      summary: { recoverable: true },
      failureCode: boundedFailureCode(caught),
    };
  }
  const finished = await supabase.rpc("finish_managed_operations_agent_run", {
    run_id_input: beginRow.run_id,
    outcome_input: {
      state,
      claimed: outcome.claimed,
      succeeded: outcome.succeeded,
      failed: outcome.failed,
      failureCode: outcome.failureCode,
      summary: outcome.summary,
    },
  });
  if (finished.error) throw new Error("RUN_FINISH_FAILED");
  return {
    code: state === "succeeded" ? "SUCCEEDED" : "PARTIAL",
    runId: beginRow.run_id,
    claimed: outcome.claimed,
    succeeded: outcome.succeeded,
    failed: outcome.failed,
    summary: outcome.summary,
  };
}
