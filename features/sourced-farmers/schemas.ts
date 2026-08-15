import { z } from "zod";
import {
  AGRICULTURE_ACTOR_TYPES,
  AGRICULTURE_TOPIC_SLUGS,
  SOURCED_FARMER_EVIDENCE_BASES,
  SOURCED_FARMER_FACT_TYPES,
  YOUTUBE_PROVIDER,
} from "./types";

const millisecondsPerDay = 86_400_000;
const maximumRetentionMilliseconds = 30 * millisecondsPerDay;
const safeText = (minimum: number, maximum: number) =>
  z.string().trim().min(minimum).max(maximum).refine(
    (value) => !/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u.test(value),
    "Control characters are not allowed.",
  );

const youtubeChannelIdSchema = z
  .string()
  .regex(/^UC[A-Za-z0-9_-]{8,62}$/u, "Use a YouTube channel ID.");
const youtubeVideoIdSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{11}$/u, "Use a YouTube video ID.");
const opaquePageTokenSchema = z.string().trim().min(1).max(1_000);
const topicSlugSchema = z.enum(AGRICULTURE_TOPIC_SLUGS);

function isCanonicalYouTubeChannelUrl(value: string, channelId: string) {
  return value === `https://www.youtube.com/channel/${channelId}`;
}

function isCanonicalYouTubeVideoUrl(value: string, videoId: string) {
  return value === `https://www.youtube.com/watch?v=${videoId}`;
}

function addRetentionIssues(
  value: { refreshedAt: string; expiresAt: string },
  context: z.RefinementCtx,
) {
  const refreshedAt = Date.parse(value.refreshedAt);
  const expiresAt = Date.parse(value.expiresAt);
  if (
    !Number.isFinite(refreshedAt) ||
    !Number.isFinite(expiresAt) ||
    expiresAt <= refreshedAt ||
    expiresAt - refreshedAt > maximumRetentionMilliseconds
  ) {
    context.addIssue({
      code: "custom",
      path: ["expiresAt"],
      message: "YouTube-derived metadata must expire after refresh and within 30 days.",
    });
  }
}

export const sourcedFarmerSeedRunInputSchema = z
  .object({
    channelSeed: safeText(3, 500),
    pageToken: opaquePageTokenSchema.optional(),
    knownVideoIds: z
      .array(youtubeVideoIdSchema)
      .max(5_000)
      .default([])
      .transform((ids) => [...new Set(ids)]),
    idempotencyKey: z.uuid(),
  })
  .strict();

export const sourcedFarmerActorCountsSchema = z
  .object(Object.fromEntries(
    AGRICULTURE_ACTOR_TYPES.map((actorType) => [
      actorType,
      z.number().int().nonnegative().max(25),
    ]),
  ) as Record<(typeof AGRICULTURE_ACTOR_TYPES)[number], z.ZodNumber>)
  .strict();

export const sourcedFarmerVideoPersistenceSchema = z
  .object({
    channelId: youtubeChannelIdSchema,
    videoId: youtubeVideoIdSchema,
    canonicalChannelUrl: z.url().max(500),
    canonicalVideoUrl: z.url().max(500),
    publishedAt: z.iso.datetime({ offset: true }),
    topicSlugs: z
      .array(topicSlugSchema)
      .min(1)
      .max(16)
      .transform((slugs) => [...new Set(slugs)]),
    actorCounts: sourcedFarmerActorCountsSchema,
    contentFingerprint: z.string().regex(/^[a-f0-9]{64}$/u),
    refreshedAt: z.iso.datetime({ offset: true }),
    expiresAt: z.iso.datetime({ offset: true }),
  })
  .strict()
  .superRefine((value, context) => {
    addRetentionIssues(value, context);
    if (!isCanonicalYouTubeChannelUrl(value.canonicalChannelUrl, value.channelId)) {
      context.addIssue({
        code: "custom",
        path: ["canonicalChannelUrl"],
        message: "Use the canonical YouTube channel URL.",
      });
    }
    if (!isCanonicalYouTubeVideoUrl(value.canonicalVideoUrl, value.videoId)) {
      context.addIssue({
        code: "custom",
        path: ["canonicalVideoUrl"],
        message: "Use the canonical YouTube video URL.",
      });
    }
  });

export const sourcedFarmerRunCountsSchema = z
  .object({
    pagesFetched: z.number().int().min(0).max(2),
    providerCalls: z.number().int().min(0).max(5),
    videosFetched: z.number().int().min(0).max(100),
    videosMatched: z.number().int().min(0).max(100),
    videosExcludedNonAgriculture: z.number().int().min(0).max(100),
    videosSkippedKnown: z.number().int().min(0).max(100),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.videosMatched + value.videosExcludedNonAgriculture >
      value.videosFetched
    ) {
      context.addIssue({
        code: "custom",
        path: ["videosMatched"],
        message: "Matched and excluded counts cannot exceed fetched videos.",
      });
    }
  });

