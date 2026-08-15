import { describe, expect, it, vi } from "vitest";
import { normalizeYouTubeChannelSeed } from "@/features/sourced-farmers/channel-seed";
import {
  createYouTubeClient,
  sourcedFarmerYouTubeConfiguration,
  YOUTUBE_CLIENT_MAX_RESPONSE_BYTES,
  YOUTUBE_CLIENT_TIMEOUT_MS,
} from "@/features/sourced-farmers/youtube-client";

const apiKey = "fictional-youtube-data-api-key";
const channelId = "UCabcdefghijklmnopqrstuv";
const videoId = "AbCdEfGhI12";

function jsonResponse(payload: unknown, status = 200, headers?: HeadersInit) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

describe("sourced Farmer YouTube client", () => {
  it("normalizes only channel handles and canonical channel IDs", () => {
    expect(normalizeYouTubeChannelSeed("https://www.youtube.com/@RythuBadi"))
      .toEqual({ kind: "handle", value: "RythuBadi" });
    expect(normalizeYouTubeChannelSeed(
      `https://youtube.com/channel/${channelId}`,
    )).toEqual({ kind: "channel_id", value: channelId });
    expect(() => normalizeYouTubeChannelSeed(
      "https://www.youtube.com/watch?v=AbCdEfGhI12",
    )).toThrow("INVALID_YOUTUBE_CHANNEL_SEED");
    expect(() => normalizeYouTubeChannelSeed(
      "https://example.org/@RythuBadi",
    )).toThrow("INVALID_YOUTUBE_CHANNEL_SEED");
  });

  it("uses only channels.list, playlistItems.list, and videos.list with bounded parameters", async () => {
    const fetcher = vi.fn(async (request: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(request));
      expect(url.origin).toBe("https://www.googleapis.com");
      expect(url.pathname.startsWith("/youtube/v3/")).toBe(true);
      expect(url.searchParams.get("key")).toBe(apiKey);
      expect(init?.redirect).toBe("error");
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      if (url.pathname.endsWith("/channels")) {
        expect(url.searchParams.get("forHandle")).toBe("@RythuBadi");
        expect(url.searchParams.get("maxResults")).toBe("1");
        return jsonResponse({ items: [{
          id: channelId,
          contentDetails: { relatedPlaylists: { uploads: "UUabcdefghijklmnopqrstuv" } },
        }] });
      }
      if (url.pathname.endsWith("/playlistItems")) {
        expect(url.searchParams.get("maxResults")).toBe("50");
        return jsonResponse({
          nextPageToken: "next-token",
          items: [{ contentDetails: { videoId } }],
        });
      }
      expect(url.pathname.endsWith("/videos")).toBe(true);
      expect(url.searchParams.get("part")).toBe("snippet,status");
      return jsonResponse({ items: [{
        id: videoId,
        snippet: {
          channelId,
          title: "Fictional papaya farming",
          description: "Farmer experience",
          publishedAt: "2026-08-01T10:00:00.000Z",
        },
        status: { privacyStatus: "public" },
      }] });
    });
    const client = createYouTubeClient({ apiKey, fetcher: fetcher as typeof fetch });
    const channel = await client.resolveChannel(
      normalizeYouTubeChannelSeed("@RythuBadi"),
    );
    const page = await client.listUploadPage({
      uploadsPlaylistId: channel.uploadsPlaylistId,
    });
    const videos = await client.listVideos(page.items.map((item) => item.videoId));
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(page.nextPageToken).toBe("next-token");
    expect(videos[0]?.title).toBe("Fictional papaya farming");
    expect(YOUTUBE_CLIENT_TIMEOUT_MS).toBe(8_000);
  });

  it("fails closed for missing configuration, oversized batches, quota, and oversized responses", async () => {
    expect(sourcedFarmerYouTubeConfiguration({}).configured).toBe(false);
    expect(() => createYouTubeClient({ environment: {} })).toThrowError(
      expect.objectContaining({ code: "NOT_CONFIGURED" }),
    );

    const unusedFetcher = vi.fn();
    const client = createYouTubeClient({
      apiKey,
      fetcher: unusedFetcher as typeof fetch,
    });
    await expect(client.listVideos(
      Array.from({ length: 51 }, (_, index) =>
        `${String(index).padStart(11, "0")}`
      ),
    )).rejects.toMatchObject({ code: "INVALID_REQUEST" });
    expect(unusedFetcher).not.toHaveBeenCalled();

    const quotaFetcher = vi.fn(async () => jsonResponse({
      error: { errors: [{ reason: "quotaExceeded" }] },
    }, 403));
    const quotaClient = createYouTubeClient({
      apiKey,
      fetcher: quotaFetcher as typeof fetch,
    });
    await expect(quotaClient.resolveChannel({ kind: "handle", value: "RythuBadi" }))
      .rejects.toMatchObject({ code: "QUOTA_EXCEEDED" });
    expect(quotaFetcher).toHaveBeenCalledTimes(1);

    const oversizedFetcher = vi.fn(async () => jsonResponse(
      { items: [] },
      200,
      { "content-length": String(YOUTUBE_CLIENT_MAX_RESPONSE_BYTES + 1) },
    ));
    const oversizedClient = createYouTubeClient({
      apiKey,
      fetcher: oversizedFetcher as typeof fetch,
    });
    await expect(oversizedClient.resolveChannel({ kind: "handle", value: "RythuBadi" }))
      .rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });
});
