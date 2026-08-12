"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { requireAdmin } from "@/features/auth/require-admin";
import {
  outreachDatabaseFailure,
  outreachFailure,
} from "@/features/outreach/action-result";
import { createOutreachAgent } from "@/features/outreach/agent";
import { sha256, uuidFromText } from "@/features/outreach/crypto";
import { verifyOutreachInvitationToken } from "@/features/outreach/invitation-token";
import { getCloudflareBindings } from "@/lib/cloudflare-bindings";
import { getSiteUrl, isDemoMode, isSupabaseConfigured } from "@/lib/env";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { DEFAULT_LOCALE, normalizeLocale } from "@/lib/i18n/locales";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  BraveSearchError,
  braveSearchConfiguration,
  buildBraveFarmerQuery,
  searchFarmerByName,
} from "./brave-search";
import {
  generateAndSaveManagedProfileSample,
  managedProfileAgent,
} from "./sample-service";
import {
  managedFarmerProfileSampleSchema,
  profileNameDiscoveryActionSchema,
  profileSampleBuildActionSchema,
  profileSampleDecisionSchema,
  type ManagedProfileAgentInput,
} from "./schemas";

const createdProspectSchema = z.object({
  code: z.string(),
  prospect_id: z.uuid(),
  revision: z.number().int().nonnegative(),
});

const previewRowSchema = z.object({
  sample_id: z.uuid(),
  subject_name: z.string(),
  sample_data: managedFarmerProfileSampleSchema,
  sample_state: z.enum(["approval_pending", "approved"]),
  workflow_id: z.string().nullable(),
  agent_instance_name: z.string(),
  invitation_expires_at: z.string(),
});

const decisionRowSchema = z.object({
  code: z.enum(["APPROVED", "REJECTED", "IDEMPOTENT_REPLAY"]),
  sample_id: z.uuid(),
  prospect_id: z.uuid(),
  workflow_id: z.string(),
  agent_instance_name: z.string(),
});

const searchReservationSchema = z.object({
  code: z.enum(["RESERVED", "IDEMPOTENT_REPLAY"]),
  search_request_id: z.uuid(),
  prospect_id: z.uuid().nullable(),
  sample_id: z.uuid().nullable(),
});

function firstRow(value: unknown) {
  return Array.isArray(value) ? value[0] : value;
}

function invitationSecret() {
  return process.env.OUTREACH_INVITATION_SIGNING_SECRET ?? "";
}

type ManagedEvidence = ManagedProfileAgentInput["evidence"];

export async function buildManagedFarmerProfileSampleAction(input: unknown) {
  if (
    !isFeatureEnabled("ENABLE_OUTREACH_AGENT") ||
    !isFeatureEnabled("ENABLE_PROFILE_RESEARCH_AGENT")
  ) {
    return outreachFailure("FEATURE_DISABLED");
  }
  const parsed = profileSampleBuildActionSchema.safeParse(input);
  if (!parsed.success) {
    return outreachFailure("INVALID_INPUT", z.flattenError(parsed.error).fieldErrors);
  }
  const administrator = await requireAdmin();
  if (administrator.demo || isDemoMode() || !isSupabaseConfigured()) {
    return outreachFailure("NOT_CONFIGURED");
  }
  const supabase = createAdminClient();
  const { data: prospect, error } = await supabase
    .from("outreach_prospects")
    .select(
      "id, normalized_source_url, source_type, source_title, source_excerpt, source_hash, business_name, preferred_locale, updated_at, status, suggested_role",
    )
    .eq("id", parsed.data.prospectId)
    .maybeSingle();
  if (error || !prospect) return outreachFailure("NOT_FOUND");
  if (
    ["declined", "expired", "withdrawn", "suppressed", "joined"].includes(
      String(prospect.status),
    ) ||
    !["farmer", "unknown"].includes(String(prospect.suggested_role))
  ) {
    return outreachFailure("FORBIDDEN");
  }
  const sourceText = String(prospect.source_excerpt ?? "").trim();
  if (!sourceText) return outreachFailure("EVIDENCE_REQUIRED");
  const subjectName =
    parsed.data.subjectName ?? String(prospect.business_name ?? "").trim();
  if (!subjectName) return outreachFailure("EVIDENCE_REQUIRED");
  const preferredLocale =
    normalizeLocale(String(prospect.preferred_locale)) ?? DEFAULT_LOCALE;
  const evidence = [{
    sourceUrl: String(prospect.normalized_source_url),
    sourceType: String(prospect.source_type) as ManagedEvidence[number]["sourceType"],
    sourceTitle: prospect.source_title
      ? String(prospect.source_title)
      : undefined,
    sourceText,
    sourceHash: String(prospect.source_hash),
    collectedAt: new Date(String(prospect.updated_at)).toISOString(),
  }];
  return generateAndSaveManagedProfileSample({
    supabase,
    prospectId: parsed.data.prospectId,
    subjectName,
    preferredLocale,
    evidence,
    idempotencyKey: parsed.data.idempotencyKey,
  });
}

