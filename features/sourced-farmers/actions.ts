"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { sha256, uuidFromText } from "@/features/outreach/crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSourcedFarmerResearchOwner } from "./access";
import { normalizeYouTubeChannelSeed } from "./channel-seed";
import {
  durableSourcedFarmerProfileInputSchema,
  sourcedFarmerSeedRunInputSchema,
} from "./schemas";
import {
  runSourcedFarmerYouTubeBatch,
  SourcedFarmerRunnerError,
} from "./runner";
import {
  createYouTubeClient,
  YouTubeClientError,
} from "./youtube-client";

const messages = {
  FEATURE_DISABLED: "Private sourced Farmer research is disabled.",
  NOT_CONFIGURED: "Private sourced Farmer research is not configured.",
  FORBIDDEN: "This research workspace is private to its owner administrator.",
  INVALID_INPUT: "Check the supplied evidence and try again.",
  NOT_FOUND: "That private research record is no longer available.",
  CONFLICT: "This record changed. Refresh before making another decision.",
  QUOTA_EXCEEDED: "The bounded YouTube research quota has been reached.",
  PROVIDER_UNAVAILABLE: "YouTube research is temporarily unavailable.",
  DATA_UNAVAILABLE: "The sourced Farmer research request could not be completed.",
} as const;

type FailureCode = keyof typeof messages;
type ActionResult<T> =
  | { ok: true; code: string; data: T }
  | { ok: false; code: FailureCode; message: string; fieldErrors?: Record<string, readonly string[]> };

function failure(
  code: FailureCode,
  fieldErrors?: Record<string, readonly string[]>,
): ActionResult<never> {
  return {
    ok: false,
    code,
    message: messages[code],
    ...(fieldErrors ? { fieldErrors } : {}),
  };
}

function databaseFailure(error: unknown) {
  const details = typeof error === "object" && error && "details" in error
    ? String(error.details)
    : "";
  const code = typeof error === "object" && error && "code" in error
    ? String(error.code)
    : "";
  if (details.includes("FEATURE_DISABLED")) return failure("FEATURE_DISABLED");
  if (details.includes("NOT_FOUND")) return failure("NOT_FOUND");
  if (details.includes("QUOTA")) return failure("QUOTA_EXCEEDED");
  if (details.includes("REVISION_CONFLICT")) return failure("CONFLICT");
  if (code === "42501") return failure("FORBIDDEN");
  if (code === "22023" || code === "23514") return failure("INVALID_INPUT");
  if (code === "23505") return failure("CONFLICT");
  return failure("DATA_UNAVAILABLE");
}

async function ownerAccess() {
  const access = await requireSourcedFarmerResearchOwner();
  return access.ok ? access : { ...access, error: failure(access.code) };
}

async function stageIdempotencyKey(root: string, stage: string) {
  return uuidFromText(`sourced-farmer:${root}:${stage}`);
}

function providerFailureCode(error: unknown): FailureCode {
  if (
    error instanceof SourcedFarmerRunnerError &&
    error.code === "QUOTA_RESERVATION_FAILED"
  ) return "QUOTA_EXCEEDED";
  if (error instanceof YouTubeClientError && error.code === "NOT_CONFIGURED") {
    return "NOT_CONFIGURED";
  }
  if (error instanceof YouTubeClientError && error.code === "QUOTA_EXCEEDED") {
    return "QUOTA_EXCEEDED";
  }
  if (
    error instanceof SourcedFarmerRunnerError && error.code === "INVALID_INPUT"
  ) return "INVALID_INPUT";
  return "PROVIDER_UNAVAILABLE";
}

