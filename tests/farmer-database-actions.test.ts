import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  access: vi.fn(),
  rpc: vi.fn(),
  from: vi.fn(),
  discover: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/features/farmer-database/access", () => ({
  requirePrivateFarmerDatabaseOwner: mocks.access,
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ rpc: mocks.rpc, from: mocks.from }),
}));
vi.mock("@/features/farmer-database/youtube-discovery", () => ({
  discoverFarmerChannelsOnYouTube: mocks.discover,
  YouTubeDiscoveryError: class YouTubeDiscoveryError extends Error {
    constructor(public readonly code: string) {
      super(code);
    }
  },
}));
vi.mock("@/features/outreach/providers", () => ({
  createConfiguredOutreachProvider: () => ({ configured: false }),
}));
vi.mock("@/lib/env", () => ({
  getSiteUrl: () => "https://farmerbook.in",
}));

import { discoverYouTubeFarmerChannelsAction } from "@/features/farmer-database/actions";

describe("private Farmer database actions", () => {
  const ownerId = "00000000-0000-4000-8000-000000000911";
  const searchId = "00000000-0000-4000-8000-000000000912";
  const idempotencyKey = "00000000-0000-4000-8000-000000000913";

  beforeEach(() => {
    mocks.access.mockReset();
    mocks.rpc.mockReset();
    mocks.from.mockReset();
    mocks.discover.mockReset();
    mocks.access.mockResolvedValue({
      ok: true,
      administrator: { id: ownerId, demo: false },
      configuration: { configured: true, ownerId },
    });
    mocks.rpc
      .mockResolvedValueOnce({
        data: [{ code: "RESERVED", search_id: searchId }],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [{ code: "SUCCEEDED", search_id: searchId }],
        error: null,
      });
    mocks.discover.mockResolvedValue({
      results: [{
        channelId: "UC-fictional-farmer",
        title: "Fictional Farmer Channel",
        description: "Public agriculture education.",
        channelUrl: "https://www.youtube.com/channel/UC-fictional-farmer",
        transient: true,
        discoveryProvider: "youtube_data_api",
      }],
    });
  });

  it("stops before database or provider work when owner access fails", async () => {
    mocks.access.mockResolvedValue({ ok: false, code: "FORBIDDEN" });
    await expect(discoverYouTubeFarmerChannelsAction({
      query: "natural farming India",
      locale: "en-IN",
      idempotencyKey,
    })).resolves.toMatchObject({ ok: false, code: "FORBIDDEN" });
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.discover).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("returns transient channels while persisting only reservation metadata", async () => {
    await expect(discoverYouTubeFarmerChannelsAction({
      query: "natural farming India",
      locale: "en-IN",
      idempotencyKey,
    })).resolves.toMatchObject({
      ok: true,
      code: "YOUTUBE_RESULTS_TRANSIENT",
      data: {
        retention: "request_only",
        results: [expect.objectContaining({ transient: true })],
      },
    });
    expect(mocks.rpc).toHaveBeenNthCalledWith(
      1,
      "reserve_private_farmer_youtube_search",
      expect.objectContaining({
        owner_id_input: ownerId,
        query_hash_input: expect.stringMatching(/^[0-9a-f]{64}$/),
      }),
    );
    expect(mocks.rpc).toHaveBeenNthCalledWith(
      2,
      "complete_private_farmer_youtube_search",
      {
        search_id_input: searchId,
        owner_id_input: ownerId,
        result_count_input: 1,
        failure_code_input: null,
      },
    );
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.discover).toHaveBeenCalledTimes(1);
  });
});
