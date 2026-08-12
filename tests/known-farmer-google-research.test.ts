import { describe, expect, it, vi } from "vitest";
import {
  buildKnownFarmerGoogleResearch,
  GOOGLE_RESEARCH_ENDPOINT,
  GOOGLE_RESEARCH_QUERY_MAX_LENGTH,
} from "@/features/profile-agent/google-research-link";

describe("Known Farmer Google-assisted research", () => {
  it("builds only a bounded Google browser link and does not fetch", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const result = buildKnownFarmerGoogleResearch({
      fullName: 'Anita "Tai" Patil',
      locationHint: "Nashik Maharashtra",
      farmingHint: "grapes natural farming",
    });

    const url = new URL(result.url);
    expect(url.origin + url.pathname).toBe(GOOGLE_RESEARCH_ENDPOINT);
    expect(url.searchParams.get("q")).toBe(result.query);
    expect(result.query).toContain('"Anita Tai Patil"');
    expect(result.query).toContain("Nashik Maharashtra");
    expect(result.query.length).toBeLessThanOrEqual(
      GOOGLE_RESEARCH_QUERY_MAX_LENGTH,
    );
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("rejects unbounded identity hints", () => {
    expect(() =>
      buildKnownFarmerGoogleResearch({
        fullName: "Anita Patil",
        farmingHint: Array.from({ length: 19 }, () => "farm").join(" "),
      }),
    ).toThrow();
  });
});
