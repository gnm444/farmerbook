import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("features/sourced-farmers/queries.ts", "utf8");

describe("sourced Farmer queries", () => {
  it("checks both founder access and the database release control", () => {
    expect(source).toContain("requireSourcedFarmerResearchOwner");
    expect(source).toContain('"sourced_farmer_research"');
    expect(source.match(/await databaseControlEnabled\(\)/g)).toHaveLength(2);
  });

  it("owner-scopes every service-role research table read", () => {
    for (const table of [
      "farmer_source_channels",
      "farmer_source_discovery_runs",
      "farmer_source_videos",
      "sourced_farmer_profiles",
      "sourced_farmer_facts",
      "farmer_source_events",
    ]) expect(source).toContain(`from("${table}")`);
    expect(source.match(/\.eq\("owner_id", access\.administrator\.id\)/g)?.length)
      .toBeGreaterThanOrEqual(10);
  });

  it("applies URL-backed review, search, range, and exact-count pagination in the database", () => {
    expect(source).toContain('.select(profileFields, { count: "exact" })');
    expect(source).toContain('.range(pageStart, pageStart + sourcedFarmerProfilePageSize - 1)');
    expect(source).toContain('profileQuery.eq("state", filters.review)');
    expect(source).toContain("profileQuery.or");
    expect(source).toContain("total: profiles.count ?? 0");
  });

  it("does not query contacts, outreach, members, or publications", () => {
    expect(source).not.toMatch(/farmer_contacts|outreach_|publications|\.from\("profiles"\)/);
  });
});
