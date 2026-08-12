import { describe, expect, it, vi } from "vitest";
import {
  braveSearchConfiguration,
  buildBraveFarmerQuery,
  searchFarmerByName,
} from "@/features/profile-agent/brave-search";
import {
  profileNameDiscoveryActionSchema,
  profileSampleEvidenceSchema,
} from "@/features/profile-agent/schemas";

const input = profileNameDiscoveryActionSchema.parse({
  fullName: "Anita Patil",
  locationHint: "Nashik Maharashtra",
  farmingHint: "grapes natural farming",
  idempotencyKey: "00000000-0000-4000-8000-000000000301",
});

const configuredEnvironment = {
  BRAVE_SEARCH_API_KEY: "brave-secret-with-at-least-twenty-characters",
  BRAVE_SEARCH_STORAGE_RIGHTS_CONFIRMED: "true",
};

function response(results: Array<Record<string, unknown>>, status = 200) {
  return new Response(JSON.stringify({ web: { results } }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("Brave Farmer name discovery", () => {
  it("fails closed unless both the secret and storage rights are configured", () => {
    expect(
      braveSearchConfiguration({
        BRAVE_SEARCH_API_KEY: configuredEnvironment.BRAVE_SEARCH_API_KEY,
        BRAVE_SEARCH_STORAGE_RIGHTS_CONFIRMED: "false",
      }).configured,
    ).toBe(false);
    expect(
      braveSearchConfiguration(configuredEnvironment).configured,
    ).toBe(true);
  });

  it("rejects incomplete provider provenance on retained search evidence", () => {
    expect(
      profileSampleEvidenceSchema.safeParse({
        sourceUrl: "https://example.org/anita-patil",
        sourceType: "website",
        sourceText: "Anita Patil is a grape farmer.",
        sourceHash: "a".repeat(64),
        collectedAt: "2026-08-11T00:00:00.000Z",
        discoveryProvider: "brave_search",
      }).success,
    ).toBe(false);
  });

  it("builds a bounded India agriculture query without the idempotency key", () => {
    const query = buildBraveFarmerQuery(input);
    expect(query).toContain('"Anita Patil"');
    expect(query).toContain("Nashik Maharashtra");
    expect(query).toContain("grapes natural farming");
    expect(query).not.toContain(input.idempotencyKey);
    expect(query.length).toBeLessThanOrEqual(400);
    expect(query.trim().split(/\s+/u).length).toBeLessThanOrEqual(50);
  });

  it("rejects inputs that could exceed Brave's 50-word query contract", () => {
    expect(
      profileNameDiscoveryActionSchema.safeParse({
        fullName: "Anita Patil",
        farmingHint: Array.from({ length: 19 }, () => "farm").join(" "),
        idempotencyKey: input.idempotencyKey,
      }).success,
    ).toBe(false);
  });

  it("keeps only HTTPS exact-name agriculture matches and records provider provenance", async () => {
    const fetcher = vi.fn(async (request: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(request));
      expect(url.hostname).toBe("api.search.brave.com");
      expect(url.searchParams.get("country")).toBe("IN");
      expect(url.searchParams.get("count")).toBe("10");
      expect(new Headers(init?.headers).get("x-subscription-token")).toBe(
        configuredEnvironment.BRAVE_SEARCH_API_KEY,
      );
      return response([
        {
          url: "https://www.linkedin.com/in/anita-patil?utm_source=test",
          title: "Anita Patil - Farmer",
          description:
            "Anita Patil is a grape farmer using natural farming near Nashik.",
        },
        {
          url: "https://example.org/another-person",
          title: "Anita Sharma",
          description: "A dairy farmer in Delhi.",
        },
        {
          url: "https://example.org/anita-patil-lawyer",
          title: "Anita Patil - Lawyer",
          description: "Anita Patil advises technology businesses.",
        },
        {
          url: "http://example.org/anita-patil-farm",
          title: "Anita Patil farm",
          description: "Anita Patil grows grapes.",
        },
      ]);
    });
    const result = await searchFarmerByName(input, {
      fetcher: fetcher as typeof fetch,
      environment: configuredEnvironment,
    });
    expect(result.results).toHaveLength(1);
    expect(result.results[0]).toMatchObject({
      sourceUrl: "https://www.linkedin.com/in/anita-patil",
      sourceType: "linkedin",
      discoveryProvider: "brave_search",
      usageRightsBasis: "provider_storage_plan",
    });
  });

  it("does not automatically retry or hide provider quota failures", async () => {
    const fetcher = vi.fn(async () => response([], 429));
    await expect(
      searchFarmerByName(input, {
        fetcher: fetcher as typeof fetch,
        environment: configuredEnvironment,
      }),
    ).rejects.toMatchObject({
      code: "QUOTA_EXCEEDED",
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
