"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/features/auth/require-admin";
import {
  outreachDatabaseFailure,
  outreachFailure,
} from "@/features/outreach/action-result";
import { createOutreachAgent } from "@/features/outreach/agent";
import { sha256, uuidFromText } from "@/features/outreach/crypto";
import {
  fetchPublicBusinessSource,
  SourceFetchError,
} from "@/features/outreach/fetch-source";
import {
  extractVisibleBusinessTextFromScreenshot,
  sanitizeScreenshot,
} from "@/features/outreach/ocr";
import {
  classifyOutreachSource,
  requiresOperatorEvidence,
  sourceMayBeFetched,
} from "@/features/outreach/source-policy";
import { normalizeOutreachUrl } from "@/features/outreach/url-policy";
import { getCloudflareBindings } from "@/lib/cloudflare-bindings";
import { createBudgetedAiRuntime } from "@/features/ai-budget/runtime";
import {
  getSiteUrl,
  isDemoMode,
  isProductionSite,
  isSupabaseConfigured,
} from "@/lib/env";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { buildKnownFarmerGoogleResearch } from "./google-research-link";
import {
  addKnownFarmerSourceSchema,
  buildKnownFarmerProfileSchema,
  createKnownFarmerIntakeSchema,
  decideKnownFarmerCandidateSchema,
  knownFarmerIntakeIdSchema,
} from "./known-farmer-schemas";
import {
  candidateColumns,
  knownFarmerCandidateRowSchema,
  knownFarmerIntakeRowSchema,
} from "./known-farmer-queries";
import { generateAndSaveManagedProfileSample } from "./sample-service";
import { isSupportedOwnedSocialProfileUrl } from "./social-link-policy";
import type { ManagedProfileAgentInput } from "./schemas";
import {
  buildYouTubeFarmerQuery,
  searchKnownFarmerOnYouTube,
  YouTubeSearchError,
  youtubeSearchConfiguration,
} from "./youtube-search";

const createdIntakeSchema = z.object({
  code: z.enum(["CREATED", "IDEMPOTENT_REPLAY"]),
  intake_id: z.uuid(),
  revision: z.number().int().nonnegative(),
});

const youtubeReservationSchema = z.object({
  code: z.enum(["RESERVED", "IDEMPOTENT_REPLAY"]),
  search_id: z.uuid(),
});

const createdProspectSchema = z.object({
  code: z.string(),
  prospect_id: z.uuid(),
  revision: z.number().int().nonnegative(),
});

const linkedSampleSchema = z.object({
  code: z.enum(["LINKED", "IDEMPOTENT_REPLAY"]),
  revision: z.number().int().nonnegative(),
});

function firstRow(value: unknown) {
  return Array.isArray(value) ? value[0] : value;
}