async function requestOrigin() {
  const requestHeaders = await headers();
  const requestHost =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const requestProtocol =
    requestHeaders.get("x-forwarded-proto") ??
    (requestHost?.includes("localhost") ? "http" : "https");
  return requestHost
    ? new URL(`${requestProtocol}://${requestHost}`).origin
    : new URL(getSiteUrl()).origin;
}

async function recordSearchFailure(
  supabase: Awaited<ReturnType<typeof createClient>>,
  searchRequestId: string,
  failureCode: string,
  resultCount = 0,
) {
  await supabase.rpc("complete_managed_profile_search", {
    search_request_id_input: searchRequestId,
    outcome_input: {
      state: "failed",
      resultCount,
      failureCode,
    },
  });
}

export async function discoverManagedFarmerProfileByNameAction(input: unknown) {
  if (
    !isFeatureEnabled("ENABLE_OUTREACH_AGENT") ||
    !isFeatureEnabled("ENABLE_PROFILE_RESEARCH_AGENT")
  ) {
    return outreachFailure("FEATURE_DISABLED");
  }
  const parsed = profileNameDiscoveryActionSchema.safeParse(input);
  if (!parsed.success) {
    return outreachFailure("INVALID_INPUT", z.flattenError(parsed.error).fieldErrors);
  }
  const administrator = await requireAdmin();
  if (administrator.demo || isDemoMode() || !isSupabaseConfigured()) {
    return outreachFailure("NOT_CONFIGURED");
  }
  if (!braveSearchConfiguration().configured) {
    return outreachFailure("NOT_CONFIGURED");
  }

  const query = buildBraveFarmerQuery(parsed.data);
  const queryHash = await sha256(query);
  const userSupabase = await createClient();
  const reservationResult = await userSupabase.rpc(
    "reserve_managed_profile_search",
    {
      query_hash_input: queryHash,
      idempotency_key_input: parsed.data.idempotencyKey,
    },
  );
  if (reservationResult.error) {
    return outreachDatabaseFailure(reservationResult.error);
  }
  const reservation = searchReservationSchema.safeParse(
    firstRow(reservationResult.data),
  );
  if (!reservation.success) return outreachFailure("DATA_UNAVAILABLE");
  const adminSupabase = createAdminClient();
  if (reservation.data.code === "IDEMPOTENT_REPLAY") {
    if (!reservation.data.prospect_id || !reservation.data.sample_id) {
      return outreachFailure("CONFLICT");
    }
    const existing = await adminSupabase
      .from("managed_profile_samples")
      .select("sample_data, workflow_id")
      .eq("id", reservation.data.sample_id)
      .maybeSingle();
    const sample = managedFarmerProfileSampleSchema.safeParse(
      existing.data?.sample_data,
    );
    if (existing.error || !sample.success) {
      return outreachFailure("DATA_UNAVAILABLE");
    }
    return {
      ok: true as const,
      code: "IDEMPOTENT_REPLAY",
      data: {
        prospectId: reservation.data.prospect_id,
        sampleId: reservation.data.sample_id,
        workflowId: String(existing.data?.workflow_id ?? ""),
        sample: sample.data,
        sourcesFound: sample.data.claims.length,
      },
    };
  }

  let search;
  try {
    search = await searchFarmerByName(parsed.data);
  } catch (caught) {
    const failureCode =
      caught instanceof BraveSearchError ? caught.code : "SEARCH_UNAVAILABLE";
    await recordSearchFailure(
      userSupabase,
      reservation.data.search_request_id,
      failureCode,
    );
    if (failureCode === "QUOTA_EXCEEDED") {
      return outreachFailure("SEARCH_QUOTA_EXCEEDED");
    }
    if (
      failureCode === "NOT_CONFIGURED" ||
      failureCode === "AUTHENTICATION_FAILED"
    ) {
      return outreachFailure("NOT_CONFIGURED");
    }
    return outreachFailure("SEARCH_UNAVAILABLE");
  }
  if (!search.results.length) {
    await recordSearchFailure(
      userSupabase,
      reservation.data.search_request_id,
      "SEARCH_NO_MATCH",
    );
    return outreachFailure("SEARCH_NO_MATCH");
  }

  const collectedAt = new Date().toISOString();
  const evidence = await Promise.all(
    search.results.map(async (result) => ({
      ...result,
      sourceHash: await sha256(
        `${result.sourceUrl}\n${result.sourceTitle}\n${result.sourceText}`,
      ),
      providerQueryHash: queryHash,
      collectedAt,
    })),
  );
  const bindings = await getCloudflareBindings();
  const analysis = await createOutreachAgent(bindings?.AI).analyze({
    sourceText: evidence
      .map((item) => `${item.sourceTitle}\n${item.sourceText}`)
      .join("\n\n"),
    businessName: parsed.data.fullName,
    preferredLocale: DEFAULT_LOCALE,
  });
  if (!["farmer", "unknown"].includes(analysis.suggestedRole)) {
    await recordSearchFailure(
      userSupabase,
      reservation.data.search_request_id,
      "SEARCH_NO_FARMER_EVIDENCE",
      evidence.length,
    );
    return outreachFailure("SEARCH_NO_MATCH");
  }
  const sourceFingerprint = await sha256(
    JSON.stringify({
      queryHash,
      sourceHashes: evidence.map((item) => item.sourceHash),
    }),
  );
  const created = await userSupabase.rpc("create_outreach_prospect", {
    prospect_input: {
      sourceUrl: evidence[0].sourceUrl,
      applicationOrigin: await requestOrigin(),
      sourceType: evidence[0].sourceType,
      sourceTitle: evidence[0].sourceTitle,
      sourceExcerpt: evidence[0].sourceText,
      sourceHash: sourceFingerprint,
      businessName: parsed.data.fullName,
      operatorContext: `Approved Brave Search name discovery. Query hash: ${queryHash}`,
      contactReady: false,
      suggestedRole:
        analysis.suggestedRole === "unknown" ? "farmer" : analysis.suggestedRole,
      preferredLocale: analysis.preferredLocale,
      categorySlugs: analysis.categorySlugs,
      rationale: analysis.rationale,
      introductionDraft: analysis.introductionDraft,
      contactCandidates: [],
      agentRuns: [{ runType: "qualification", ...analysis.run }],
    },
    idempotency_key_input: parsed.data.idempotencyKey,
  });
  if (created.error) {
    await recordSearchFailure(
      userSupabase,
      reservation.data.search_request_id,
      "PROSPECT_WRITE_FAILED",
      evidence.length,
    );
    return outreachDatabaseFailure(created.error);
  }
  const prospect = createdProspectSchema.safeParse(firstRow(created.data));
  if (!prospect.success) {
    await recordSearchFailure(
      userSupabase,
      reservation.data.search_request_id,
      "PROSPECT_RESULT_INVALID",
      evidence.length,
    );
    return outreachFailure("DATA_UNAVAILABLE");
  }
  const sampleResult = await generateAndSaveManagedProfileSample({
    supabase: adminSupabase,
    prospectId: prospect.data.prospect_id,
    subjectName: parsed.data.fullName,
    preferredLocale: analysis.preferredLocale,
    evidence,
    idempotencyKey: await uuidFromText(
      `managed-profile-name-sample:${parsed.data.idempotencyKey}`,
    ),
  });
  if (!sampleResult.ok) {
    await recordSearchFailure(
      userSupabase,
      reservation.data.search_request_id,
      "PROFILE_SAMPLE_FAILED",
      evidence.length,
    );
    return sampleResult;
  }
  const completed = await userSupabase.rpc("complete_managed_profile_search", {
    search_request_id_input: reservation.data.search_request_id,
    outcome_input: {
      state: "succeeded",
      resultCount: evidence.length,
      prospectId: prospect.data.prospect_id,
      sampleId: sampleResult.data.sampleId,
    },
  });
  if (completed.error) return outreachDatabaseFailure(completed.error);
  return {
    ok: true as const,
    code: sampleResult.code,
    data: {
      prospectId: prospect.data.prospect_id,
      sampleId: sampleResult.data.sampleId,
      workflowId: sampleResult.data.workflowId,
      sample: sampleResult.data.sample,
      sourcesFound: evidence.length,
    },
  };
}

