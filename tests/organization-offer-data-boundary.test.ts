import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

function mockBoundary({
  configured,
  enabled,
}: {
  configured: boolean;
  enabled: boolean;
}) {
  vi.doMock("@/lib/env", () => ({
    isSupabaseConfigured: () => configured,
  }));
  vi.doMock("@/lib/feature-flags", () => ({
    isFeatureEnabled: () => enabled,
  }));
}

function createErrorClient(message: string) {
  const result = { data: null, error: { message } };

  function query() {
    const builder: Record<string, unknown> = {};
    const chain = () => builder;
    builder.select = vi.fn(chain);
    builder.eq = vi.fn(chain);
    builder.in = vi.fn(chain);
    builder.lte = vi.fn(chain);
    builder.gte = vi.fn(chain);
    builder.order = vi.fn(chain);
    builder.limit = vi.fn(async () => result);
    builder.maybeSingle = vi.fn(async () => result);
    builder.then = (
      resolveResult: (value: typeof result) => unknown,
      rejectResult: (reason: unknown) => unknown,
    ) => Promise.resolve(result).then(resolveResult, rejectResult);
    return builder;
  }

  return { from: vi.fn(query) };
}

describe("organization and offer live-data boundary", () => {
  it("returns honest empty results without opening a live client when disabled", async () => {
    mockBoundary({ configured: true, enabled: false });
    const createClient = vi.fn(() => {
      throw new Error("The database client must remain closed.");
    });
    vi.doMock("@/lib/supabase/server", () => ({ createClient }));

    const organizations = await import("@/features/organizations/queries");
    const offers = await import("@/features/offers/queries");

    await expect(organizations.loadPublicOrganizations()).resolves.toEqual([]);
    await expect(
      organizations.loadPublicOrganizationBySlug("tractor-company"),
    ).resolves.toBeNull();
    await expect(offers.loadPublicOffers()).resolves.toEqual([]);
    await expect(
      offers.loadPublicOfferById("91b0d2fa-4373-4ae9-8052-8f2ed137dc46"),
    ).resolves.toBeNull();
    expect(createClient).not.toHaveBeenCalled();
  });

  it("returns honest empty results without opening a live client when unconfigured", async () => {
    mockBoundary({ configured: false, enabled: true });
    const createClient = vi.fn(() => {
      throw new Error("The database client must remain closed.");
    });
    vi.doMock("@/lib/supabase/server", () => ({ createClient }));

    const organizations = await import("@/features/organizations/queries");
    const offers = await import("@/features/offers/queries");

    await expect(organizations.loadPublicOrganizations()).resolves.toEqual([]);
    await expect(offers.loadPublicOffers()).resolves.toEqual([]);
    expect(createClient).not.toHaveBeenCalled();
  });

  it("surfaces configured database failures through the bounded unavailable error", async () => {
    mockBoundary({ configured: true, enabled: true });
    const client = createErrorClient("password=must-never-reach-the-browser");
    vi.doMock("@/lib/supabase/server", () => ({
      createClient: vi.fn(async () => client),
    }));
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const organizations = await import("@/features/organizations/queries");
    const offers = await import("@/features/offers/queries");
    const unavailable = {
      name: "DataUnavailableError",
      code: "service.unavailable",
    };

    await expect(organizations.loadPublicOrganizations()).rejects.toMatchObject(
      unavailable,
    );
    await expect(offers.loadPublicOffers()).rejects.toMatchObject(unavailable);
  });

  it("keeps fixture modules out of live organization and offer loaders", () => {
    const sources = [
      "features/organizations/queries.ts",
      "features/offers/queries.ts",
    ].map((file) => readFileSync(resolve(process.cwd(), file), "utf8"));

    for (const source of sources) {
      expect(source).not.toContain("@/lib/market-data");
      expect(source).not.toContain("@/lib/demo-data");
    }
  });
});
