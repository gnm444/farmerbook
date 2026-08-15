import { describe, expect, it } from "vitest";
import {
  WEB_RESEARCH_ENDPOINT,
  WEB_RESEARCH_QUERY_MAX_LENGTH,
  buildFeaturedFarmerResearchQueries,
} from "@/features/featured-farmers/web-research";

describe("featured Farmer Web research", () => {
  it("builds five bounded operator-opened Google queries", () => {
    const queries = buildFeaturedFarmerResearchQueries({
      fullName: "Asha Example",
      districtHint: "Nashik",
      stateHint: "Maharashtra",
      farmingHint: "water-saving horticulture",
    });
    expect(queries.map((item) => item.purpose)).toEqual([
      "identity",
      "significance",
      "institutions",
      "social",
      "current",
    ]);
    expect(queries.every((item) => item.query.length <= WEB_RESEARCH_QUERY_MAX_LENGTH)).toBe(true);
    expect(queries.every((item) => new URL(item.url).origin === new URL(WEB_RESEARCH_ENDPOINT).origin)).toBe(true);
    expect(queries[0]?.query).toContain('"Asha Example"');
  });

  it("contains no fetch capability", async () => {
    const source = await import("node:fs/promises").then((fs) =>
      fs.readFile("features/featured-farmers/web-research.ts", "utf8"),
    );
    expect(source).not.toMatch(/\bfetch\s*\(/);
  });
});
