/**
 * Pure environmental-claim assessment for FarmerBook eco-product surfaces.
 *
 * This module does not grant a licence, certification, or legal approval. It
 * converts trusted review records into a bounded public claim state and keeps
 * unsupported claim text out of public surfaces. Callers must populate
 * `reviewStatus: "accepted"` only from an authenticated moderation workflow.
 */

export const ECO_CLAIM_STATUSES = [
  "seller_declared",
  "evidence_submitted",
  "verified",
] as const;

export type EcoClaimStatus = (typeof ECO_CLAIM_STATUSES)[number];

export const ECO_CLAIM_STATUS_LABELS: Record<EcoClaimStatus, string> = {
  seller_declared:
    "Seller-declared environmental claim — not independently verified",
  evidence_submitted: "Environmental evidence submitted — review pending",
  verified: "Environmental claim verified — evidence scope reviewed",
};

export const ECO_CLAIM_SCOPES = [
  "whole_product",
  "component",
  "manufacturing_process",
  "packaging",
  "use",
  "disposal",
] as const;

export type EcoClaimScope = (typeof ECO_CLAIM_SCOPES)[number];

export const ECO_EVIDENCE_KINDS = [
  "material_composition_report",
  "recycled_content_chain_of_custody",
  "textile_chain_of_custody",
  "recognized_organic_certificate",
  "cpcb_compostable_plastic_certificate",
  "cpcb_biodegradable_plastic_certificate",
  "compostability_test_report",
  "biodegradability_test_report",
  "durability_reuse_test",
  "reuse_care_instructions",
  "bamboo_food_contact_compliance",
  "food_contact_safety_report",
  "fssai_food_business_registration",
  "agri_residue_chain_of_custody",
  "responsible_source_chain_of_custody",
  "lifecycle_or_footprint_assessment",
  "independent_verification",
  "ecomark_licence",
  "other_supporting_document",
] as const;

export type EcoEvidenceKind = (typeof ECO_EVIDENCE_KINDS)[number];

export type EcoEvidenceReviewStatus = "submitted" | "accepted" | "rejected";

export type EcoClaimEvidence = {
  id: string;
  kind: EcoEvidenceKind;
  issuer: string;
  reference: string;
  scope: string;
  reviewStatus: EcoEvidenceReviewStatus;
  validUntil?: string | null;
};

export type EcoEvidenceRequirement = {
  code: string;
  anyOf: readonly EcoEvidenceKind[];
  reason: string;
};

export type EcoClaimIssueCode =
  | "claim_text_required"
  | "claim_scope_required"
  | "unbounded_environmental_claim"
  | "vague_environmental_claim"
  | "prohibited_single_use_plastic"
  | "plastic_tableware_requires_classification"
  | "compostable_plastic_certificate_required"
  | "state_plastic_rule_review_required"
  | "bamboo_fibre_misrepresentation"
  | "bamboo_food_contact_composite"
  | "claim_percentage_required"
  | "named_certification_evidence_required"
  | "evidence_metadata_incomplete"
  | "evidence_expired"
  | "evidence_rejected";

export type EcoClaimIssue = {
  code: EcoClaimIssueCode;
  message: string;
  severity: "block_product" | "block_verification" | "warning";
};

export type EcoClaimAssessmentInput = {
  categorySlugs: readonly string[];
  claimText: string;
  claimScope?: EcoClaimScope | null;
  evidence?: readonly EcoClaimEvidence[];
  asOf?: string | Date;
};

export type EcoClaimAssessment = {
  status: EcoClaimStatus;
  statusLabel: string;
  categoryEligible: boolean;
  claimTextPublishable: boolean;
  verifiedClaimText: string | null;
  applicableCategorySlugs: string[];
  claimClasses: string[];
  requirements: EcoEvidenceRequirement[];
  missingRequirements: EcoEvidenceRequirement[];
  issues: EcoClaimIssue[];
};

