"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/features/auth/require-admin";
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
import {
  buildYouTubeFarmerQuery,
  searchKnownFarmerOnYouTube,
  YouTubeSearchError,
  youtubeSearchConfiguration,
} from "@/features/profile-agent/youtube-search";
import { getCloudflareBindings } from "@/lib/cloudflare-bindings";
import { createBudgetedAiRuntime } from "@/features/ai-budget/runtime";
import { isDemoMode, isProductionSite, isSupabaseConfigured } from "@/lib/env";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  featuredFarmerDatabaseFailure,
  featuredFarmerFailure,
} from "./action-result";
import {
  addFeaturedFarmerSourceSchema,
  confirmFeaturedFarmerSocialSchema,
  createFeaturedFarmerResearchSchema,
  decideFeaturedFarmerSourceSchema,
  featuredFarmerResearchIdSchema,
  publishFeaturedFarmerSchema,
  removeFeaturedFarmerSocialSchema,
  saveFeaturedFarmerDraftSchema,
  withdrawFeaturedFarmerSchema,
} from "./schemas";
import {
  canonicalPublisherHost,
  validateOwnedSocialSource,
} from "./source-policy";
import {
  featuredFarmerResearchRowSchema,
  featuredFarmerSourceRowSchema,
} from "./queries";
import { buildFeaturedFarmerResearchQueries } from "./web-research";

const createdResearchSchema = z.object({
  code: z.enum(["CREATED", "IDEMPOTENT_REPLAY"]),
  research_id: z.uuid(),
  revision: z.number().int().nonnegative(),
});

const createdSourceSchema = z.object({
  code: z.enum(["CREATED", "IDEMPOTENT_REPLAY"]),
  source_id: z.uuid(),
  revision: z.number().int().nonnegative(),
});

const youtubeReservationSchema = z.object({
  code: z.enum(["RESERVED", "IDEMPOTENT_REPLAY"]),
  search_id: z.uuid(),
});

const draftResultSchema = z.object({
  code: z.enum(["SAVED", "REVIEW_READY", "IDEMPOTENT_REPLAY"]),
  draft_id: z.uuid(),
  ready: z.boolean(),
  blockers: z.array(z.string()),
  revision: z.number().int().nonnegative(),
});

const readinessResultSchema = z.object({
  code: z.string(),
  ready: z.boolean(),
  blockers: z.array(z.string()),
  revision: z.number().int().nonnegative(),
});

const publishResultSchema = z.object({
  code: z.enum(["PUBLISHED", "IDEMPOTENT_REPLAY"]),
  slug: z.string(),
  publication_revision: z.number().int().positive(),
  revision: z.number().int().nonnegative(),
});

function firstRow(value: unknown) {
  return Array.isArray(value) ? value[0] : value;
}

function enabled() {
  return isFeatureEnabled("ENABLE_FEATURED_FARMER_PROFILES");
}

async function configuredAdministrator() {
  if (!enabled()) return { failure: featuredFarmerFailure("FEATURE_DISABLED") };
  const administrator = await requireAdmin();
  if (administrator.demo || isDemoMode() || !isSupabaseConfigured()) {
    return { failure: featuredFarmerFailure("NOT_CONFIGURED") };
  }
  return { administrator };
}

async function loadOwnedResearch(researchId: string, administratorId: string) {
  const result = await createAdminClient()
    .from("featured_farmer_research")
    .select("*")
    .eq("id", researchId)
    .eq("created_by", administratorId)
    .gt("retention_expires_at", new Date().toISOString())
    .maybeSingle();
  if (result.error || !result.data) return null;
  return featuredFarmerResearchRowSchema.safeParse(result.data).data ?? null;
}

function revalidateNewsroom(researchId?: string) {
  revalidatePath("/admin/featured-farmers");
  if (researchId) revalidatePath(`/admin/featured-farmers/${researchId}`);
}

