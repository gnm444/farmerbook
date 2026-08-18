import { describe, expect, it } from "vitest";
import {
  assessEcoProductClaim,
  isProhibitedSingleUsePlasticClaim,
  type EcoClaimEvidence,
  type EcoEvidenceKind,
} from "@/features/eco-products/claims-policy";

const AS_OF = "2026-08-18T00:00:00.000Z";

function acceptedEvidence(
  id: string,
  kind: EcoEvidenceKind,
  overrides: Partial<EcoClaimEvidence> = {},
): EcoClaimEvidence {
  return {
    id,
    kind,
    issuer: "Trusted reviewer or statutory authority",
    reference: `REF-${id}`,
    scope: "Exact listed product and claimed attribute",
    reviewStatus: "accepted",
    ...overrides,
  };
}

describe("eco product environmental claims policy", () => {
  it("blocks prohibited conventional single-use plastic tableware from eco presentation", () => {
    expect(
      isProhibitedSingleUsePlasticClaim(
        "Disposable biodegradable plastic plates and spoons",
      ),
    ).toBe(true);

    const result = assessEcoProductClaim({
      categorySlugs: ["compostable-reusable-tableware"],
      claimText: "Eco-friendly disposable biodegradable plastic plates",
      claimScope: "whole_product",
      evidence: [
        acceptedEvidence("generic", "other_supporting_document"),
        acceptedEvidence("bio", "cpcb_biodegradable_plastic_certificate"),
      ],
      asOf: AS_OF,
    });

    expect(result.categoryEligible).toBe(false);
    expect(result.claimTextPublishable).toBe(false);
    expect(result.status).toBe("evidence_submitted");
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: "prohibited_single_use_plastic",
        severity: "block_product",
      }),
    );
  });

  it("does not mistake explicitly plastic-free bagasse tableware for plastic", () => {
    const result = assessEcoProductClaim({
      categorySlugs: [
        "compostable-reusable-tableware",
        "agricultural-residue-byproduct-products",
      ],
      claimText:
        "Plastic-free plates made with 95% sugarcane bagasse; compostable under the tested disposal conditions",
      claimScope: "whole_product",
      asOf: AS_OF,
    });

    expect(result.categoryEligible).toBe(true);
    expect(result.status).toBe("seller_declared");
    expect(result.claimTextPublishable).toBe(false);
    expect(result.issues.map((issue) => issue.code)).not.toContain(
      "prohibited_single_use_plastic",
    );
    expect(result.missingRequirements.map((requirement) => requirement.code)).toEqual(
      expect.arrayContaining([
        "compostability_test",
        "agri_residue_chain_of_custody",
        "material_composition",
      ]),
    );
  });

  it("requires a CPCB certificate before compostable plastic can enter the eco path", () => {
    const pending = assessEcoProductClaim({
      categorySlugs: ["compostable-reusable-tableware"],
      claimText: "Compostable PLA plastic cups for industrial composting",
      claimScope: "disposal",
      evidence: [
        acceptedEvidence("composition", "material_composition_report"),
      ],
      asOf: AS_OF,
    });

    expect(pending.categoryEligible).toBe(false);
    expect(pending.issues.map((issue) => issue.code)).toContain(
      "compostable_plastic_certificate_required",
    );

    const reviewed = assessEcoProductClaim({
      categorySlugs: ["compostable-reusable-tableware"],
      claimText: "Compostable PLA plastic cups for industrial composting",
      claimScope: "disposal",
      evidence: [
        acceptedEvidence("cpcb", "cpcb_compostable_plastic_certificate"),
      ],
      asOf: AS_OF,
    });

    expect(reviewed.categoryEligible).toBe(true);
    expect(reviewed.status).toBe("verified");
    expect(reviewed.claimTextPublishable).toBe(true);
    expect(reviewed.issues.map((issue) => issue.code)).toContain(
      "state_plastic_rule_review_required",
    );
  });

  it("requires durable-use evidence before a reusable tableware claim is verified", () => {
    const evidence = [
      acceptedEvidence("durability", "durability_reuse_test"),
      acceptedEvidence("care", "reuse_care_instructions"),
    ];
    const result = assessEcoProductClaim({
      categorySlugs: ["compostable-reusable-tableware"],
      claimText: "Washable reusable polypropylene harvest meal trays",
      claimScope: "use",
      evidence,
      asOf: AS_OF,
    });

    expect(result.categoryEligible).toBe(true);
    expect(result.status).toBe("verified");
    expect(result.claimClasses).toContain("reusable");
  });

  it("keeps evidence submitted distinct from verification", () => {
    const result = assessEcoProductClaim({
      categorySlugs: ["sustainable-clothing-textiles"],
      claimText: "Shirt made with 70% recycled cotton",
      claimScope: "component",
      evidence: [
        {
          ...acceptedEvidence("composition", "material_composition_report"),
          reviewStatus: "submitted",
        },
      ],
      asOf: AS_OF,
    });

    expect(result.status).toBe("evidence_submitted");
    expect(result.statusLabel).toBe(
      "Environmental evidence submitted — review pending",
    );
    expect(result.claimTextPublishable).toBe(false);
  });

  it("verifies organic textile wording only with certification, composition and chain of custody", () => {
    const result = assessEcoProductClaim({
      categorySlugs: ["sustainable-clothing-textiles"],
      claimText: "Kurta made with 100% NPOP-certified organic cotton",
      claimScope: "whole_product",
      evidence: [
        acceptedEvidence("organic", "recognized_organic_certificate"),
        acceptedEvidence("chain", "textile_chain_of_custody"),
        acceptedEvidence("composition", "material_composition_report"),
      ],
      asOf: AS_OF,
    });

    expect(result.status).toBe("verified");
    expect(result.claimClasses).toContain("organic_textile");
    expect(result.verifiedClaimText).toBe(
      "Kurta made with 100% NPOP-certified organic cotton",
    );
  });

  it("rejects natural-bamboo-fibre wording for bamboo viscose", () => {
    const result = assessEcoProductClaim({
      categorySlugs: ["sustainable-clothing-textiles", "bamboo-products"],
      claimText: "Natural bamboo fibre shirt made from bamboo viscose",
      claimScope: "component",
      evidence: [
        acceptedEvidence("composition", "material_composition_report"),
      ],
      asOf: AS_OF,
    });

    expect(result.status).toBe("evidence_submitted");
    expect(result.claimTextPublishable).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain(
      "bamboo_fibre_misrepresentation",
    );
  });

  it("requires pure-material, food-contact and durability evidence for bamboo tableware", () => {
    const result = assessEcoProductClaim({
      categorySlugs: ["bamboo-products"],
      claimText: "Reusable pure bamboo cups for food contact",
      claimScope: "whole_product",
      evidence: [
        acceptedEvidence("composition", "material_composition_report"),
        acceptedEvidence("bamboo", "bamboo_food_contact_compliance"),
        acceptedEvidence("food", "food_contact_safety_report"),
        acceptedEvidence("durability", "durability_reuse_test"),
        acceptedEvidence("care", "reuse_care_instructions"),
      ],
      asOf: AS_OF,
    });

    expect(result.status).toBe("verified");
    expect(result.claimClasses).toEqual(
      expect.arrayContaining(["bamboo_content", "bamboo_food_contact", "reusable"]),
    );
  });

  it("requires recognized organic and food registrations for organic value-added food", () => {
    const result = assessEcoProductClaim({
      categorySlugs: ["farm-produce-value-added-products"],
      claimText: "NPOP-certified organic millet flour",
      claimScope: "whole_product",
      evidence: [
        acceptedEvidence("organic", "recognized_organic_certificate"),
      ],
      asOf: AS_OF,
    });

    expect(result.status).toBe("evidence_submitted");
    expect(result.missingRequirements.map((item) => item.code)).toContain(
      "food_business_registration",
    );
  });

  it("requires percentage, composition and source records for agri-residue products", () => {
    const incomplete = assessEcoProductClaim({
      categorySlugs: ["agricultural-residue-byproduct-products"],
      claimText: "Packaging made from rice husk agricultural residue",
      claimScope: "component",
      evidence: [
        acceptedEvidence("source", "agri_residue_chain_of_custody"),
        acceptedEvidence("composition", "material_composition_report"),
      ],
      asOf: AS_OF,
    });

    expect(incomplete.status).toBe("evidence_submitted");
    expect(incomplete.issues.map((issue) => issue.code)).toContain(
      "claim_percentage_required",
    );

    const complete = assessEcoProductClaim({
      categorySlugs: ["agricultural-residue-byproduct-products"],
      claimText: "Packaging made with 80% rice husk agricultural residue",
      claimScope: "whole_product",
      evidence: [
        acceptedEvidence("source", "agri_residue_chain_of_custody"),
        acceptedEvidence("composition", "material_composition_report"),
      ],
      asOf: AS_OF,
    });

    expect(complete.status).toBe("verified");
  });

  it("does not accept expired evidence or vague absolute claims", () => {
    const expired = assessEcoProductClaim({
      categorySlugs: ["sustainable-clothing-textiles"],
      claimText: "Shirt made with 80% recycled cotton",
      claimScope: "component",
      evidence: [
        acceptedEvidence("chain", "recycled_content_chain_of_custody", {
          validUntil: "2026-08-17T23:59:59.000Z",
        }),
        acceptedEvidence("composition", "material_composition_report"),
      ],
      asOf: AS_OF,
    });
    expect(expired.status).toBe("evidence_submitted");
    expect(expired.issues.map((issue) => issue.code)).toContain("evidence_expired");

    const vague = assessEcoProductClaim({
      categorySlugs: ["bamboo-products"],
      claimText: "100% eco-friendly and zero environmental impact",
      claimScope: "whole_product",
      evidence: [
        acceptedEvidence("other", "other_supporting_document"),
      ],
      asOf: AS_OF,
    });
    expect(vague.status).toBe("evidence_submitted");
    expect(vague.claimTextPublishable).toBe(false);
    expect(vague.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "unbounded_environmental_claim",
        "vague_environmental_claim",
      ]),
    );
  });
});