export const TARGET_ECO_PRODUCT_CATEGORY_SLUGS = [
  "sustainable-clothing-textiles",
  "compostable-reusable-tableware",
  "bamboo-products",
  "farm-produce-value-added-products",
  "agricultural-residue-byproduct-products",
  // Existing adjacent category: claims made here use the same plastic rules.
  "biodegradable-compostable-packaging",
] as const;

const targetCategories = new Set<string>(TARGET_ECO_PRODUCT_CATEGORY_SLUGS);

const textileCategories = new Set(["sustainable-clothing-textiles"]);
const tablewareCategories = new Set([
  "compostable-reusable-tableware",
]);
const bambooCategories = new Set(["bamboo-products"]);
const farmProduceCategories = new Set([
  "farm-produce-value-added-products",
]);
const residueCategories = new Set([
  "agricultural-residue-byproduct-products",
]);

const plasticPattern =
  /\b(?:plastic|polypropylene|polystyrene|thermocol|polyethylene|polyvinyl|pvc|pet|pla|pbat|bioplastic|bio-plastic)\b/u;
const prohibitedTablewarePattern =
  /\b(?:plate|plates|cup|cups|glass|glasses|fork|forks|spoon|spoons|knife|knives|straw|straws|tray|trays|stirrer|stirrers|cutlery)\b/u;
const explicitSingleUsePattern =
  /\b(?:single[ -]?use|disposable|one[ -]?time(?: use)?|use[ -]?and[ -]?throw|throwaway)\b/u;
const reusablePattern =
  /\b(?:reusable|multi[ -]?use|washable|refillable|repairable|returnable)\b/u;
const compostablePattern = /\bcompost(?:able|ability|ing)?\b/u;
const biodegradablePattern = /\bbiodegrad(?:able|ability|ation)?\b/u;
const organicPattern = /\borganic\b/u;
const bambooPattern = /\bbamboo\b/u;
const recycledPattern = /\brecycl(?:ed|able|ing)\b/u;
const residuePattern =
  /\b(?:agri(?:cultural)?[ -]?residue|crop[ -]?residue|farm[ -]?residue|bagasse|rice[ -]?husk|paddy[ -]?straw|wheat[ -]?straw|crop[ -]?waste|farm[ -]?waste|by[ -]?product|upcycled)\b/u;
const foodPattern =
  /\b(?:food|edible|snack|flour|jaggery|pickle|juice|millet|rice|grain|spice|fruit|vegetable|pulp)\b/u;
const foodContactPattern =
  /\b(?:food[ -]?contact|tableware|plate|plates|cup|cups|glass|glasses|fork|forks|spoon|spoons|knife|knives|straw|straws|tray|trays|stirrer|stirrers|cutlery|bowl|bowls)\b/u;
const carbonPattern =
  /\b(?:carbon[ -]?neutral|net[ -]?zero|zero[ -]?carbon|carbon[ -]?negative|climate[ -]?positive)\b/u;
const genericEnvironmentalPattern =
  /\b(?:eco[ -]?friendly|environmentally friendly|green|sustainable|natural|pure|planet[ -]?friendly|earth[ -]?friendly)\b/u;
const unboundedEnvironmentalPattern =
  /\b(?:100% eco[ -]?friendly|completely green|completely sustainable|zero environmental impact|no environmental impact|environmentally safe|planet safe|chemical[ -]?free|guilt[ -]?free)\b/u;
const namedCertificationPattern =
  /\b(?:certified|certification|ecomark|india organic|jaivik bharat|pgs[ -]?india|npop)\b/u;

function normalizeText(value: string) {
  return value.normalize("NFKC").trim().toLocaleLowerCase("en-IN");
}

function unique(values: readonly string[]) {
  return [...new Set(values)];
}

function hasCategory(categories: readonly string[], group: Set<string>) {
  return categories.some((category) => group.has(category));
}

function containsPlasticMaterial(text: string) {
  const withoutNegatedPlastic = text
    .replace(/\bplastic[ -]?free\b/gu, "")
    .replace(/\b(?:without|no) plastic\b/gu, "");
  return plasticPattern.test(withoutNegatedPlastic);
}

function hasQuantifiedContent(text: string) {
  return /\b\d{1,3}(?:\.\d+)?\s*%/u.test(text);
}

