import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  access: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
  run: vi.fn(),
  createClient: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/features/sourced-farmers/access", () => ({
  requireSourcedFarmerResearchOwner: mocks.access,
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mocks.from, rpc: mocks.rpc }),
}));
vi.mock("@/features/sourced-farmers/runner", () => ({
  runSourcedFarmerYouTubeBatch: mocks.run,
  SourcedFarmerRunnerError: class SourcedFarmerRunnerError extends Error {
    constructor(public readonly code: string) {
      super(code);
    }
  },
}));
vi.mock("@/features/sourced-farmers/youtube-client", () => ({
  createYouTubeClient: mocks.createClient,
  YouTubeClientError: class YouTubeClientError extends Error {
    constructor(public readonly code: string) {
      super(code);
    }
  },
}));

import {
  createSourcedFarmerProfileAction,
  runSourcedFarmerDiscoveryAction,
} from "@/features/sourced-farmers/actions";

const ownerId = "00000000-0000-4000-8000-000000000901";
const runId = "00000000-0000-4000-8000-000000000902";
const channelId = "UCfictional12345";
const videoId = "AbCdEf12345";
const idempotencyKey = "00000000-0000-4000-8000-000000000903";

function previousRunQuery() {
  const builder = {
    select: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    maybeSingle: vi.fn(),
  };
  builder.select.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  builder.in.mockReturnValue(builder);
  builder.order.mockReturnValue(builder);
  builder.limit.mockReturnValue(builder);
  builder.maybeSingle.mockResolvedValue({ data: null, error: null });
  return builder;
}

function knownVideoQuery() {
  const builder = {
    select: vi.fn(),
    eq: vi.fn(),
    gt: vi.fn(),
    limit: vi.fn(),
  };
  builder.select.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  builder.gt.mockReturnValue(builder);
  builder.limit.mockResolvedValue({ data: [], error: null });
  return builder;
}

describe("sourced Farmer actions", () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) mock.mockReset();
    mocks.access.mockResolvedValue({
      ok: true,
      administrator: { id: ownerId, demo: false },
    });
    mocks.createClient.mockReturnValue({});
  });

  it("stops before service or provider work when owner access fails", async () => {
    mocks.access.mockResolvedValue({ ok: false, code: "FORBIDDEN" });
    await expect(runSourcedFarmerDiscoveryAction({
      channelSeed: "@FictionalFarm",
      idempotencyKey,
    })).resolves.toMatchObject({ ok: false, code: "FORBIDDEN" });
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("reserves before provider work and saves only anonymous provenance", async () => {
    const prior = previousRunQuery();
    const known = knownVideoQuery();
    mocks.from.mockImplementation((table: string) =>
      table === "farmer_source_discovery_runs" ? prior : known
    );
    mocks.rpc.mockImplementation(async (name: string) => {
      if (name === "reserve_sourced_farmer_discovery") {
        return { data: [{ code: "RESERVED", run_id: runId, revision: 0 }], error: null };
      }
      if (name === "save_sourced_farmer_discovery_batch") {
        return { data: [{ code: "SAVED", run_id: runId, saved_count: 1, revision: 1 }], error: null };
      }
      return { data: [{ code: "SUCCEEDED", run_id: runId, revision: 2 }], error: null };
    });
    mocks.run.mockImplementation(async (_input: unknown, options: {
      reserveQuota: () => Promise<{ ok: boolean }>;
    }) => {
      expect(await options.reserveQuota()).toEqual({ ok: true });
      return {
        transientSources: [{
          videoId,
          videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
          title: "Fictional paddy farm",
          redactedDescription: "A contact-free fictional description.",
          publishedAt: "2026-08-14T00:00:00.000Z",
          topicSlugs: ["paddy"],
          actorTypes: ["farmer"],
          transient: true,
        }],
        persistence: {
          provider: "youtube_data_api",
          channelId,
          canonicalChannelUrl: `https://www.youtube.com/channel/${channelId}`,
          seedFingerprint: "a".repeat(64),
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
          videos: [{
            channelId,
            videoId,
            canonicalChannelUrl: `https://www.youtube.com/channel/${channelId}`,
            canonicalVideoUrl: `https://www.youtube.com/watch?v=${videoId}`,
            publishedAt: "2026-08-14T00:00:00.000Z",
            topicSlugs: ["paddy"],
            actorCounts: { farmer: 1, organization: 0, official: 0, scientist: 0, trader: 0 },
            contentFingerprint: "b".repeat(64),
            refreshedAt: "2026-08-14T00:00:00.000Z",
            expiresAt: "2026-09-13T00:00:00.000Z",
          }],
        },
      };
    });

    await expect(runSourcedFarmerDiscoveryAction({
      channelSeed: "@FictionalFarm",
      idempotencyKey,
    })).resolves.toMatchObject({
      ok: true,
      data: { runId, savedVideoCount: 1 },
    });

    const names = mocks.rpc.mock.calls.map((call) => call[0]);
    expect(names).toEqual([
      "reserve_sourced_farmer_discovery",
      "save_sourced_farmer_discovery_batch",
      "complete_sourced_farmer_discovery",
    ]);
    const batch = mocks.rpc.mock.calls[1]?.[1]?.batch_input;
    expect(JSON.stringify(batch)).not.toMatch(/title|description|displayName|email|phone|whatsapp|location/i);
    expect(batch.videos[0]).toMatchObject({ providerVideoId: videoId, topicSlugs: ["paddy"] });
    expect(mocks.from).not.toHaveBeenCalledWith("farmer_contacts");
    expect(mocks.from).not.toHaveBeenCalledWith("outreach_prospects");
  });

  it("creates durable profiles only through eligible non-YouTube evidence", async () => {
    mocks.rpc.mockResolvedValue({
      data: [{ code: "CREATED", profile_id: ownerId, revision: 0 }],
      error: null,
    });
    await expect(createSourcedFarmerProfileAction({
      displayName: "Fictional Farmer",
      district: "Sample District",
      state: "Telangana",
      summary: "A fictional professional record used only for automated tests.",
      topicSlugs: ["paddy"],
      evidenceBasis: "independent_public_source",
      evidenceUrl: "https://evidence.example.org/farmer",
      facts: [{
        factType: "crop",
        value: "Paddy",
        evidenceExcerpt: "The fictional evidence describes paddy cultivation.",
        sourceUrl: "https://evidence.example.org/farmer",
      }],
      operatorAttested: true,
      revision: 0,
      idempotencyKey,
    })).resolves.toMatchObject({ ok: true, data: { id: ownerId } });
    expect(mocks.rpc).toHaveBeenCalledWith(
      "create_sourced_farmer_profile",
      expect.objectContaining({
        owner_id_input: ownerId,
        profile_input: expect.objectContaining({
          evidenceBasis: "independent_public_source",
          evidenceUrl: "https://evidence.example.org/farmer",
        }),
      }),
    );
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