export const sourcedFarmerRunPersistenceSchema = z
  .object({
    provider: z.literal(YOUTUBE_PROVIDER),
    channelId: youtubeChannelIdSchema,
    canonicalChannelUrl: z.url().max(500),
    seedFingerprint: z.string().regex(/^[a-f0-9]{64}$/u),
    videos: z.array(sourcedFarmerVideoPersistenceSchema).max(100),
    nextPageToken: opaquePageTokenSchema.nullable(),
    counts: sourcedFarmerRunCountsSchema,
    refreshedAt: z.iso.datetime({ offset: true }),
    expiresAt: z.iso.datetime({ offset: true }),
  })
  .strict()
  .superRefine((value, context) => {
    addRetentionIssues(value, context);
    if (!isCanonicalYouTubeChannelUrl(value.canonicalChannelUrl, value.channelId)) {
      context.addIssue({
        code: "custom",
        path: ["canonicalChannelUrl"],
        message: "Use the canonical YouTube channel URL.",
      });
    }
    if (value.videos.length !== value.counts.videosMatched) {
      context.addIssue({
        code: "custom",
        path: ["videos"],
        message: "Persisted videos must equal the anonymous agriculture match count.",
      });
    }
  });

export const FORBIDDEN_SOURCED_FARMER_PERSISTENCE_KEYS = new Set([
  "name",
  "fullName",
  "displayName",
  "username",
  "handle",
  "location",
  "village",
  "mandal",
  "district",
  "state",
  "email",
  "phone",
  "whatsapp",
  "contact",
  "title",
  "description",
  "redactedDescription",
  "rawDescription",
  "rawResponse",
  "response",
  "transcript",
]);

export function assertNoForbiddenPersistenceKeys(value: unknown) {
  const inspect = (candidate: unknown): void => {
    if (Array.isArray(candidate)) {
      for (const item of candidate) inspect(item);
      return;
    }
    if (!candidate || typeof candidate !== "object") return;
    for (const [key, child] of Object.entries(candidate)) {
      if (FORBIDDEN_SOURCED_FARMER_PERSISTENCE_KEYS.has(key)) {
        throw new Error(`FORBIDDEN_PERSISTENCE_KEY:${key}`);
      }
      inspect(child);
    }
  };
  inspect(value);
}

export const citedSourcedFarmerProfessionalFactSchema = z
  .object({
    factType: z.enum(SOURCED_FARMER_FACT_TYPES),
    value: safeText(1, 500),
    evidenceExcerpt: safeText(5, 1_000),
    sourceUrl: z.url().max(2_048).optional(),
  })
  .strict();

function isIndependentEvidenceUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return false;
    const hostname = url.hostname.toLocaleLowerCase("en-US");
    const forbiddenHosts = [
      "youtube.com",
      "youtu.be",
      "youtube-nocookie.com",
    ];
    return !forbiddenHosts.some(
      (host) => hostname === host || hostname.endsWith(`.${host}`),
    );
  } catch {
    return false;
  }
}

export const nonYouTubeHttpsEvidenceUrlSchema = z
  .url()
  .max(2_048)
  .refine(isIndependentEvidenceUrl, "Use an independent non-YouTube HTTPS source.");

export const durableSourcedFarmerProfileInputSchema = z
  .object({
    displayName: safeText(2, 100),
    district: safeText(2, 100).optional(),
    state: safeText(2, 100).optional(),
    summary: safeText(20, 1_200),
    topicSlugs: z.array(topicSlugSchema).min(1).max(16).transform(
      (slugs) => [...new Set(slugs)],
    ),
    evidenceBasis: z.enum(SOURCED_FARMER_EVIDENCE_BASES),
    evidenceUrl: z.url().max(2_048).optional(),
    consentReference: safeText(8, 500).optional(),
    facts: z.array(citedSourcedFarmerProfessionalFactSchema).min(1).max(20),
    operatorAttested: z.literal(true),
    revision: z.number().int().nonnegative(),
    idempotencyKey: z.uuid(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.evidenceBasis === "documented_subject_consent") {
      if (!value.consentReference) {
        context.addIssue({
          code: "custom",
          path: ["consentReference"],
          message: "Documented subject consent requires a consent reference.",
        });
      }
      return;
    }
    if (!value.evidenceUrl || !isIndependentEvidenceUrl(value.evidenceUrl)) {
      context.addIssue({
        code: "custom",
        path: ["evidenceUrl"],
        message: "Independent profiles require a non-YouTube HTTPS evidence URL.",
      });
    }
    for (const [index, fact] of value.facts.entries()) {
      if (!fact.sourceUrl || !isIndependentEvidenceUrl(fact.sourceUrl)) {
        context.addIssue({
          code: "custom",
          path: ["facts", index, "sourceUrl"],
          message: "Every independently sourced fact requires non-YouTube HTTPS evidence.",
        });
      }
    }
  });

export type DurableSourcedFarmerProfileInput = z.infer<
  typeof durableSourcedFarmerProfileInputSchema
>;
