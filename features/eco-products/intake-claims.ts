import {
  assessEcoProductClaim,
  type EcoClaimAssessment,
} from "./claims-policy";
import type { EcoProductIntake } from "./intake-schema";

export const INTAKE_EVIDENCE_STATE_LABELS = {
  not_provided: "Evidence state: no evidence references supplied",
  provided_not_received:
    "Evidence state: references added to the prepared email — FarmerBook review has not started",
} as const;

export type IntakeEvidenceState = keyof typeof INTAKE_EVIDENCE_STATE_LABELS;

type IntakeClaimFields = Pick<
  EcoProductIntake,
  | "categorySlugs"
  | "productName"
  | "productDescription"
  | "environmentalClaims"
  | "evidenceLinks"
>;

export function intakeEvidenceState(input: IntakeClaimFields) {
  return input.evidenceLinks.trim()
    ? ("provided_not_received" as const)
    : ("not_provided" as const);
}

export function assessEcoProductIntakeClaim(
  input: IntakeClaimFields,
): EcoClaimAssessment {
  return assessEcoProductClaim({
    categorySlugs: input.categorySlugs,
    claimText: [
      input.productName,
      input.productDescription,
      input.environmentalClaims,
    ]
      .filter(Boolean)
      .join(". "),
    // The public intake collects an introduction, not a trusted claim scope or
    // moderation record. A reviewer must classify scope before verification.
    claimScope: null,
    evidence: parseEvidenceLinks(input.evidenceLinks).map((reference, index) => ({
      id: `seller-link-${index + 1}`,
      kind: "other_supporting_document",
      issuer: "Seller submission — unreviewed",
      reference,
      scope: "Scope not yet reviewed",
      reviewStatus: "submitted",
    })),
  });
}

export function parseEvidenceLinks(value: string) {
  return value
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function prohibitedPlasticIntakeIssue(input: IntakeClaimFields) {
  for (const claimText of [
    input.productName,
    input.productDescription,
    input.environmentalClaims,
  ]) {
    if (!claimText.trim()) continue;
    const issue = assessEcoProductClaim({
      categorySlugs: input.categorySlugs,
      claimText,
      claimScope: null,
      evidence: [],
    }).issues.find((candidate) =>
      [
        "prohibited_single_use_plastic",
        "plastic_tableware_requires_classification",
      ].includes(candidate.code),
    );
    if (issue) return issue;
  }
  return undefined;
}
