import { normalizeYouTubeChannelSeed } from "./channel-seed";
import { containsContactInformation, redactContactInformation } from "./redaction";
import {
  assertNoForbiddenPersistenceKeys,
  sourcedFarmerRunPersistenceSchema,
  sourcedFarmerSeedRunInputSchema,
} from "./schemas";
import { analyzeAgricultureContent } from "./topic-parser";
import {
  AGRICULTURE_ACTOR_TYPES,
  YOUTUBE_PROVIDER,
  type AgricultureActorCounts,
  type SourcedFarmerQuotaReservationRequest,
  type SourcedFarmerQuotaReservationResult,
  type SourcedFarmerYouTubeRunResult,
  type SourcedFarmerVideoPersistence,
  type TransientSourcedVideo,
  type YouTubeClient,
} from "./types";

export const SOURCED_FARMER_MAX_PAGES_PER_RUN = 2;
export const SOURCED_FARMER_MAX_VIDEOS_PER_PAGE = 50;
export const SOURCED_FARMER_MAX_VIDEOS_PER_RUN = 100;
export const SOURCED_FARMER_MAX_PROVIDER_CALLS_PER_RUN = 5;
export const SOURCED_FARMER_RETENTION_DAYS = 30;

export type SourcedFarmerRunnerErrorCode =
  | "INVALID_INPUT"
  | "QUOTA_RESERVATION_FAILED"
  | "INVALID_PROVIDER_DATA"
  | "CONTACT_REDACTION_FAILED";

export class SourcedFarmerRunnerError extends Error {
  constructor(public readonly code: SourcedFarmerRunnerErrorCode) {
    super(code);
    this.name = "SourcedFarmerRunnerError";
  }
}

export type SourcedFarmerRunnerOptions = {
  client: YouTubeClient;
  reserveQuota: (
    request: SourcedFarmerQuotaReservationRequest,
  ) => Promise<SourcedFarmerQuotaReservationResult>;
  now?: () => Date;
};

async function sha256(value: string) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(bytes), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

function activeActorTypes(actorCounts: AgricultureActorCounts) {
  return AGRICULTURE_ACTOR_TYPES.filter(
    (actorType) => actorCounts[actorType] > 0,
  );
}

function expiryFor(refreshDate: Date) {
  return new Date(
    refreshDate.getTime() + SOURCED_FARMER_RETENTION_DAYS * 86_400_000,
  ).toISOString();
}

function uniqueUploadIds(ids: readonly string[], seen: Set<string>) {
  const unique: string[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    unique.push(id);
  }
  return unique;
}