export async function createFeaturedFarmerResearchAction(input: unknown) {
  const parsed = createFeaturedFarmerResearchSchema.safeParse(input);
  if (!parsed.success) {
    return featuredFarmerFailure(
      "INVALID_INPUT",
      z.flattenError(parsed.error).fieldErrors,
    );
  }
  const access = await configuredAdministrator();
  if (access.failure) return access.failure;
  const queries = buildFeaturedFarmerResearchQueries({
    fullName: parsed.data.fullName,
    ...(parsed.data.districtHint
      ? { districtHint: parsed.data.districtHint }
      : {}),
    ...(parsed.data.stateHint ? { stateHint: parsed.data.stateHint } : {}),
    ...(parsed.data.farmingHint
      ? { farmingHint: parsed.data.farmingHint }
      : {}),
  });
  const queryFingerprints = Object.fromEntries(
    await Promise.all(
      queries.map(async (query) => [query.purpose, await sha256(query.query)]),
    ),
  );
  const { idempotencyKey, ...researchInput } = parsed.data;
  const supabase = await createClient();
  const result = await supabase.rpc("create_featured_farmer_research", {
    research_input: { ...researchInput, queryFingerprints },
    idempotency_key_input: idempotencyKey,
  });
  if (result.error) return featuredFarmerDatabaseFailure(result.error);
  const row = createdResearchSchema.safeParse(firstRow(result.data));
  if (!row.success) return featuredFarmerFailure("DATA_UNAVAILABLE");
  revalidateNewsroom(row.data.research_id);
  return {
    ok: true as const,
    code: row.data.code,
    data: {
      researchId: row.data.research_id,
      revision: row.data.revision,
      queries,
    },
  };
}

export async function addFeaturedFarmerSourceAction(input: unknown) {
  const parsed = addFeaturedFarmerSourceSchema.safeParse(input);
  if (!parsed.success) {
    return featuredFarmerFailure(
      "INVALID_INPUT",
      z.flattenError(parsed.error).fieldErrors,
    );
  }
  const access = await configuredAdministrator();
  if (access.failure) return access.failure;
  const research = await loadOwnedResearch(
    parsed.data.researchId,
    access.administrator.id,
  );
  if (!research || ["published", "expired"].includes(research.state)) {
    return featuredFarmerFailure("NOT_FOUND");
  }
  const sourceType = classifyOutreachSource(parsed.data.sourceUrl);
  if (sourceType === "unsupported") {
    return featuredFarmerFailure("UNSUPPORTED_SOURCE");
  }
  if (
    requiresOperatorEvidence(sourceType) &&
    !parsed.data.description &&
    !parsed.data.screenshotDataUrl
  ) {
    return featuredFarmerFailure("EVIDENCE_REQUIRED");
  }
  if (
    parsed.data.subjectAssociation === "owned_social_profile" &&
    !validateOwnedSocialSource({
      sourceUrl: parsed.data.sourceUrl,
      sourceType,
      subjectAssociation: parsed.data.subjectAssociation,
      sourceQuality: parsed.data.sourceQuality,
    })
  ) {
    return featuredFarmerFailure("INVALID_INPUT");
  }
  if (
    (parsed.data.subjectAssociation === "owned_social_profile") !==
    (parsed.data.sourceQuality === "owned_social_profile")
  ) {
    return featuredFarmerFailure("INVALID_INPUT");
  }

  const requestHeaders = await headers();
  const requestHost =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  let sourceUrl = normalizeOutreachUrl(parsed.data.sourceUrl);
  let sourceExcerpt = parsed.data.description ?? "";
  let sourceTitle = parsed.data.sourceTitle;
  try {
    if (parsed.data.screenshotDataUrl) {
      const bindings = await getCloudflareBindings();
      if (!bindings?.IMAGES || !bindings.AI) {
        return featuredFarmerFailure("EVIDENCE_REQUIRED");
      }
      const screenshot = await sanitizeScreenshot(
        parsed.data.screenshotDataUrl,
        bindings.IMAGES,
      );
      sourceExcerpt = await extractVisibleBusinessTextFromScreenshot(
        screenshot,
        await createBudgetedAiRuntime(bindings),
      );
    } else if (!sourceExcerpt && sourceMayBeFetched(sourceType)) {
      const fetched = await fetchPublicBusinessSource(sourceUrl, {
        production: isProductionSite(requestHost),
      });
      sourceUrl = fetched.sourceUrl;
      sourceTitle = fetched.title || sourceTitle;
      sourceExcerpt = fetched.text;
    }
  } catch (caught) {
    if (caught instanceof SourceFetchError) {
      return featuredFarmerFailure(
        caught.code === "BLOCKED_SOURCE" ? "BLOCKED_SOURCE" : "FETCH_FAILED",
      );
    }
    return featuredFarmerFailure("DATA_UNAVAILABLE");
  }
  sourceExcerpt = sourceExcerpt.trim().slice(0, 8_000);
  if (sourceExcerpt.length < 20) {
    return featuredFarmerFailure("EVIDENCE_REQUIRED");
  }
  const sourceHash = await sha256(
    `${sourceUrl}\n${sourceTitle}\n${sourceExcerpt}`,
  );
  const providerQueryHash = parsed.data.researchPurpose
    ? research.query_fingerprints[parsed.data.researchPurpose]
    : null;
  const supabase = await createClient();
  const result = await supabase.rpc("save_featured_farmer_source", {
    source_input: {
      researchId: research.id,
      sourceUrl,
      publisherHost: canonicalPublisherHost(sourceUrl),
      publisherName: parsed.data.publisher,
      sourceTitle,
      sourcePublishedAt: parsed.data.publishedAt ?? null,
      sourceType,
      sourceExcerpt,
      sourceHash,
      discoveryMethod: parsed.data.discoveryMethod,
      sourceQuality: parsed.data.sourceQuality,
      subjectAssociation: parsed.data.subjectAssociation,
      providerQueryHash,
      usageRightsBasis:
        parsed.data.discoveryMethod === "manual_google_review"
          ? "operator_selected_destination"
          : "operator_supplied",
      collectedAt: new Date().toISOString(),
    },
    idempotency_key_input: parsed.data.idempotencyKey,
  });
  if (result.error) return featuredFarmerDatabaseFailure(result.error);
  const row = createdSourceSchema.safeParse(firstRow(result.data));
  if (!row.success) return featuredFarmerFailure("DATA_UNAVAILABLE");
  const sourceResult = await createAdminClient()
    .from("featured_farmer_sources")
    .select("*")
    .eq("id", row.data.source_id)
    .maybeSingle();
  const source = featuredFarmerSourceRowSchema.safeParse(sourceResult.data);
  if (sourceResult.error || !source.success) {
    return featuredFarmerFailure("DATA_UNAVAILABLE");
  }
  revalidateNewsroom(research.id);
  return { ok: true as const, code: row.data.code, data: source.data };
}

