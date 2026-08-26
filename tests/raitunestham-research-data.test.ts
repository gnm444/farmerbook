import { describe, expect, it } from "vitest";
import {
  filterRaituNesthamResearch,
  RAITU_NESTHAM_RESEARCH,
  summarizeRaituNesthamResearch,
} from "@/features/sourced-farmers/raitunestham-research.server";

describe("Raitu Nestham private research snapshot", () => {
  it("contains the reviewed fixed snapshot with valid public-source fields", () => {
    expect(RAITU_NESTHAM_RESEARCH).toHaveLength(41);
    expect(new Set(RAITU_NESTHAM_RESEARCH.map((record) => record.id)).size).toBe(41);
    expect(
      new Set(RAITU_NESTHAM_RESEARCH.map((record) => record.youtubeSource)).size,
    ).toBe(41);

    for (const record of RAITU_NESTHAM_RESEARCH) {
      expect(record.youtubeSource).toMatch(
        /^https:\/\/www\.youtube\.com\/watch\?v=[A-Za-z0-9_-]{11}$/,
      );
      if (record.publicUnverifiedPhone) {
        expect(record.publicUnverifiedPhone).toMatch(/^[6-9][0-9]{9}$/);
      }
    }

    expect(summarizeRaituNesthamResearch()).toEqual({
      total: 41,
      withPublicPhone: 37,
      recent: 26,
      method: 14,
      allied: 1,
    });
  });

  it("filters by bounded text and allowlisted research priority", () => {
    expect(filterRaituNesthamResearch({ q: "groundnut" }).map((record) => record.id))
      .toEqual(expect.arrayContaining([
        "komatla-nancha-reddy-groundnut",
        "alwala-balayya-shetty-palekar",
      ]));
    expect(filterRaituNesthamResearch({ q: "Telangana" })).not.toHaveLength(0);
    expect(filterRaituNesthamResearch({ q: "9849852470" })).toHaveLength(1);
    expect(filterRaituNesthamResearch({ priority: "allied" })).toHaveLength(1);
    expect(filterRaituNesthamResearch({ q: "does not exist" })).toEqual([]);
  });

  it("does not model membership, verification, consent or outreach state", () => {
    const serialized = JSON.stringify(RAITU_NESTHAM_RESEARCH);
    for (const forbidden of [
      "consentState",
      "memberId",
      "outreachProspectId",
      "verificationState",
      "messageState",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });
});
