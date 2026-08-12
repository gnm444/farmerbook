import { describe, expect, it } from "vitest";
import {
  INDIA_STATES_AND_UNION_TERRITORIES,
  isIndiaStateOrUnionTerritory,
} from "@/lib/india/regions";

describe("Indian state and Union Territory registry", () => {
  it("contains the 28 states and eight Union Territories without duplicates", () => {
    expect(INDIA_STATES_AND_UNION_TERRITORIES).toHaveLength(36);
    expect(new Set(INDIA_STATES_AND_UNION_TERRITORIES).size).toBe(36);
    expect(INDIA_STATES_AND_UNION_TERRITORIES).toContain("Maharashtra");
    expect(INDIA_STATES_AND_UNION_TERRITORIES).toContain("Ladakh");
    expect(INDIA_STATES_AND_UNION_TERRITORIES).toContain("Lakshadweep");
  });

  it("accepts only curated exact values", () => {
    expect(isIndiaStateOrUnionTerritory("Tamil Nadu")).toBe(true);
    expect(isIndiaStateOrUnionTerritory("Unknown region")).toBe(false);
  });
});