export async function runSourcedFarmerDiscoveryAction(rawInput: unknown) {
  const parsed = sourcedFarmerSeedRunInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return failure("INVALID_INPUT", z.flattenError(parsed.error).fieldErrors);
  }
  const access = await ownerAccess();
  if (!access.ok) return access.error;
  const supabase = createAdminClient();
  let normalizedSeed: ReturnType<typeof normalizeYouTubeChannelSeed>;
  try {
    normalizedSeed = normalizeYouTubeChannelSeed(parsed.data.channelSeed);
  } catch {
    return failure("INVALID_INPUT");
  }
  const seedHash = await sha256(JSON.stringify(normalizedSeed));
  const [previousRun, knownVideos] = await Promise.all([
    supabase.from("farmer_source_discovery_runs")
      .select("checkpoint_token")
      .eq("owner_id", access.administrator.id)
      .eq("seed_channel_hash", seedHash)
      .in("state", ["succeeded", "failed"])
      .order("requested_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("farmer_source_videos")
      .select("provider_video_id")
      .eq("owner_id", access.administrator.id)
      .gt("retention_expires_at", new Date().toISOString())
      .limit(5_000),
  ]);
  if (previousRun.error || knownVideos.error) {
    return failure("DATA_UNAVAILABLE");
  }
  let runId = "";
  const reserveQuota = async () => {
    const reservation = await supabase.rpc("reserve_sourced_farmer_discovery", {
      owner_id_input: access.administrator.id,
      seed_channel_hash_input: seedHash,
      idempotency_key_input: parsed.data.idempotencyKey,
    });
    const row = reservation.data?.[0];
    if (reservation.error || !row) return { ok: false as const };
    runId = String(row.run_id);
    return { ok: true as const };
  };
  try {
    const result = await runSourcedFarmerYouTubeBatch(
      {
        ...parsed.data,
        pageToken: parsed.data.pageToken ??
          (previousRun.data?.checkpoint_token
            ? String(previousRun.data.checkpoint_token)
            : undefined),
        knownVideoIds: parsed.data.knownVideoIds.length
          ? parsed.data.knownVideoIds
          : (knownVideos.data ?? []).map((row) => String(row.provider_video_id)),
      },
      { client: createYouTubeClient(), reserveQuota },
    );
    if (!runId) return failure("DATA_UNAVAILABLE");
    const persistence = result.persistence;
    const batchIdempotencyKey = await stageIdempotencyKey(
      parsed.data.idempotencyKey,
      "batch",
    );
    const saved = await supabase.rpc("save_sourced_farmer_discovery_batch", {
      owner_id_input: access.administrator.id,
      run_id_input: runId,
      batch_input: {
        providerChannelId: persistence.channelId,
        channelUrl: persistence.canonicalChannelUrl,
        channelFingerprint: await sha256(
          `youtube-channel:${persistence.channelId}`,
        ),
        collectedAt: persistence.refreshedAt,
        refreshDueAt: persistence.expiresAt,
        retentionExpiresAt: persistence.expiresAt,
        topicSlugs: [...new Set(
          persistence.videos.flatMap((video) => video.topicSlugs),
        )],
        actorCounts: persistence.videos.reduce<Record<string, number>>(
          (counts, video) => {
            for (const [actor, count] of Object.entries(video.actorCounts)) {
              counts[actor] = (counts[actor] ?? 0) + count;
            }
            return counts;
          },
          {},
        ),
        nextCheckpoint: persistence.nextPageToken,
        pageNumber: persistence.counts.pagesFetched,
        videos: persistence.videos.map((video) => ({
          providerVideoId: video.videoId,
          videoUrl: video.canonicalVideoUrl,
          publishedAt: video.publishedAt,
          topicSlugs: video.topicSlugs,
          actorCounts: video.actorCounts,
          contentFingerprint: video.contentFingerprint,
          collectedAt: video.refreshedAt,
          refreshDueAt: video.expiresAt,
          retentionExpiresAt: video.expiresAt,
        })),
      },
      idempotency_key_input: batchIdempotencyKey,
    });
    const savedRow = saved.data?.[0];
    if (saved.error || !savedRow) return databaseFailure(saved.error);
    const completed = await supabase.rpc("complete_sourced_farmer_discovery", {
      owner_id_input: access.administrator.id,
      run_id_input: runId,
      outcome_input: { state: "succeeded", failureCode: null },
      idempotency_key_input: await stageIdempotencyKey(
        parsed.data.idempotencyKey,
        "complete",
      ),
    });
    if (completed.error) return databaseFailure(completed.error);
    revalidatePath("/admin/sourced-farmers");
    return {
      ok: true as const,
      code: "SOURCED_FARMER_BATCH_COMPLETED",
      data: {
        runId,
        transientSources: result.transientSources,
        savedVideoCount: Number(savedRow.saved_count),
        nextPageAvailable: Boolean(persistence.nextPageToken),
      },
    };
  } catch (error) {
    const providerCode = providerFailureCode(error);
    if (runId) {
      await supabase.rpc("complete_sourced_farmer_discovery", {
        owner_id_input: access.administrator.id,
        run_id_input: runId,
        outcome_input: { state: "failed", failureCode: providerCode },
        idempotency_key_input: await stageIdempotencyKey(
          parsed.data.idempotencyKey,
          "failed",
        ),
      });
    }
    return failure(providerCode);
  }
}

