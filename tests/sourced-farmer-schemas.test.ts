import { describe, expect, it } from "vitest";
import {
  durableSourcedFarmerProfileInputSchema,
  sourcedFarmerRunPersistenceSchema,
  sourcedFarmerSeedRunInputSchema,
} from "@/features/sourced-farmers/schemas";

const channelId = "UCabcdefghijklmnopqrstuv";
const videoId = "AbCdEfGhI12";
const baseFact = {
  factType: "crop" as const,
  value: "Papaya cultivation",
  evidenceExcerpt: "The independently published report documents papaya cultivation.",
  sourceUrl: "https://research.example/farm-report",
};

describe("sourced Farmer schemas", () => {
  it("accepts a bounded seed run and removes duplicate checkpoints", () => {
    const parsed = sourcedFarmerSeedRunInputSchema.parse({
      channelSeed: "https://www.youtube.com/@fictional-farming",
      pageToken: "next-page",
      knownVideoIds: [videoId, videoId],
      idempotencyKey: "00000000-0000-4000-8000-000000000901",
    });
    expect(parsed.knownVideoIds).toEqual([videoId]);
    expect(sourcedFarmerSeedRunInputSchema.safeParse({
      ...parsed,
      unexpected: "not allowed",
    }).success).toBe(false);
  });

  it("requires consent evidence or independent non-YouTube HTTPS evidence", () => {
    const common = {
      displayName: "Fictional Farmer",
      district: "Example district",
      state: "Example state",
      summary: "A private professional summary supported by reviewed evidence.",
      topicSlugs: ["papaya"],
      facts: [baseFact],
      operatorAttested: true,
      revision: 0,
      idempotencyKey: "00000000-0000-4000-8000-000000000902",
    };
    expect(durableSourcedFarmerProfileInputSchema.safeParse({
      ...common,
      evidenceBasis: "documented_subject_consent",
    }).success).toBe(false);
    expect(durableSourcedFarmerProfileInputSchema.safeParse({
      ...common,
      evidenceBasis: "documented_subject_consent",
      consentReference: "signed-consent-record-fictional-42",
    }).success).toBe(true);
    expect(durableSourcedFarmerProfileInputSchema.safeParse({
      ...common,
      evidenceBasis: "independent_public_source",
      evidenceUrl: "https://www.youtube.com/watch?v=AbCdEfGhI12",
      facts: [{
        ...baseFact,
        sourceUrl: "https://youtu.be/AbCdEfGhI12",
      }],
    }).success).toBe(false);
    expect(durableSourcedFarmerProfileInputSchema.safeParse({
      ...common,
      evidenceBasis: "independent_public_source",
      evidenceUrl: "https://research.example/farm-report",
    }).success).toBe(true);
  });

  it("allows only anonymous provenance and no more than 30 days of retention", () => {
    const persistence = {
      provider: "youtube_data_api",
      channelId,
      canonicalChannelUrl: `https://www.youtube.com/channel/${channelId}`,
      seedFingerprint: "a".repeat(64),
      videos: [{
        channelId,
        videoId,
        canonicalChannelUrl: `https://www.youtube.com/channel/${channelId}`,
        canonicalVideoUrl: `https://www.youtube.com/watch?v=${videoId}`,
        publishedAt: "2026-08-01T10:00:00.000Z",
        topicSlugs: ["papaya"],
        actorCounts: {
          farmer: 1,
          organization: 0,
          official: 0,
          scientist: 0,
          trader: 0,
        },
        contentFingerprint: "b".repeat(64),
        refreshedAt: "2026-08-14T00:00:00.000Z",
        expiresAt: "2026-09-13T00:00:00.000Z",
      }],
      nextPageToken: null,
      counts: {
        pagesFetched: 1,
        providerCalls: 3,
        videosFetched: 1,
        videosMatched: 1,
        videosExcludedNonAgriculture: 0,
        videosSkippedKnown: 0,
      },
      refreshedAt: "2026-08-14T00:00:00.000Z",
      expiresAt: "2026-09-13T00:00:00.000Z",
    };
    expect(sourcedFarmerRunPersistenceSchema.safeParse(persistence).success).toBe(true);
    expect(sourcedFarmerRunPersistenceSchema.safeParse({
      ...persistence,
      title: "A named Farmer title is forbidden here",
    }).success).toBe(false);
    expect(sourcedFarmerRunPersistenceSchema.safeParse({
      ...persistence,
      expiresAt: "2026-09-14T00:00:00.001Z",
    }).success).toBe(false);
  });
});