export async function decideFeaturedFarmerSourceAction(input: unknown) {
  const parsed = decideFeaturedFarmerSourceSchema.safeParse(input);
  if (!parsed.success) return featuredFarmerFailure("INVALID_INPUT");
  const access = await configuredAdministrator();
  if (access.failure) return access.failure;
  const supabase = await createClient();
  const result = await supabase.rpc("decide_featured_farmer_source", {
    source_id_input: parsed.data.sourceId,
    decision_input: parsed.data.decision,
    source_quality_input: parsed.data.sourceQuality,
    subject_association_input: parsed.data.subjectAssociation,
    expected_revision_input: parsed.data.expectedRevision,
    idempotency_key_input: parsed.data.idempotencyKey,
  });
  if (result.error) return featuredFarmerDatabaseFailure(result.error);
  revalidateNewsroom(parsed.data.researchId);
  return { ok: true as const, code: "SOURCE_UPDATED", data: firstRow(result.data) };
}

async function completeYouTubeSearch(
  searchId: string,
  state: "succeeded" | "failed",
  resultCount: number,
  failureCode?: string,
) {
  const supabase = await createClient();
  return supabase.rpc("complete_featured_farmer_youtube_search", {
    search_id_input: searchId,
    outcome_input: {
      state,
      resultCount,
      ...(failureCode ? { failureCode } : {}),
    },
  });
}

