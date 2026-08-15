import { describe, expect, it } from "vitest";
import {
  buildConservativeStorySections,
  validateStoryClaimReferences,
} from "@/features/featured-farmers/story-builder";

const claims = [
  {
    claimKey: "documented_work",
    claimType: "innovation" as const,
    statement: "The selected source documents a specific agricultural practice.",
    sourceIds: ["11111111-1111-4111-8111-111111111111"],
  },
  {
    claimKey: "documented_impact",
    claimType: "impact" as const,
    statement: "A second selected source documents the resulting impact.",
    sourceIds: ["22222222-2222-4222-8222-222222222222"],
  },
];

describe("featured Farmer story builder", () => {
  it("builds only from supplied claims", () => {
    const sections = buildConservativeStorySections(claims);
    expect(sections).toHaveLength(3);
    expect(validateStoryClaimReferences(sections, claims)).toBe(true);
    expect(sections.map((section) => section.body).join(" ")).toContain(claims[0]!.statement);
  });

  it("rejects unknown claim references", () => {
    const sections = buildConservativeStorySections(claims);
    sections[0]!.claimKeys = ["invented_claim"];
    expect(validateStoryClaimReferences(sections, claims)).toBe(false);
  });
});
