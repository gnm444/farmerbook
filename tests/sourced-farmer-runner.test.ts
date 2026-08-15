import { describe, expect, it, vi } from "vitest";
import {
  runSourcedFarmerYouTubeBatch,
  SOURCED_FARMER_MAX_PROVIDER_CALLS_PER_RUN,
} from "@/features/sourced-farmers/runner";
import type { YouTubeClient } from "@/features/sourced-farmers/types";

const channelId = "UCabcdefghijklmnopqrstuv";
const videoOne = "AbCdEfGhI12";
const videoTwo = "BcDeFgHiJ23";
const videoThree = "CdEfGhIjK34";
const baseInput = {
  channelSeed: "@FictionalFarmingSeed",
  idempotencyKey: "00000000-0000-4000-8000-000000000903",
};

function clientFixture(): YouTubeClient {
  let page = 0;
  return {
    resolveChannel: vi.fn(async () => ({
      channelId,
      uploadsPlaylistId: "UUabcdefghijklmnopqrstuv",
      canonicalUrl: `https://www.youtube.com/channel/${channelId}`,
    })),
    listUploadPage: vi.fn(async () => {
      page += 1;
      return page === 1
        ? {
            items: [{ videoId: videoOne }, { videoId: videoTwo }],
            nextPageToken: "page-two",
          }
        : {
            items: [{ videoId: videoThree }],
            nextPageToken: "page-three",
          };
    }),
    listVideos: vi.fn(async (videoIds: readonly string[]) => videoIds.map((videoId) => {
      if (videoId === videoTwo) {
        return {
          videoId,
          channelId,
          title: "Fictional wedding celebration",
          description: "Music and family celebrations.",
          publishedAt: "2026-08-02T10:00:00.000Z",
          privacyStatus: "public" as const,
        };
      }
      return {
        videoId,
        channelId,
        title: videoId === videoOne
          ? "Papaya farming on 17 acres"
          : "వరి సాగు రైతు అనుభవం",
        description: videoId === videoOne
          ? "A farmer explains papaya cultivation. Call +91 98765 43210."
          : "రైతు వరి పంట సాగు. WhatsApp https://wa.me/919876543210",
        publishedAt: "2026-08-01T10:00:00.000Z",
        privacyStatus: "public" as const,
      };
    })),
  };
}

describe("sourced Farmer YouTube runner", () => {
  it("reserves quota before fetching, processes two pages, and separates transient from durable data", async () => {
    const order: string[] = [];
    const client = clientFixture();
    const originalResolve = client.resolveChannel;
    client.resolveChannel = vi.fn(async (seed) => {
      order.push("resolve");
      return originalResolve(seed);
    });
    const reserveQuota = vi.fn(async (request) => {
      order.push("reserve");
      expect(request.maximumProviderCalls).toBe(
        SOURCED_FARMER_MAX_PROVIDER_CALLS_PER_RUN,
      );
      return { ok: true as const };
    });
    const result = await runSourcedFarmerYouTubeBatch(baseInput, {
      client,
      reserveQuota,
      now: () => new Date("2026-08-14T00:00:00.000Z"),
    });

    expect(order.slice(0, 2)).toEqual(["reserve", "resolve"]);
    expect(client.listUploadPage).toHaveBeenCalledTimes(2);
    expect(client.listVideos).toHaveBeenCalledTimes(2);
    for (const [ids] of vi.mocked(client.listVideos).mock.calls) {
      expect(ids.length).toBeLessThanOrEqual(50);
    }
    expect(result.transientSources).toHaveLength(2);
    expect(result.transientSources[0]).toMatchObject({
      videoId: videoOne,
      transient: true,
      topicSlugs: ["papaya"],
      actorTypes: ["farmer"],
    });
    expect(result.transientSources[0]?.redactedDescription).not.toContain("98765");
    expect(result.transientSources[1]?.redactedDescription).not.toContain("wa.me");
    expect(result.persistence.counts).toEqual({
      pagesFetched: 2,
      providerCalls: 5,
      videosFetched: 3,
      videosMatched: 2,
      videosExcludedNonAgriculture: 1,
      videosSkippedKnown: 0,
    });
    expect(result.persistence.nextPageToken).toBe("page-three");
    expect(result.persistence.expiresAt).toBe("2026-09-13T00:00:00.000Z");
    const durableJson = JSON.stringify(result.persistence);
    expect(durableJson).not.toContain("title");
    expect(durableJson).not.toContain("description");
    expect(durableJson).not.toContain("98765");
    expect(durableJson).not.toContain("wedding");
  });

  it("matches agriculture from source content rather than the farming seed", async () => {
    const client = clientFixture();
    client.listUploadPage = vi.fn(async () => ({
      items: [{ videoId: videoTwo }],
      nextPageToken: null,
    }));
    const result = await runSourcedFarmerYouTubeBatch(baseInput, {
      client,
      reserveQuota: async () => ({ ok: true }),
    });
    expect(result.transientSources).toEqual([]);
    expect(result.persistence.videos).toEqual([]);
    expect(result.persistence.counts.videosExcludedNonAgriculture).toBe(1);
  });

  it("stops at a known checkpoint and never fetches metadata beyond it", async () => {
    const client = clientFixture();
    client.listUploadPage = vi.fn(async () => ({
      items: [{ videoId: videoOne }],
      nextPageToken: "should-not-be-followed",
    }));
    const result = await runSourcedFarmerYouTubeBatch({
      ...baseInput,
      knownVideoIds: [videoOne],
    }, {
      client,
      reserveQuota: async () => ({ ok: true }),
    });
    expect(client.listUploadPage).toHaveBeenCalledTimes(1);
    expect(client.listVideos).not.toHaveBeenCalled();
    expect(result.persistence.nextPageToken).toBeNull();
    expect(result.persistence.counts.videosSkippedKnown).toBe(1);
  });

  it("does no provider work when quota reservation fails", async () => {
    const client = clientFixture();
    await expect(runSourcedFarmerYouTubeBatch(baseInput, {
      client,
      reserveQuota: async () => ({ ok: false, code: "QUOTA_EXHAUSTED" }),
    })).rejects.toMatchObject({ code: "QUOTA_RESERVATION_FAILED" });
    expect(client.resolveChannel).not.toHaveBeenCalled();
    expect(client.listUploadPage).not.toHaveBeenCalled();
    expect(client.listVideos).not.toHaveBeenCalled();
  });
});
