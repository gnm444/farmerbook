import { describe, expect, it, vi } from "vitest";
import {
  buildYouTubeFarmerQuery,
  searchKnownFarmerOnYouTube,
  youtubeSearchConfiguration,
} from "@/features/profile-agent/youtube-search";

const input = {
  fullName: "Anita Patil",
  locationHint: "Nashik Maharashtra",
  farmingHint: "grapes natural farming",
  preferredLocale: "mr-IN" as const,
};

const configuredEnvironment = {
  YOUTUBE_DATA_API_KEY: "youtube-api-key-with-at-least-twenty-characters",
};

function response(items: Array<Record<string, unknown>>, status = 200) {
  return new Response(JSON.stringify({ items }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("Known Farmer YouTube discovery", () => {
  it("fails closed without a server API key", () => {
    expect(youtubeSearchConfiguration({}).configured).toBe(false);
    expect(youtubeSearchConfiguration(configuredEnvironment).configured).toBe(
      true,
    );
  });

  it("builds a bounded agriculture query", () => {
    const query = buildYouTubeFarmerQuery(input);
    expect(query).toContain('"Anita Patil"');
    expect(query).toContain("Nashik Maharashtra");
    expect(query).toContain("grapes natural farming");
    expect(query.length).toBeLessThanOrEqual(400);
  });

  it("uses the official API and keeps only exact-name agriculture candidates", async () => {
    const fetcher = vi.fn(
      async (request: RequestInfo | URL, init?: RequestInit) => {
        const url = new URL(String(request));
        expect(url.hostname).toBe("www.googleapis.com");
        expect(url.pathname).toBe("/youtube/v3/search");
        expect(url.searchParams.get("type")).toBe("channel,video");
        expect(url.searchParams.get("regionCode")).toBe("IN");
        expect(url.searchParams.get("relevanceLanguage")).toBe("mr");
        expect(url.searchParams.get("safeSearch")).toBe("strict");
        expect(url.searchParams.get("maxResults")).toBe("10");
        expect(url.searchParams.get("key")).toBe(
          configuredEnvironment.YOUTUBE_DATA_API_KEY,
        );
        expect(init?.redirect).toBe("error");
        return response([
          {
            id: { kind: "youtube#channel", channelId: "UC-anita-farm" },
            snippet: {
              title: "Anita Patil Natural Farmer",
              description:
                "Anita Patil shares grape farming from Nashik Maharashtra.",
              channelId: "UC-anita-farm",
              channelTitle: "Anita Patil Natural Farmer",
            },
          },
          {
            id: { kind: "youtube#video", videoId: "video-anita" },
            snippet: {
              title: "Interview with farmer Anita Patil",
              description: "Anita Patil discusses grape farming in Nashik.",
              channelId: "UC-news",
              channelTitle: "Agriculture News",
            },
          },
          {
            id: { kind: "youtube#channel", channelId: "UC-law" },
            snippet: {
              title: "Anita Patil Legal",
              description: "Technology and commercial law advice.",
            },
          },
          {
            id: { kind: "youtube#channel", channelId: "UC-other" },
            snippet: {
              title: "Anita Sharma Farmer",
              description: "Dairy farming tutorials.",
            },
          },
        ]);
      },
    );

    const result = await searchKnownFarmerOnYouTube(input, {
      fetcher: fetcher as typeof fetch,
      environment: configuredEnvironment,
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result.results).toHaveLength(2);
    expect(result.results[0]).toMatchObject({
      resultKind: "channel",
      sourceUrl: "https://www.youtube.com/channel/UC-anita-farm",
      defaultAssociation: "third_party_coverage",
      discoveryProvider: "youtube_data_api",
      usageRightsBasis: "youtube_api_terms",
    });
    expect(result.results[1]).toMatchObject({
      resultKind: "video",
      sourceUrl: "https://www.youtube.com/watch?v=video-anita",
      defaultAssociation: "third_party_coverage",
    });
    expect(JSON.stringify(result.results)).not.toContain("thumbnail");
    expect(JSON.stringify(result.results)).not.toContain("viewCount");
  });

  it("does not retry provider quota failures", async () => {
    const fetcher = vi.fn(async () => response([], 429));
    await expect(
      searchKnownFarmerOnYouTube(input, {
        fetcher: fetcher as typeof fetch,
        environment: configuredEnvironment,
      }),
    ).rejects.toMatchObject({ code: "QUOTA_EXCEEDED" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("rejects oversized provider responses", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response("{}", {
          headers: { "content-length": "250001" },
        }),
    );
    await expect(
      searchKnownFarmerOnYouTube(input, {
        fetcher: fetcher as typeof fetch,
        environment: configuredEnvironment,
      }),
    ).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });
});