export async function searchFeaturedFarmerYouTubeAction(input: unknown) {
  const parsed = featuredFarmerResearchIdSchema.safeParse(input);
  if (!parsed.success) return featuredFarmerFailure("INVALID_INPUT");
  const access = await configuredAdministrator();
  if (access.failure) return access.failure;
  if (!youtubeSearchConfiguration().configured) {
    return featuredFarmerFailure("NOT_CONFIGURED");
  }
  const research = await loadOwnedResearch(
    parsed.data.researchId,
    access.administrator.id,
  );
  if (!research || ["published", "expired"].includes(research.state)) {
    return featuredFarmerFailure("NOT_FOUND");
  }
  const locationHint = [research.district_hint, research.state_hint]
    .filter(Boolean)
    .join(", ");
  const query = buildYouTubeFarmerQuery({
    fullName: research.subject_name,
    ...(locationHint ? { locationHint } : {}),
    ...(research.farming_hint ? { farmingHint: research.farming_hint } : {}),
  });
  const queryHash = await sha256(query);
  const userSupabase = await createClient();
  const reservationResult = await userSupabase.rpc(
    "reserve_featured_farmer_youtube_search",
    {
      research_id_input: research.id,
      query_hash_input: queryHash,
      idempotency_key_input: parsed.data.idempotencyKey,
    },
  );
  if (reservationResult.error) {
    return featuredFarmerDatabaseFailure(reservationResult.error);
  }
  const reservation = youtubeReservationSchema.safeParse(
    firstRow(reservationResult.data),
  );
  if (!reservation.success) return featuredFarmerFailure("DATA_UNAVAILABLE");
  if (reservation.data.code === "IDEMPOTENT_REPLAY") {
    revalidateNewsroom(research.id);
    return {
      ok: true as const,
      code: "IDEMPOTENT_REPLAY",
      data: { resultCount: 0 },
    };
  }

  let search;
  try {
    search = await searchKnownFarmerOnYouTube({
      fullName: research.subject_name,
      ...(locationHint ? { locationHint } : {}),
      ...(research.farming_hint ? { farmingHint: research.farming_hint } : {}),
      preferredLocale: research.preferred_locale,
    });
  } catch (caught) {
    const code =
      caught instanceof YouTubeSearchError ? caught.code : "SEARCH_UNAVAILABLE";
    await completeYouTubeSearch(reservation.data.search_id, "failed", 0, code);
    if (code === "QUOTA_EXCEEDED") {
      return featuredFarmerFailure("SEARCH_QUOTA_EXCEEDED");
    }
    if (code === "NOT_CONFIGURED" || code === "AUTHENTICATION_FAILED") {
      return featuredFarmerFailure("NOT_CONFIGURED");
    }
    return featuredFarmerFailure("SEARCH_UNAVAILABLE");
  }
  const collectedAt = new Date().toISOString();
  if (search.results.length) {
    const candidates = await Promise.all(
      search.results.map(async (candidate) => {
        const excerpt = `${candidate.sourceTitle}. ${candidate.sourceText}`
          .trim()
          .slice(0, 8_000)
          .padEnd(20, ".");
        return {
          sourceUrl: candidate.sourceUrl,
          sourceTitle: candidate.sourceTitle,
          sourceExcerpt: excerpt,
          sourceHash: await sha256(
            `${candidate.sourceUrl}\n${candidate.sourceTitle}\n${excerpt}`,
          ),
          providerItemId: candidate.providerItemId,
          providerQueryHash: queryHash,
          collectedAt,
          idempotencyKey: await uuidFromText(
            `featured-farmer-youtube:${reservation.data.search_id}:${candidate.providerItemId}`,
          ),
        };
      }),
    );
    const saved = await createAdminClient().rpc(
      "save_featured_farmer_youtube_candidates",
      { research_id_input: research.id, candidates_input: candidates },
    );
    if (saved.error) {
      await completeYouTubeSearch(
        reservation.data.search_id,
        "failed",
        0,
        "PROVIDER_RESULT_WRITE_FAILED",
      );
      return featuredFarmerDatabaseFailure(saved.error);
    }
  }
  const completed = await completeYouTubeSearch(
    reservation.data.search_id,
    "succeeded",
    search.results.length,
  );
  if (completed.error) return featuredFarmerDatabaseFailure(completed.error);
  revalidateNewsroom(research.id);
  return {
    ok: true as const,
    code: "SEARCH_COMPLETED",
    data: { resultCount: search.results.length },
  };
}

export async function saveFeaturedFarmerDraftAction(input: unknown) {
  const parsed = saveFeaturedFarmerDraftSchema.safeParse(input);
  if (!parsed.success) {
    return featuredFarmerFailure(
      "INVALID_INPUT",
      z.flattenError(parsed.error).fieldErrors,
    );
  }
  const access = await configuredAdministrator();
  if (access.failure) return access.failure;
  const { idempotencyKey, ...draftInput } = parsed.data;
  const supabase = await createClient();
  const result = await supabase.rpc("save_featured_farmer_draft", {
    draft_input: draftInput,
    idempotency_key_input: idempotencyKey,
  });
  if (result.error) return featuredFarmerDatabaseFailure(result.error);
  const row = draftResultSchema.safeParse(firstRow(result.data));
  if (!row.success) return featuredFarmerFailure("DATA_UNAVAILABLE");
  revalidateNewsroom(parsed.data.researchId);
  return { ok: true as const, code: row.data.code, data: row.data };
}