export async function loadManagedProfileSamplePreview(token: string) {
  if (
    !isFeatureEnabled("ENABLE_OUTREACH_AGENT") ||
    !isFeatureEnabled("ENABLE_PROFILE_RESEARCH_AGENT") ||
    isDemoMode() ||
    !isSupabaseConfigured()
  ) {
    return null;
  }
  const payload = await verifyOutreachInvitationToken(token, invitationSecret());
  if (!payload) return null;
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc(
      "get_managed_profile_sample_preview",
      { token_hash_input: await sha256(token) },
    );
    if (error) return null;
    const parsed = previewRowSchema.safeParse(firstRow(data));
    if (!parsed.success) return null;
    if (
      new Date(parsed.data.invitation_expires_at).getTime() !== payload.expiresAt
    ) {
      return null;
    }
    return {
      id: parsed.data.sample_id,
      subjectName: parsed.data.subject_name,
      sample: parsed.data.sample_data,
      state: parsed.data.sample_state,
      expiresAt: parsed.data.invitation_expires_at,
    };
  } catch {
    return null;
  }
}

export async function decideManagedProfileSampleAction(input: unknown) {
  if (
    !isFeatureEnabled("ENABLE_OUTREACH_AGENT") ||
    !isFeatureEnabled("ENABLE_PROFILE_RESEARCH_AGENT") ||
    isDemoMode() ||
    !isSupabaseConfigured()
  ) {
    return outreachFailure("FEATURE_DISABLED");
  }
  const parsed = profileSampleDecisionSchema.safeParse(input);
  if (!parsed.success) return outreachFailure("INVALID_INPUT");
  const payload = await verifyOutreachInvitationToken(
    parsed.data.token,
    invitationSecret(),
  );
  if (!payload) return outreachFailure("NOT_FOUND");
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("decide_managed_profile_sample", {
    token_hash_input: await sha256(parsed.data.token),
    decision_input: parsed.data.decision,
  });
  if (error) return outreachFailure("DATA_UNAVAILABLE");
  const decision = decisionRowSchema.safeParse(firstRow(data));
  if (!decision.success) return outreachFailure("DATA_UNAVAILABLE");
  const agent = await managedProfileAgent(decision.data.agent_instance_name);
  if (agent) {
    try {
      if (parsed.data.decision === "approve") {
        await agent.approveSample({
          sampleId: decision.data.sample_id,
          workflowId: decision.data.workflow_id,
        });
      } else {
        await agent.rejectSample({
          sampleId: decision.data.sample_id,
          workflowId: decision.data.workflow_id,
        });
      }
    } catch (caught) {
      console.error("Managed profile approval workflow update failed", caught);
    }
  }
  return {
    ok: true as const,
    code: decision.data.code,
    data: {
      decision: parsed.data.decision,
      continueUrl:
        parsed.data.decision === "approve"
          ? `/invite/${encodeURIComponent(parsed.data.token)}`
          : "/",
    },
  };
}