export async function createSourcedFarmerProfileAction(rawInput: unknown) {
  const parsed = durableSourcedFarmerProfileInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return failure("INVALID_INPUT", z.flattenError(parsed.error).fieldErrors);
  }
  const access = await ownerAccess();
  if (!access.ok) return access.error;
  const input = parsed.data;
  const evidenceIdentity = input.evidenceUrl ?? input.consentReference ?? "";
  const evidenceHash = await sha256(evidenceIdentity);
  const duplicateFingerprint = await sha256(JSON.stringify({
    name: input.displayName.normalize("NFKC").toLocaleLowerCase("en-IN"),
    district: input.district?.normalize("NFKC").toLocaleLowerCase("en-IN") ?? null,
    state: input.state?.normalize("NFKC").toLocaleLowerCase("en-IN") ?? null,
    topics: [...input.topicSlugs].sort(),
  }));
  const retentionExpiresAt = new Date(
    Date.now() + 365 * 86_400_000,
  ).toISOString();
  const facts = await Promise.all(input.facts.map(async (fact, index) => {
    const sourceIdentity = fact.sourceUrl ?? input.consentReference ?? "";
    return {
      factType: fact.factType,
      factValue: fact.value,
      sourceUrl: fact.sourceUrl ?? null,
      evidenceExcerpt: fact.evidenceExcerpt,
      evidenceHash: await sha256(sourceIdentity),
      factFingerprint: await sha256(JSON.stringify({
        factType: fact.factType,
        factValue: fact.value.normalize("NFKC").toLocaleLowerCase("en-IN"),
        sourceIdentity,
      })),
      idempotencyKey: await stageIdempotencyKey(
        input.idempotencyKey,
        `fact:${index}`,
      ),
    };
  }));
  const result = await createAdminClient().rpc("create_sourced_farmer_profile", {
    owner_id_input: access.administrator.id,
    profile_input: {
      displayName: input.displayName,
      district: input.district ?? null,
      state: input.state ?? null,
      summary: input.summary,
      topicSlugs: input.topicSlugs,
      evidenceBasis: input.evidenceBasis,
      evidenceUrl: input.evidenceUrl ?? null,
      consentReference: input.consentReference ?? null,
      evidenceHash,
      duplicateFingerprint,
      operatorAttested: input.operatorAttested,
      retentionExpiresAt,
      facts,
    },
    idempotency_key_input: input.idempotencyKey,
  });
  const row = result.data?.[0];
  if (result.error || !row) return databaseFailure(result.error);
  revalidatePath("/admin/sourced-farmers");
  return {
    ok: true as const,
    code: "SOURCED_FARMER_PROFILE_CREATED",
    data: { id: String(row.profile_id), revision: Number(row.revision) },
  };
}

const reviewInputSchema = z.object({
  profileId: z.uuid(),
  operation: z.enum(["approve", "reject"]),
  expectedRevision: z.number().int().nonnegative(),
  idempotencyKey: z.uuid(),
}).strict();

export async function reviewSourcedFarmerProfileAction(rawInput: unknown) {
  const parsed = reviewInputSchema.safeParse(rawInput);
  if (!parsed.success) return failure("INVALID_INPUT");
  const access = await ownerAccess();
  if (!access.ok) return access.error;
  const result = await createAdminClient().rpc("review_sourced_farmer_profile", {
    owner_id_input: access.administrator.id,
    profile_id_input: parsed.data.profileId,
    decision_input: parsed.data.operation === "approve" ? "approved" : "rejected",
    expected_revision_input: parsed.data.expectedRevision,
    idempotency_key_input: parsed.data.idempotencyKey,
  });
  const row = result.data?.[0];
  if (result.error || !row) return databaseFailure(result.error);
  revalidatePath("/admin/sourced-farmers");
  revalidatePath(`/admin/sourced-farmers/${parsed.data.profileId}`);
  return {
    ok: true as const,
    code: "SOURCED_FARMER_PROFILE_REVIEWED",
    data: { id: String(row.profile_id), revision: Number(row.revision) },
  };
}

const archiveInputSchema = z.object({
  profileId: z.uuid(),
  reason: z.string().trim().min(4).max(500),
  expectedRevision: z.number().int().nonnegative(),
  idempotencyKey: z.uuid(),
}).strict();

export async function archiveSourcedFarmerProfileAction(rawInput: unknown) {
  const parsed = archiveInputSchema.safeParse(rawInput);
  if (!parsed.success) return failure("INVALID_INPUT");
  const access = await ownerAccess();
  if (!access.ok) return access.error;
  const result = await createAdminClient().rpc("archive_sourced_farmer_profile", {
    owner_id_input: access.administrator.id,
    profile_id_input: parsed.data.profileId,
    reason_input: parsed.data.reason,
    expected_revision_input: parsed.data.expectedRevision,
    idempotency_key_input: parsed.data.idempotencyKey,
  });
  const row = result.data?.[0];
  if (result.error || !row) return databaseFailure(result.error);
  revalidatePath("/admin/sourced-farmers");
  revalidatePath(`/admin/sourced-farmers/${parsed.data.profileId}`);
  return {
    ok: true as const,
    code: "SOURCED_FARMER_PROFILE_ARCHIVED",
    data: { id: String(row.profile_id), revision: Number(row.revision) },
  };
}