export async function confirmFeaturedFarmerSocialAction(input: unknown) {
  const parsed = confirmFeaturedFarmerSocialSchema.safeParse(input);
  if (!parsed.success) return featuredFarmerFailure("INVALID_INPUT");
  const access = await configuredAdministrator();
  if (access.failure) return access.failure;
  const supabase = await createClient();
  const result = await supabase.rpc("confirm_featured_farmer_social", {
    source_id_input: parsed.data.sourceId,
    platform_input: parsed.data.platform,
    ownership_basis_input: parsed.data.ownershipBasis,
    display_order_input: parsed.data.displayOrder,
    idempotency_key_input: parsed.data.idempotencyKey,
  });
  if (result.error) return featuredFarmerDatabaseFailure(result.error);
  const row = readinessResultSchema.safeParse(firstRow(result.data));
  if (!row.success) return featuredFarmerFailure("DATA_UNAVAILABLE");
  revalidateNewsroom(parsed.data.researchId);
  return { ok: true as const, code: row.data.code, data: row.data };
}

export async function removeFeaturedFarmerSocialAction(input: unknown) {
  const parsed = removeFeaturedFarmerSocialSchema.safeParse(input);
  if (!parsed.success) return featuredFarmerFailure("INVALID_INPUT");
  const access = await configuredAdministrator();
  if (access.failure) return access.failure;
  const supabase = await createClient();
  const result = await supabase.rpc("remove_featured_farmer_social", {
    research_id_input: parsed.data.researchId,
    platform_input: parsed.data.platform,
    expected_revision_input: parsed.data.expectedRevision,
    idempotency_key_input: parsed.data.idempotencyKey,
  });
  if (result.error) return featuredFarmerDatabaseFailure(result.error);
  const row = readinessResultSchema.safeParse(firstRow(result.data));
  if (!row.success) return featuredFarmerFailure("DATA_UNAVAILABLE");
  revalidateNewsroom(parsed.data.researchId);
  return { ok: true as const, code: row.data.code, data: row.data };
}

export async function publishFeaturedFarmerAction(input: unknown) {
  const parsed = publishFeaturedFarmerSchema.safeParse(input);
  if (!parsed.success) return featuredFarmerFailure("INVALID_INPUT");
  const access = await configuredAdministrator();
  if (access.failure) return access.failure;
  const supabase = await createClient();
  const result = await supabase.rpc("publish_featured_farmer", {
    research_id_input: parsed.data.researchId,
    expected_revision_input: parsed.data.expectedRevision,
    fact_checked_at_input: parsed.data.factCheckedAt,
    idempotency_key_input: parsed.data.idempotencyKey,
  });
  if (result.error) return featuredFarmerDatabaseFailure(result.error);
  const row = publishResultSchema.safeParse(firstRow(result.data));
  if (!row.success) return featuredFarmerFailure("DATA_UNAVAILABLE");
  revalidateNewsroom(parsed.data.researchId);
  revalidatePath("/featured-farmers");
  revalidatePath(`/featured-farmers/${row.data.slug}`);
  return { ok: true as const, code: row.data.code, data: row.data };
}

export async function withdrawFeaturedFarmerAction(input: unknown) {
  const parsed = withdrawFeaturedFarmerSchema.safeParse(input);
  if (!parsed.success) return featuredFarmerFailure("INVALID_INPUT");
  const access = await configuredAdministrator();
  if (access.failure) return access.failure;
  const supabase = await createClient();
  const result = await supabase.rpc("withdraw_featured_farmer", {
    research_id_input: parsed.data.researchId,
    reason_input: parsed.data.reason,
    expected_revision_input: parsed.data.expectedRevision,
    idempotency_key_input: parsed.data.idempotencyKey,
  });
  if (result.error) return featuredFarmerDatabaseFailure(result.error);
  const row = z
    .object({
      code: z.enum(["WITHDRAWN", "IDEMPOTENT_REPLAY"]),
      slug: z.string(),
      revision: z.number().int().nonnegative(),
    })
    .safeParse(firstRow(result.data));
  if (!row.success) return featuredFarmerFailure("DATA_UNAVAILABLE");
  revalidateNewsroom(parsed.data.researchId);
  revalidatePath("/featured-farmers");
  revalidatePath(`/featured-farmers/${row.data.slug}`);
  return { ok: true as const, code: row.data.code, data: row.data };
}