export async function runSourcedFarmerYouTubeBatch(
  input: unknown,
  options: SourcedFarmerRunnerOptions,
): Promise<SourcedFarmerYouTubeRunResult> {
  const parsedInput = sourcedFarmerSeedRunInputSchema.safeParse(input);
  if (!parsedInput.success) throw new SourcedFarmerRunnerError("INVALID_INPUT");
  let seed;
  try {
    seed = normalizeYouTubeChannelSeed(parsedInput.data.channelSeed);
  } catch {
    throw new SourcedFarmerRunnerError("INVALID_INPUT");
  }

  const reservation = await options.reserveQuota({
    provider: YOUTUBE_PROVIDER,
    idempotencyKey: parsedInput.data.idempotencyKey,
    maximumProviderCalls: SOURCED_FARMER_MAX_PROVIDER_CALLS_PER_RUN,
    maximumPages: SOURCED_FARMER_MAX_PAGES_PER_RUN,
    maximumVideos: SOURCED_FARMER_MAX_VIDEOS_PER_RUN,
  });
  if (!reservation.ok) {
    throw new SourcedFarmerRunnerError("QUOTA_RESERVATION_FAILED");
  }

  let providerCalls = 1;
  const channel = await options.client.resolveChannel(seed);
  const refreshDate = options.now?.() ?? new Date();
  if (Number.isNaN(refreshDate.getTime())) {
    throw new SourcedFarmerRunnerError("INVALID_INPUT");
  }
  const refreshedAt = refreshDate.toISOString();
  const expiresAt = expiryFor(refreshDate);
  const knownVideoIds = new Set(parsedInput.data.knownVideoIds);
  const seenVideoIds = new Set<string>();
  const seenPageTokens = new Set<string>();
  if (parsedInput.data.pageToken) seenPageTokens.add(parsedInput.data.pageToken);

  const transientSources: TransientSourcedVideo[] = [];
  const persistentVideos: SourcedFarmerVideoPersistence[] = [];
  let pagesFetched = 0;
  let videosFetched = 0;
  let videosExcludedNonAgriculture = 0;
  let videosSkippedKnown = 0;
  let pageToken = parsedInput.data.pageToken;
  let nextPageToken: string | null = null;
  let stoppedAtKnownVideo = false;

  for (
    let pageIndex = 0;
    pageIndex < SOURCED_FARMER_MAX_PAGES_PER_RUN;
    pageIndex += 1
  ) {
    providerCalls += 1;
    const page = await options.client.listUploadPage({
      uploadsPlaylistId: channel.uploadsPlaylistId,
      ...(pageToken ? { pageToken } : {}),
    });
    pagesFetched += 1;
    const firstKnownIndex = page.items.findIndex((item) =>
      knownVideoIds.has(item.videoId)
    );
    if (firstKnownIndex >= 0) {
      videosSkippedKnown += 1;
      stoppedAtKnownVideo = true;
    }
    const beforeCheckpoint = firstKnownIndex >= 0
      ? page.items.slice(0, firstKnownIndex)
      : page.items;
    const pageVideoIds = uniqueUploadIds(
      beforeCheckpoint.map((item) => item.videoId),
      seenVideoIds,
    ).slice(0, SOURCED_FARMER_MAX_VIDEOS_PER_PAGE);

    if (pageVideoIds.length > 0) {
      providerCalls += 1;
      const metadata = await options.client.listVideos(pageVideoIds);
      videosFetched += metadata.length;
      const expectedIds = new Set(pageVideoIds);
      for (const video of metadata) {
        if (
          !expectedIds.has(video.videoId) ||
          video.channelId !== channel.channelId
        ) throw new SourcedFarmerRunnerError("INVALID_PROVIDER_DATA");
        if (video.privacyStatus !== "public") continue;
        const title = redactContactInformation(video.title, 300);
        const redactedDescription = redactContactInformation(
          video.description,
          5_000,
        );
        if (
          containsContactInformation(title) ||
          containsContactInformation(redactedDescription)
        ) throw new SourcedFarmerRunnerError("CONTACT_REDACTION_FAILED");
        const analysis = analyzeAgricultureContent({
          title,
          description: redactedDescription,
        });
        if (!analysis.agricultureRelated) {
          videosExcludedNonAgriculture += 1;
          continue;
        }
        const canonicalVideoUrl =
          `https://www.youtube.com/watch?v=${video.videoId}`;
        const actorTypes = activeActorTypes(analysis.actorCounts);
        transientSources.push({
          videoId: video.videoId,
          videoUrl: canonicalVideoUrl,
          title,
          redactedDescription,
          publishedAt: video.publishedAt,
          topicSlugs: analysis.topicSlugs,
          actorTypes,
          transient: true,
        });
        const contentFingerprint = await sha256(JSON.stringify({
          provider: YOUTUBE_PROVIDER,
          channelId: channel.channelId,
          videoId: video.videoId,
          publishedAt: video.publishedAt,
          topicSlugs: analysis.topicSlugs,
          actorCounts: analysis.actorCounts,
        }));
        persistentVideos.push({
          channelId: channel.channelId,
          videoId: video.videoId,
          canonicalChannelUrl: channel.canonicalUrl,
          canonicalVideoUrl,
          publishedAt: video.publishedAt,
          topicSlugs: analysis.topicSlugs,
          actorCounts: analysis.actorCounts,
          contentFingerprint,
          refreshedAt,
          expiresAt,
        });
      }
    }

    if (stoppedAtKnownVideo || !page.nextPageToken) {
      nextPageToken = null;
      break;
    }
    if (seenPageTokens.has(page.nextPageToken)) {
      nextPageToken = null;
      break;
    }
    seenPageTokens.add(page.nextPageToken);
    nextPageToken = page.nextPageToken;
    pageToken = page.nextPageToken;
  }

  const seedFingerprint = await sha256(JSON.stringify({
    provider: YOUTUBE_PROVIDER,
    channelId: channel.channelId,
  }));
  const persistenceCandidate = {
    provider: YOUTUBE_PROVIDER,
    channelId: channel.channelId,
    canonicalChannelUrl: channel.canonicalUrl,
    seedFingerprint,
    videos: persistentVideos,
    nextPageToken,
    counts: {
      pagesFetched,
      providerCalls,
      videosFetched,
      videosMatched: persistentVideos.length,
      videosExcludedNonAgriculture,
      videosSkippedKnown,
    },
    refreshedAt,
    expiresAt,
  };
  assertNoForbiddenPersistenceKeys(persistenceCandidate);
  const persistence = sourcedFarmerRunPersistenceSchema.parse(
    persistenceCandidate,
  );
  return { transientSources, persistence };
}
