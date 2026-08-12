import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const fixtureIds = new Set([
  "nashik-roma-tomatoes",
  "premium-table-grapes",
  "lasalgaon-red-onions",
  "pune-okra-baskets",
  "processing-tomatoes",
  "fpo-onion-aggregation",
]);

const testProfile = {
  id: "test-profile",
  handle: "test_profile",
  fullName: "Test Profile",
  initials: "TP",
  participantType: "farmer",
  accountRole: "farmer",
  roleLabel: "Farmer",
  district: "Test district",
  state: "Test state",
  crops: [],
  bio: "",
  socialLinks: {},
  reviewSummary: { average: 0, count: 0 },
  verified: false,
  followers: 0,
  following: 0,
  joinedLabel: "Joined today",
  publicProfileEnabled: false,
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

function mockSharedModules(configured: boolean) {
  vi.doMock("@/lib/env", () => ({
    isSupabaseConfigured: () => configured,
  }));
  vi.doMock("@/features/auth/require-user", () => ({
    isSellerRole: (role: string) => role === "farmer" || role === "wholesaler",
    requireUser: vi.fn(async () => ({
      id: testProfile.id,
      demo: !configured,
      profile: {
        accountRole: testProfile.accountRole,
        onboardingComplete: true,
        status: "active",
      },
    })),
  }));
  vi.doMock("@/features/profiles/queries", () => ({
    loadCurrentProfile: vi.fn(async () => testProfile),
    loadProfilesByIds: vi.fn(async () => [testProfile]),
  }));
}

function createSupabaseClient(result: {
  data: unknown[] | null;
  error: { message: string } | null;
}) {
  function query() {
    const builder: Record<string, unknown> = {};
    const chain = () => builder;
    builder.select = vi.fn(chain);
    builder.eq = vi.fn(chain);
    builder.in = vi.fn(chain);
    builder.order = vi.fn(chain);
    builder.limit = vi.fn(async () => result);
    builder.maybeSingle = vi.fn(async () => ({
      data: null,
      error: result.error,
    }));
    builder.then = (
      resolveResult: (value: typeof result) => unknown,
      rejectResult: (reason: unknown) => unknown,
    ) => Promise.resolve(result).then(resolveResult, rejectResult);
    return builder;
  }

  return { from: vi.fn(query) };
}

describe("live marketplace data boundary", () => {
  it("keeps normal unconfigured routes empty instead of enabling fixtures", async () => {
    mockSharedModules(false);
    vi.doMock("@/lib/supabase/server", () => ({
      createClient: vi.fn(() => {
        throw new Error("The live client must not be opened while unconfigured.");
      }),
    }));

    const marketplace = await import("@/features/marketplace/queries");
    const reviews = await import("@/features/reviews/queries");

    expect(await marketplace.loadPublicListings()).toEqual([]);
    expect(await marketplace.loadPublicListingsForSeller("meera")).toEqual([]);
    expect(await marketplace.loadListingById("nashik-roma-tomatoes")).toBeNull();
    expect(await marketplace.loadStorefront("meera_kulkarni")).toEqual({
      profile: null,
      listings: [],
    });
    await expect(marketplace.loadSellerMarketData()).resolves.toMatchObject({
      listings: [],
      enquiries: [],
    });
    expect(await reviews.loadReviewsForSeller("meera")).toEqual([]);
    expect(await reviews.loadReviewsForListing("nashik-roma-tomatoes")).toEqual([]);
    await expect(reviews.loadCustomerPurchases()).resolves.toMatchObject({
      enquiries: [],
    });
  });

  it.each([
    { data: [], error: null, label: "empty live results" },
    {
      data: null,
      error: { message: "temporary database failure" },
      label: "live query errors",
    },
  ])("never substitutes fixture IDs for $label", async ({ data, error }) => {
    mockSharedModules(true);
    const client = createSupabaseClient({ data, error });
    vi.doMock("@/lib/supabase/server", () => ({
      createClient: vi.fn(async () => client),
    }));
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const marketplace = await import("@/features/marketplace/queries");
    const reviews = await import("@/features/reviews/queries");

    if (error) {
      const unavailable = { code: "service.unavailable" };
      await expect(marketplace.loadPublicListings()).rejects.toMatchObject(
        unavailable,
      );
      await expect(
        marketplace.loadPublicListingsForSeller(testProfile.id),
      ).rejects.toMatchObject(unavailable);
      await expect(
        marketplace.loadListingById("nashik-roma-tomatoes"),
      ).rejects.toMatchObject(unavailable);
      await expect(
        marketplace.loadStorefront("meera_kulkarni"),
      ).rejects.toMatchObject(unavailable);
      await expect(reviews.loadReviewsForSeller("meera")).rejects.toMatchObject(
        unavailable,
      );
      await expect(
        reviews.loadReviewsForListing("nashik-roma-tomatoes"),
      ).rejects.toMatchObject(unavailable);
      return;
    }

    const listings = await marketplace.loadPublicListings();
    const sellerListings = await marketplace.loadPublicListingsForSeller(
      testProfile.id,
    );
    const listing = await marketplace.loadListingById("nashik-roma-tomatoes");
    const storefront = await marketplace.loadStorefront("meera_kulkarni");
    const sellerReviews = await reviews.loadReviewsForSeller("meera");
    const listingReviews = await reviews.loadReviewsForListing(
      "nashik-roma-tomatoes",
    );

    expect(listings).toEqual([]);
    expect(sellerListings).toEqual([]);
    expect(listing).toBeNull();
    expect(storefront.listings).toEqual([]);
    expect(storefront.profile).toBeNull();
    expect(sellerReviews).toEqual([]);
    expect(listingReviews).toEqual([]);
    expect(
      [...listings, ...sellerListings].some((item) => fixtureIds.has(item.id)),
    ).toBe(false);
  });

  it("keeps fixture modules out of normal marketplace and review loaders", () => {
    const sources = [
      "features/marketplace/queries.ts",
      "features/reviews/queries.ts",
    ].map((file) => readFileSync(resolve(process.cwd(), file), "utf8"));

    for (const source of sources) {
      expect(source).not.toContain("@/lib/market-data");
      expect(source).not.toContain("@/lib/demo-data");
    }
  });
});