function asTimestamp(value: string | Date | undefined) {
  if (!value) return Date.now();
  const timestamp = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : Date.now();
}

function validAcceptedEvidence(
  evidence: readonly EcoClaimEvidence[],
  asOf: number,
  issues: EcoClaimIssue[],
) {
  const acceptedKinds = new Set<EcoEvidenceKind>();
  let hasSubmittedEvidence = false;

  for (const item of evidence) {
    if (item.reviewStatus === "rejected") {
      issues.push({
        code: "evidence_rejected",
        message: `Evidence ${item.id || "record"} was rejected and cannot support a public claim.`,
        severity: "warning",
      });
      continue;
    }

    hasSubmittedEvidence = true;
    const complete = Boolean(
      item.id.trim() &&
        item.issuer.trim() &&
        item.reference.trim() &&
        item.scope.trim(),
    );
    if (!complete) {
      issues.push({
        code: "evidence_metadata_incomplete",
        message:
          "Evidence needs an identifier, issuer, reference, and product-specific scope.",
        severity: "block_verification",
      });
      continue;
    }

    if (item.validUntil) {
      const validUntil = Date.parse(item.validUntil);
      if (!Number.isFinite(validUntil) || validUntil < asOf) {
        issues.push({
          code: "evidence_expired",
          message: `Evidence ${item.id} is expired or has an invalid expiry date.`,
          severity: "block_verification",
        });
        continue;
      }
    }

    if (item.reviewStatus === "accepted") acceptedKinds.add(item.kind);
  }

  return { acceptedKinds, hasSubmittedEvidence };
}

function addRequirement(
  requirements: EcoEvidenceRequirement[],
  requirement: EcoEvidenceRequirement,
) {
  if (!requirements.some((candidate) => candidate.code === requirement.code)) {
    requirements.push(requirement);
  }
}

function addIssue(issues: EcoClaimIssue[], issue: EcoClaimIssue) {
  if (!issues.some((candidate) => candidate.code === issue.code)) {
    issues.push(issue);
  }
}

/**
 * Detects an explicit conventional single-use-plastic tableware claim.
 * Certified compostable plastic is handled separately because rule 4(3) of the
 * central 2021 amendment creates an exception, subject to CPCB certification
 * and any stricter state/local rule.
 */
export function isProhibitedSingleUsePlasticClaim(claimText: string) {
  const text = normalizeText(claimText);
  if (!containsPlasticMaterial(text) || !prohibitedTablewarePattern.test(text)) {
    return false;
  }

  const compostablePlastic = compostablePattern.test(text);
  const clearlyReusable = reusablePattern.test(text);
  return (
    !compostablePlastic &&
    !clearlyReusable &&
    (explicitSingleUsePattern.test(text) || biodegradablePattern.test(text))
  );
}

