import { describe, expect, it, vi } from "vitest";
import {
  discoverFarmerChannelsOnYouTube,
  youtubeDiscoveryConfiguration,
} from "@/features/farmer-database/youtube-discovery";

const environment = {
  YOUTUBE_DATA_API_KEY: "youtube-api-key-with-at-least-twenty-characters",
};

function response(items: Array<Record<string, unknown>>, status = 200) {
  return new Response(JSON.stringify({ items }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("transient YouTube Farmer discovery", () => {
  it("fails closed without a server key", () => {
    expect(youtubeDiscoveryConfiguration({}).configured).toBe(false);
  });

  it("uses the official channel-only API without paging, scraping, or contact extraction", async () => {
    const fetcher = vi.fn(async (request: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(request));
      expect(url.origin).toBe("https://www.googleapis.com");
      expect(url.pathname).toBe("/youtube/v3/search");
      expect(url.searchParams.get("type")).toBe("channel");
      expect(url.searchParams.get("regionCode")).toBe("IN");
      expect(url.searchParams.get("relevanceLanguage")).toBe("te");
      expect(url.searchParams.get("safeSearch")).toBe("strict");
      expect(url.searchParams.get("maxResults")).toBe("10");
      expect(url.searchParams.has("pageToken")).toBe(false);
      expect(init?.redirect).toBe("error");
      return response([
        {
          id: { kind: "youtube#channel", channelId: "UC-fictional-farm" },
          snippet: {
            title: "Fictional Natural Farming",
            description: "Agriculture education. business@example.invalid +919876543210",
            channelTitle: "Fictional Natural Farming",
          },
        },
      ]);
    });
    const result = await discoverFarmerChannelsOnYouTube({
      query: "natural farming Telugu India",
      locale: "te-IN",
    }, { fetcher: fetcher as typeof fetch, environment });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result.results).toHaveLength(1);
    expect(result.results[0]).toMatchObject({
      channelUrl: "https://www.youtube.com/channel/UC-fictional-farm",
      transient: true,
      discoveryProvider: "youtube_data_api",
    });
    expect(result.results[0]).not.toHaveProperty("email");
    expect(result.results[0]).not.toHaveProperty("phone");
  });

  it("does not retry provider quota failures", async () => {
    const fetcher = vi.fn(async () => response([], 429));
    await expect(discoverFarmerChannelsOnYouTube({
      query: "farmer agriculture India",
      locale: "en-IN",
    }, { fetcher: fetcher as typeof fetch, environment })).rejects.toMatchObject({
      code: "QUOTA_EXCEEDED",
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