function enabled() {
  return (
    isFeatureEnabled("ENABLE_OUTREACH_AGENT") &&
    isFeatureEnabled("ENABLE_PROFILE_RESEARCH_AGENT")
  );
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

async function configuredAdministrator() {
  if (!enabled()) return { failure: outreachFailure("FEATURE_DISABLED") };
  const administrator = await requireAdmin();
  if (administrator.demo || isDemoMode() || !isSupabaseConfigured()) {
    return { failure: outreachFailure("NOT_CONFIGURED") };
  }
  return { administrator };
}

async function loadOwnedIntake(
  intakeId: string,
  administratorId: string,
) {
  const result = await createAdminClient()
    .from("known_farmer_intakes")
    .select("*")
    .eq("id", intakeId)
    .eq("created_by", administratorId)
    .gt("retention_expires_at", new Date().toISOString())
    .maybeSingle();
  if (result.error || !result.data) return null;
  return knownFarmerIntakeRowSchema.safeParse(result.data).data ?? null;
}

async function loadYouTubeCandidates(intakeId: string, queryHash: string) {
  const result = await createAdminClient()
    .from("known_farmer_source_candidates")
    .select(candidateColumns)
    .eq("intake_id", intakeId)
    .eq("discovery_method", "youtube_data_api")
    .eq("provider_query_hash", queryHash)
    .gt("retention_expires_at", new Date().toISOString())
    .order("created_at", { ascending: true });
  if (result.error) return null;
  const parsed = z.array(knownFarmerCandidateRowSchema).safeParse(
    result.data ?? [],
  );
  return parsed.success ? parsed.data : null;
}

async function completeYouTubeSearch(
  searchId: string,
  state: "succeeded" | "failed",
  resultCount: number,
  failureCode?: string,
) {
  const supabase = await createClient();
  return supabase.rpc("complete_known_farmer_youtube_search", {
    search_id_input: searchId,
    outcome_input: {
      state,
      resultCount,
      ...(failureCode ? { failureCode } : {}),
    },
  });
}

export async function createKnownFarmerIntakeAction(input: unknown) {
  const parsed = createKnownFarmerIntakeSchema.safeParse(input);
  if (!parsed.success) {
    return outreachFailure("INVALID_INPUT", z.flattenError(parsed.error).fieldErrors);
  }
  const access = await configuredAdministrator();
  if (access.failure) return access.failure;

  const google = buildKnownFarmerGoogleResearch({
    fullName: parsed.data.fullName,
    locationHint: parsed.data.locationHint,
    farmingHint: parsed.data.farmingHint,
  });
  const supabase = await createClient();
  const result = await supabase.rpc("create_known_farmer_intake", {
    intake_input: {
      fullName: parsed.data.fullName,
      locationHint: parsed.data.locationHint,
      farmingHint: parsed.data.farmingHint,
      preferredLocale: parsed.data.preferredLocale,
      relationshipBasis: parsed.data.relationshipBasis,
      relationshipConfirmed: true,
      googleQueryHash: await sha256(google.query),
    },
    idempotency_key_input: parsed.data.idempotencyKey,
  });
  if (result.error) return outreachDatabaseFailure(result.error);
  const row = createdIntakeSchema.safeParse(firstRow(result.data));
  if (!row.success) return outreachFailure("DATA_UNAVAILABLE");
  revalidatePath("/admin/known-farmers");
  return {
    ok: true as const,
    code: row.data.code,
    data: {
      intakeId: row.data.intake_id,
      revision: row.data.revision,
      googleResearchUrl: google.url,
    },
  };
}

export async function searchKnownFarmerYouTubeAction(input: unknown) {
  const parsed = knownFarmerIntakeIdSchema.safeParse(input);
  if (!parsed.success) return outreachFailure("INVALID_INPUT");
  const access = await configuredAdministrator();
  if (access.failure) return access.failure;
  if (!youtubeSearchConfiguration().configured) {
    return outreachFailure("NOT_CONFIGURED");
  }
  const intake = await loadOwnedIntake(
    parsed.data.intakeId,
    access.administrator.id,
  );
  if (!intake || ["built", "rejected", "expired"].includes(intake.state)) {
    return outreachFailure("NOT_FOUND");
  }
  const query = buildYouTubeFarmerQuery({
    fullName: intake.subject_name,
    locationHint: intake.location_hint ?? undefined,
    farmingHint: intake.farming_hint ?? undefined,
  });
  const queryHash = await sha256(query);
  const userSupabase = await createClient();
  const reservationResult = await userSupabase.rpc(
    "reserve_known_farmer_youtube_search",
    {
      intake_id_input: intake.id,
      query_hash_input: queryHash,
      idempotency_key_input: parsed.data.idempotencyKey,
    },
  );
  if (reservationResult.error) {
    return outreachDatabaseFailure(reservationResult.error);
  }
  const reservation = youtubeReservationSchema.safeParse(
    firstRow(reservationResult.data),
  );
  if (!reservation.success) return outreachFailure("DATA_UNAVAILABLE");
  if (reservation.data.code === "IDEMPOTENT_REPLAY") {
    const ledger = await createAdminClient()
      .from("known_farmer_youtube_searches")
      .select("state, failure_code")
      .eq("id", reservation.data.search_id)
      .maybeSingle();
    if (ledger.error || !ledger.data) return outreachFailure("DATA_UNAVAILABLE");
    if (ledger.data.state === "reserved") {
      const retained = await loadYouTubeCandidates(intake.id, queryHash);
      if (!retained?.length) return outreachFailure("CONFLICT");
      const recovered = await completeYouTubeSearch(
        reservation.data.search_id,
        "succeeded",
        retained.length,
      );
      if (recovered.error) return outreachDatabaseFailure(recovered.error);
      revalidatePath("/admin/known-farmers");
      return {
        ok: true as const,
        code: "IDEMPOTENT_REPLAY",
        data: { candidates: retained, resultCount: retained.length },
      };
    }
    if (ledger.data.state === "failed") {
      return ledger.data.failure_code === "SEARCH_QUOTA_EXCEEDED"
        ? outreachFailure("SEARCH_QUOTA_EXCEEDED")
        : outreachFailure("SEARCH_UNAVAILABLE");
    }
    const existing = await loadYouTubeCandidates(intake.id, queryHash);
    if (!existing) return outreachFailure("DATA_UNAVAILABLE");
    return {
      ok: true as const,
      code: "IDEMPOTENT_REPLAY",
      data: { candidates: existing, resultCount: existing.length },
    };
  }

  let search;
  try {
    search = await searchKnownFarmerOnYouTube({
      fullName: intake.subject_name,
      locationHint: intake.location_hint ?? undefined,
      farmingHint: intake.farming_hint ?? undefined,
      preferredLocale: intake.preferred_locale,
    });
  } catch (caught) {
    const code =
      caught instanceof YouTubeSearchError ? caught.code : "SEARCH_UNAVAILABLE";
    await completeYouTubeSearch(
      reservation.data.search_id,
      "failed",
      0,
      code,
    );
    if (code === "QUOTA_EXCEEDED") {
      return outreachFailure("SEARCH_QUOTA_EXCEEDED");
    }
    if (code === "NOT_CONFIGURED" || code === "AUTHENTICATION_FAILED") {
      return outreachFailure("NOT_CONFIGURED");
    }
    return outreachFailure("SEARCH_UNAVAILABLE");
  }

  const collectedAt = new Date().toISOString();
  if (search.results.length) {
    const candidates = await Promise.all(
      search.results.map(async (candidate) => ({
        sourceUrl: candidate.sourceUrl,
        sourceType: candidate.sourceType,
        sourceTitle: candidate.sourceTitle,
        sourceText: candidate.sourceText,
        sourceHash: await sha256(
          `${candidate.sourceUrl}\n${candidate.sourceTitle}\n${candidate.sourceText}`,
        ),
        discoveryMethod: "youtube_data_api",
        subjectAssociation: candidate.defaultAssociation,
        providerItemId: candidate.providerItemId,
        providerQueryHash: queryHash,
        usageRightsBasis: candidate.usageRightsBasis,
        collectedAt,
        idempotencyKey: await uuidFromText(
          `known-farmer-youtube:${reservation.data.search_id}:${candidate.providerItemId}`,
        ),
      })),
    );
    const saved = await createAdminClient().rpc(
      "save_known_farmer_source_candidates",
      { intake_id_input: intake.id, candidates_input: candidates },
    );
    if (saved.error) {
      await completeYouTubeSearch(
        reservation.data.search_id,
        "failed",
        0,
        "PROVIDER_RESULT_WRITE_FAILED",
      );
      return outreachDatabaseFailure(saved.error);
    }
  }
  const completed = await completeYouTubeSearch(
    reservation.data.search_id,
    "succeeded",
    search.results.length,
  );
  if (completed.error) return outreachDatabaseFailure(completed.error);
  const candidates = await loadYouTubeCandidates(intake.id, queryHash);
  if (!candidates) return outreachFailure("DATA_UNAVAILABLE");
  revalidatePath("/admin/known-farmers");
  return {
    ok: true as const,
    code: "SEARCH_COMPLETED",
    data: { candidates, resultCount: candidates.length },
  };
}

export async function addKnownFarmerSourceAction(input: unknown) {
  const parsed = addKnownFarmerSourceSchema.safeParse(input);
  if (!parsed.success) {
    return outreachFailure("INVALID_INPUT", z.flattenError(parsed.error).fieldErrors);
  }
  const access = await configuredAdministrator();
  if (access.failure) return access.failure;
  const intake = await loadOwnedIntake(
    parsed.data.intakeId,
    access.administrator.id,
  );
  if (!intake || ["built", "rejected", "expired"].includes(intake.state)) {
    return outreachFailure("NOT_FOUND");
  }
  const sourceType = classifyOutreachSource(parsed.data.sourceUrl);
  if (sourceType === "unsupported") return outreachFailure("UNSUPPORTED_SOURCE");
  if (
    requiresOperatorEvidence(sourceType) &&
    !parsed.data.description &&
    !parsed.data.screenshotDataUrl
  ) {
    return outreachFailure("EVIDENCE_REQUIRED");
  }

  const requestHeaders = await headers();
  const requestHost =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  let sourceUrl: string;
  let sourceText = parsed.data.description ?? "";
  let sourceTitle: string | null = null;
  try {
    sourceUrl = normalizeOutreachUrl(parsed.data.sourceUrl);
    if (parsed.data.screenshotDataUrl) {
      const bindings = await getCloudflareBindings();
      if (!bindings?.IMAGES || !bindings.AI) {
        return outreachFailure("AI_UNAVAILABLE");
      }
      const screenshot = await sanitizeScreenshot(
        parsed.data.screenshotDataUrl,
        bindings.IMAGES,
      );
      sourceText = await extractVisibleBusinessTextFromScreenshot(
        screenshot,
        await createBudgetedAiRuntime(bindings),
      );
    } else if (sourceMayBeFetched(sourceType)) {
      const fetched = await fetchPublicBusinessSource(sourceUrl, {
        production: isProductionSite(requestHost),
      });
      sourceUrl = fetched.sourceUrl;
      sourceTitle = fetched.title;
      sourceText = fetched.text;
    }
  } catch (caught) {
    if (caught instanceof SourceFetchError) {
      return outreachFailure(
        caught.code === "BLOCKED_SOURCE" ? "BLOCKED_SOURCE" : "FETCH_FAILED",
      );
    }
    return outreachFailure("DATA_UNAVAILABLE");
  }
  sourceText = sourceText.trim().slice(0, 8_000);
  if (sourceText.length < 2) return outreachFailure("EVIDENCE_REQUIRED");
  const sourceHash = await sha256(
    `${sourceUrl}\n${sourceTitle ?? ""}\n${sourceText}`,
  );
  const candidate = {
    sourceUrl,
    sourceType,
    sourceTitle,
    sourceText,
    sourceHash,
    discoveryMethod: parsed.data.discoveryMethod,
    subjectAssociation:
      sourceType === "website"
        ? "professional_reference"
        : "third_party_coverage",
    providerItemId: null,
    providerQueryHash:
      parsed.data.discoveryMethod === "manual_google_review"
        ? intake.google_query_hash
        : null,
    usageRightsBasis:
      parsed.data.discoveryMethod === "manual_google_review"
        ? "operator_selected_destination"
        : "operator_supplied",
    collectedAt: new Date().toISOString(),
    idempotencyKey: parsed.data.idempotencyKey,
  };
  const saved = await createAdminClient().rpc(
    "save_known_farmer_source_candidates",
    { intake_id_input: intake.id, candidates_input: [candidate] },
  );
  if (saved.error) return outreachDatabaseFailure(saved.error);
  const result = await createAdminClient()
    .from("known_farmer_source_candidates")
    .select(candidateColumns)
    .eq("intake_id", intake.id)
    .eq("source_hash", sourceHash)
    .maybeSingle();
  const row = knownFarmerCandidateRowSchema.safeParse(result.data);
  if (result.error || !row.success) return outreachFailure("DATA_UNAVAILABLE");
  revalidatePath("/admin/known-farmers");
  return { ok: true as const, code: "SOURCE_SAVED", data: row.data };
}

export async function decideKnownFarmerCandidateAction(input: unknown) {
  const parsed = decideKnownFarmerCandidateSchema.safeParse(input);
  if (!parsed.success) return outreachFailure("INVALID_INPUT");
  const access = await configuredAdministrator();
  if (access.failure) return access.failure;
  const supabase = await createClient();
  const result = await supabase.rpc("decide_known_farmer_source_candidate", {
    intake_id_input: parsed.data.intakeId,
    candidate_id_input: parsed.data.candidateId,
    decision_input: parsed.data.decision,
    subject_association_input: parsed.data.subjectAssociation,
    expected_revision_input: parsed.data.expectedRevision,
    idempotency_key_input: parsed.data.idempotencyKey,
  });
  if (result.error) return outreachDatabaseFailure(result.error);
  revalidatePath("/admin/known-farmers");
  return { ok: true as const, code: "CANDIDATE_UPDATED", data: firstRow(result.data) };
}

export async function buildKnownFarmerProfileAction(input: unknown) {
  const parsed = buildKnownFarmerProfileSchema.safeParse(input);
  if (!parsed.success) return outreachFailure("INVALID_INPUT");
  const access = await configuredAdministrator();
  if (access.failure) return access.failure;
  const intake = await loadOwnedIntake(
    parsed.data.intakeId,
    access.administrator.id,
  );
  if (!intake) return outreachFailure("NOT_FOUND");
  if (intake.state === "built" && intake.sample_id && intake.prospect_id) {
    return {
      ok: true as const,
      code: "IDEMPOTENT_REPLAY",
      data: { sampleId: intake.sample_id, prospectId: intake.prospect_id },
    };
  }
  if (intake.state !== "ready_to_build") return outreachFailure("CONFLICT");
  const selectedResult = await createAdminClient()
    .from("known_farmer_source_candidates")
    .select(candidateColumns)
    .eq("intake_id", intake.id)
    .eq("decision", "selected")
    .gt("retention_expires_at", new Date().toISOString())
    .order("created_at", { ascending: true });
  const selected = z.array(knownFarmerCandidateRowSchema).safeParse(
    selectedResult.data ?? [],
  );
  if (selectedResult.error || !selected.success || !selected.data.length) {
    return outreachFailure("EVIDENCE_REQUIRED");
  }
  const ordered = [...selected.data].sort((left, right) =>
    left.subject_association === right.subject_association
      ? 0
      : left.subject_association === "owned_social_profile"
        ? -1
        : 1,
  ).slice(0, 12);
  if (
    !ordered.some(
      (candidate) =>
        candidate.subject_association === "owned_social_profile" &&
        isSupportedOwnedSocialProfileUrl(
          candidate.source_url,
          candidate.source_type,
        ),
    )
  ) {
    return outreachFailure("EVIDENCE_REQUIRED");
  }
  const evidence: ManagedProfileAgentInput["evidence"] = ordered.map(
    (candidate) => ({
      sourceUrl: candidate.source_url,
      sourceType: candidate.source_type,
      sourceTitle: candidate.source_title ?? undefined,
      sourceText: candidate.source_excerpt,
      sourceHash: candidate.source_hash,
      collectedAt: new Date(candidate.collected_at).toISOString(),
      subjectAssociation: candidate.subject_association,
      discoveryProvider: candidate.discovery_method,
      providerQueryHash: candidate.provider_query_hash ?? undefined,
      providerItemId: candidate.provider_item_id ?? undefined,
      usageRightsBasis: candidate.usage_rights_basis,
    }),
  );
  const bindings = await getCloudflareBindings();
  const analysis = await createOutreachAgent(
    await createBudgetedAiRuntime(bindings),
  ).analyze({
    sourceText: evidence
      .map((item) => `${item.sourceTitle ?? ""}\n${item.sourceText}`)
      .join("\n\n"),
    businessName: intake.subject_name,
    preferredLocale: intake.preferred_locale,
  });
  const sourceFingerprint = await sha256(
    JSON.stringify({
      intakeId: intake.id,
      sourceHashes: evidence.map((item) => item.sourceHash),
    }),
  );
  const userSupabase = await createClient();
  const created = await userSupabase.rpc("create_outreach_prospect", {
    prospect_input: {
      sourceUrl: evidence[0].sourceUrl,
      applicationOrigin: await requestOrigin(),
      sourceType: evidence[0].sourceType,
      sourceTitle: evidence[0].sourceTitle,
      sourceExcerpt: evidence[0].sourceText,
      sourceHash: sourceFingerprint,
      businessName: intake.subject_name,
      operatorContext: `Known Farmer Intake ${intake.id}; sources manually reviewed by a FarmerBook administrator.`,
      contactReady: false,
      suggestedRole: "farmer",
      preferredLocale: intake.preferred_locale,
      categorySlugs: analysis.categorySlugs,
      rationale: analysis.rationale,
      introductionDraft: analysis.introductionDraft,
      contactCandidates: [],
      agentRuns: [{ runType: "qualification", ...analysis.run }],
    },
    idempotency_key_input: await uuidFromText(
      `known-farmer-prospect:${parsed.data.idempotencyKey}`,
    ),
  });
  if (created.error) return outreachDatabaseFailure(created.error);
  const prospect = createdProspectSchema.safeParse(firstRow(created.data));
  if (!prospect.success) return outreachFailure("DATA_UNAVAILABLE");
  const storageEvidence = evidence.map((item) => ({
    sourceUrl: item.sourceUrl,
    sourceType: item.sourceType,
    sourceTitle: item.sourceTitle,
    sourceText: item.sourceText,
    sourceHash: item.sourceHash,
    collectedAt: item.collectedAt,
  }));
  const adminSupabase = createAdminClient();
  const sample = await generateAndSaveManagedProfileSample({
    supabase: adminSupabase,
    prospectId: prospect.data.prospect_id,
    subjectName: intake.subject_name,
    preferredLocale: intake.preferred_locale,
    evidence,
    storageEvidence,
    idempotencyKey: await uuidFromText(
      `known-farmer-sample:${parsed.data.idempotencyKey}`,
    ),
  });
  if (!sample.ok) return sample;
  const provenance = await adminSupabase.rpc(
    "apply_known_farmer_sample_source_provenance",
    { intake_id_input: intake.id, sample_id_input: sample.data.sampleId },
  );
  if (provenance.error) return outreachDatabaseFailure(provenance.error);
  const linked = await adminSupabase.rpc("link_known_farmer_intake_sample", {
    intake_id_input: intake.id,
    prospect_id_input: prospect.data.prospect_id,
    sample_id_input: sample.data.sampleId,
    build_idempotency_key_input: parsed.data.idempotencyKey,
  });
  if (linked.error) return outreachDatabaseFailure(linked.error);
  const linkedRow = linkedSampleSchema.safeParse(firstRow(linked.data));
  if (!linkedRow.success) return outreachFailure("DATA_UNAVAILABLE");
  revalidatePath("/admin/known-farmers");
  return {
    ok: true as const,
    code: linkedRow.data.code,
    data: {
      prospectId: prospect.data.prospect_id,
      sampleId: sample.data.sampleId,
      workflowId: sample.data.workflowId,
      sample: sample.data.sample,
    },
  };
}