export function assessEcoProductClaim(
  input: EcoClaimAssessmentInput,
): EcoClaimAssessment {
  const claimText = input.claimText.trim().replace(/\s+/gu, " ");
  const text = normalizeText(claimText);
  const categories = unique(
    input.categorySlugs.map(normalizeText).filter((slug) => targetCategories.has(slug)),
  );
  const evidence = input.evidence ?? [];
  const issues: EcoClaimIssue[] = [];
  const requirements: EcoEvidenceRequirement[] = [];
  const claimClasses = new Set<string>();
  const { acceptedKinds, hasSubmittedEvidence } = validAcceptedEvidence(
    evidence,
    asTimestamp(input.asOf),
    issues,
  );

  if (!text) {
    addIssue(issues, {
      code: "claim_text_required",
      message: "A specific environmental claim is required before evidence can be reviewed.",
      severity: "block_verification",
    });
  }
  if (!input.claimScope) {
    addIssue(issues, {
      code: "claim_scope_required",
      message:
        "Specify whether the claim covers the product, a component, manufacturing, packaging, use, or disposal.",
      severity: "block_verification",
    });
  }

  if (unboundedEnvironmentalPattern.test(text)) {
    addIssue(issues, {
      code: "unbounded_environmental_claim",
      message:
        "Rewrite absolute or unqualified environmental wording as a specific, measurable claim.",
      severity: "block_verification",
    });
  }

  const containsPlastic = containsPlasticMaterial(text);
  const isTableware =
    hasCategory(categories, tablewareCategories) ||
    prohibitedTablewarePattern.test(text);
  const isCompostablePlastic =
    containsPlastic && compostablePattern.test(text);
  const isReusablePlastic = containsPlastic && reusablePattern.test(text);

  if (isProhibitedSingleUsePlasticClaim(text)) {
    addIssue(issues, {
      code: "prohibited_single_use_plastic",
      message:
        "Conventional or merely biodegradable single-use plastic plates, cups, glasses, cutlery, straws, trays, and stirrers are not eligible as eco products.",
      severity: "block_product",
    });
  } else if (
    containsPlastic &&
    isTableware &&
    !isCompostablePlastic &&
    !isReusablePlastic
  ) {
    addIssue(issues, {
      code: "plastic_tableware_requires_classification",
      message:
        "Plastic tableware is blocked until trusted review proves it is lawful durable reusable ware rather than prohibited single-use plastic.",
      severity: "block_product",
    });
  }

  if (isCompostablePlastic) {
    claimClasses.add("compostable_plastic");
    addRequirement(requirements, {
      code: "cpcb_compostable_plastic_certificate",
      anyOf: ["cpcb_compostable_plastic_certificate"],
      reason:
        "Compostable plastic requires a product/manufacturer or seller certificate under CPCB's Rule 4(h) process.",
    });
    addIssue(issues, {
      code: "state_plastic_rule_review_required",
      message:
        "A reviewer must check the destination state's current plastic restrictions; some state rules are stricter than the central compostable-plastic exception.",
      severity: "warning",
    });
    if (!acceptedKinds.has("cpcb_compostable_plastic_certificate")) {
      addIssue(issues, {
        code: "compostable_plastic_certificate_required",
        message:
          "Do not present compostable plastic as an eco product until the CPCB certificate and exact product scope are accepted.",
        severity: "block_product",
      });
    }
  } else if (compostablePattern.test(text)) {
    claimClasses.add("compostable_non_plastic");
    addRequirement(requirements, {
      code: "compostability_test",
      anyOf: ["compostability_test_report"],
      reason:
        "The claimed product, not merely its raw material, needs a scoped compostability test and disposal conditions.",
    });
  }

  if (biodegradablePattern.test(text) && !compostablePattern.test(text)) {
    claimClasses.add("biodegradable");
    addRequirement(requirements, {
      code: "biodegradability_evidence",
      anyOf: containsPlastic
        ? ["cpcb_biodegradable_plastic_certificate"]
        : ["biodegradability_test_report"],
      reason:
        "Biodegradability needs product-specific test/certification evidence and stated receiving conditions and timeframe.",
    });
  }

  if (reusablePattern.test(text)) {
    claimClasses.add("reusable");
    addRequirement(requirements, {
      code: "reuse_durability",
      anyOf: ["durability_reuse_test"],
      reason: "A reusable claim needs evidence of expected use cycles and durability.",
    });
    addRequirement(requirements, {
      code: "reuse_instructions",
      anyOf: ["reuse_care_instructions"],
      reason: "Buyers need cleaning, care, repair, and safe reuse instructions.",
    });
  }

  if (recycledPattern.test(text)) {
    claimClasses.add("recycled_content");
    addRequirement(requirements, {
      code: "recycled_content",
      anyOf: ["recycled_content_chain_of_custody"],
      reason:
        "A recycled-content claim needs traceable input records for the exact product and stated percentage.",
    });
    addRequirement(requirements, {
      code: "material_composition",
      anyOf: ["material_composition_report"],
      reason: "The finished product's material composition must match the claim.",
    });
    if (!hasQuantifiedContent(text)) {
      addIssue(issues, {
        code: "claim_percentage_required",
        message: "State the verified recycled-content percentage and what it measures.",
        severity: "block_verification",
      });
    }
  }

  const isTextile = hasCategory(categories, textileCategories);
  const isFarmProduce = hasCategory(categories, farmProduceCategories);
  if (organicPattern.test(text)) {
    claimClasses.add(isTextile ? "organic_textile" : "organic_product");
    addRequirement(requirements, {
      code: "recognized_organic_certificate",
      anyOf: ["recognized_organic_certificate"],
      reason:
        "Organic claims require an active, product-scoped certificate under a recognized system; self-declaration is not enough.",
    });
    if (isTextile) {
      addRequirement(requirements, {
        code: "organic_textile_chain_of_custody",
        anyOf: ["textile_chain_of_custody"],
        reason:
          "An organic-fibre certificate must be traceable through processing to the claimed textile product.",
      });
      addRequirement(requirements, {
        code: "material_composition",
        anyOf: ["material_composition_report"],
        reason: "The finished textile's fibre composition must match the scoped claim.",
      });
    }
    if (isFarmProduce && foodPattern.test(text)) {
      addRequirement(requirements, {
        code: "food_business_registration",
        anyOf: ["fssai_food_business_registration"],
        reason:
          "Organic value-added food also needs the applicable FSSAI food-business registration/licence; organic evidence does not replace food compliance.",
      });
    }
  }

  const isBamboo = hasCategory(categories, bambooCategories) || bambooPattern.test(text);
  if (isBamboo && bambooPattern.test(text)) {
    claimClasses.add("bamboo_content");
    addRequirement(requirements, {
      code: "bamboo_material_composition",
      anyOf: ["material_composition_report"],
      reason:
        "A bamboo claim needs the finished product's bamboo percentage and disclosure of binders, coatings, fibres, or regenerated cellulose.",
    });
    if (
      /\b(?:viscose|rayon|regenerated cellulose)\b/u.test(text) &&
      /\b(?:natural|raw|unprocessed|pure) bamboo (?:fibre|fiber)\b/u.test(text)
    ) {
      addIssue(issues, {
        code: "bamboo_fibre_misrepresentation",
        message:
          "Bamboo viscose/rayon or regenerated cellulose must not be presented as raw, pure, or unprocessed natural bamboo fibre.",
        severity: "block_verification",
      });
    }

    if (foodContactPattern.test(text) || hasCategory(categories, tablewareCategories)) {
      claimClasses.add("bamboo_food_contact");
      addRequirement(requirements, {
        code: "bamboo_food_contact_compliance",
        anyOf: ["bamboo_food_contact_compliance"],
        reason:
          "Bamboo food-contact products need evidence of hygienic manufacture, edible bamboo, safe composition, and the applicable FSSAI conditions.",
      });
      addRequirement(requirements, {
        code: "food_contact_safety",
        anyOf: ["food_contact_safety_report"],
        reason: "Food-contact safety must be supported for the exact finished product.",
      });
      addRequirement(requirements, {
        code: "reuse_durability",
        anyOf: ["durability_reuse_test"],
        reason:
          "FSSAI's bamboo food-contact guidance describes the final product as durable and reusable with good shelf life.",
      });
      if (/\b(?:composite|melamine|plastic binder|plastic blend)\b/u.test(text)) {
        addIssue(issues, {
          code: "bamboo_food_contact_composite",
          message:
            "A bamboo-plastic/melamine composite cannot use FarmerBook's pure-bamboo food-contact environmental claim path.",
          severity: "block_verification",
        });
      }
    }
  }

  const isResidue =
    hasCategory(categories, residueCategories) || residuePattern.test(text);
  if (isResidue && residuePattern.test(text)) {
    claimClasses.add("agricultural_residue_content");
    addRequirement(requirements, {
      code: "agri_residue_chain_of_custody",
      anyOf: ["agri_residue_chain_of_custody"],
      reason:
        "Residue/by-product claims need purchase, source, processing, and mass-balance records.",
    });
    addRequirement(requirements, {
      code: "material_composition",
      anyOf: ["material_composition_report"],
      reason:
        "The finished product must disclose the residue percentage plus binders, coatings, plastics, and other inputs.",
    });
    if (!hasQuantifiedContent(text)) {
      addIssue(issues, {
        code: "claim_percentage_required",
        message:
          "State the verified agricultural-residue percentage and whether it applies to the whole product or one component.",
        severity: "block_verification",
      });
    }
  }

  if (/\b(?:responsibly sourced|sustainably sourced)\b/u.test(text)) {
    claimClasses.add("responsible_sourcing");
    addRequirement(requirements, {
      code: "responsible_source_chain",
      anyOf: ["responsible_source_chain_of_custody"],
      reason:
        "A sourcing claim needs a named source standard and chain-of-custody records.",
    });
  }

  if (carbonPattern.test(text)) {
    claimClasses.add("carbon_or_climate");
    addRequirement(requirements, {
      code: "footprint_assessment",
      anyOf: ["lifecycle_or_footprint_assessment"],
      reason:
        "A carbon/climate claim needs a current product boundary, baseline, method, data period, and footprint assessment.",
    });
    addRequirement(requirements, {
      code: "independent_verification",
      anyOf: ["independent_verification"],
      reason: "A neutral/net-zero/negative claim needs independent verification.",
    });
  }

  if (/\becomark\b/u.test(text)) {
    claimClasses.add("ecomark");
    addRequirement(requirements, {
      code: "ecomark_licence",
      anyOf: ["ecomark_licence"],
      reason: "The Ecomark name/logo may be presented only with a product-scoped licence.",
    });
  }

  if (namedCertificationPattern.test(text)) {
    const hasCertificationRequirement = requirements.some((requirement) =>
      requirement.anyOf.some((kind) =>
        [
          "recognized_organic_certificate",
          "cpcb_compostable_plastic_certificate",
          "cpcb_biodegradable_plastic_certificate",
          "ecomark_licence",
        ].includes(kind),
      ),
    );
    if (!hasCertificationRequirement) {
      addIssue(issues, {
        code: "named_certification_evidence_required",
        message:
          "Name the certification, issuer, reference, validity, and exact product scope before using certified wording.",
        severity: "block_verification",
      });
    }
  }

  const hasSpecificClaimClass = claimClasses.size > 0;
  if (genericEnvironmentalPattern.test(text) && !hasSpecificClaimClass) {
    addIssue(issues, {
      code: "vague_environmental_claim",
      message:
        "Generic terms such as eco-friendly, green, natural, or sustainable need a specific measurable qualifier and evidence.",
      severity: "block_verification",
    });
  }

  // A plastic-free statement is measurable and needs finished-product composition.
  if (/\b(?:plastic[ -]?free|without plastic|no plastic)\b/u.test(text)) {
    claimClasses.add("plastic_free");
    addRequirement(requirements, {
      code: "plastic_free_material_composition",
      anyOf: ["material_composition_report"],
      reason:
        "A plastic-free claim must cover coatings, liners, binders, adhesives, and packaging within its stated scope.",
    });
  }

  const missingRequirements = requirements.filter(
    (requirement) =>
      !requirement.anyOf.some((kind) => acceptedKinds.has(kind)),
  );
  const productBlocked = issues.some(
    (issue) => issue.severity === "block_product",
  );
  const verificationBlocked = issues.some(
    (issue) => issue.severity === "block_verification",
  );
  const verified = Boolean(
    text &&
      input.claimScope &&
      hasSpecificClaimClass &&
      !productBlocked &&
      !verificationBlocked &&
      requirements.length > 0 &&
      missingRequirements.length === 0,
  );
  const status: EcoClaimStatus = verified
    ? "verified"
    : hasSubmittedEvidence
      ? "evidence_submitted"
      : "seller_declared";

  return {
    status,
    statusLabel: ECO_CLAIM_STATUS_LABELS[status],
    categoryEligible: !productBlocked,
    claimTextPublishable: verified,
    verifiedClaimText: verified ? claimText : null,
    applicableCategorySlugs: categories,
    claimClasses: [...claimClasses],
    requirements,
    missingRequirements,
    issues,
  };
}
