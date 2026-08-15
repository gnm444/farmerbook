import { describe, expect, it } from "vitest";
import {
  addFeaturedFarmerSourceSchema,
  saveFeaturedFarmerDraftSchema,
} from "@/features/featured-farmers/schemas";

describe("featured Farmer schemas", () => {
  it("requires permission and bounded source provenance", () => {
    expect(addFeaturedFarmerSourceSchema.safeParse({
      researchId: "11111111-1111-4111-8111-111111111111",
      sourceUrl: "https://example.org/farmer",
      publisher: "Example Institution",
      sourceTitle: "A documented farming programme",
      description: "This public source documents the farmer and the agricultural programme in sufficient detail.",
      discoveryMethod: "manual_google_review",
      sourceQuality: "institutional_reference",
      subjectAssociation: "professional_reference",
      sourcePermissionConfirmed: false,
      idempotencyKey: "22222222-2222-4222-8222-222222222222",
    }).success).toBe(false);
  });

  it("rejects story sections that cite missing claim keys", () => {
    const parsed = saveFeaturedFarmerDraftSchema.safeParse({
      researchId: "11111111-1111-4111-8111-111111111111",
      slug: "asha-example",
      headline: "A documented approach to resilient farming",
      deck: "A fictional editorial deck used only to test FarmerBook's profile workflow.",
      whyFeatured: "This fictional subject is used because the workflow needs two source-bound significance claims before publication.",
      sections: Array.from({ length: 3 }, (_, index) => ({
        kind: index === 0 ? "work" : index === 1 ? "impact" : "lessons",
        heading: `Section ${index + 1}`,
        body: "This fictional section is long enough for the editorial schema and contains no real-person assertions.",
        claimKeys: [index === 2 ? "unknown" : "known_claim"],
      })),
      categorySlugs: [],
      limitations: ["This is a fictional test-only editorial draft."],
      claims: [
        {
          claimKey: "known_claim",
          claimType: "impact",
          statement: "A documented fictional claim supported by a selected source.",
          sourceIds: ["33333333-3333-4333-8333-333333333333"],
        },
        {
          claimKey: "second_claim",
          claimType: "innovation",
          statement: "Another documented fictional claim supported by a selected source.",
          sourceIds: ["44444444-4444-4444-8444-444444444444"],
        },
      ],
      idempotencyKey: "22222222-2222-4222-8222-222222222222",
    });
    expect(parsed.success).toBe(false);
  });
});
