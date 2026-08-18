import {
  FARMERBOOK_CONTACT_EMAIL,
} from "@/lib/contact";
import { agricultureCompanySectorBySlug } from "@/lib/agriculture/company-sectors";
import {
  ecoProductBusinessRoleLabels,
  ecoProductIntakeSchema,
  type EcoProductIntake,
} from "./intake-schema";
import {
  INTAKE_EVIDENCE_STATE_LABELS,
  assessEcoProductIntakeClaim,
  intakeEvidenceState,
} from "./intake-claims";

export function buildEcoProductApplicationSummary(input: EcoProductIntake) {
  const application = ecoProductIntakeSchema.parse(input);
  const categories = application.categorySlugs
    .map((slug) => agricultureCompanySectorBySlug(slug)?.name ?? slug)
    .join("; ");
  const claimAssessment = assessEcoProductIntakeClaim(application);
  const evidenceState = intakeEvidenceState(application);

  return [
    "FarmerBook eco-product supplier application",
    "",
    `Business role: ${ecoProductBusinessRoleLabels[application.businessRole]}`,
    `Organization: ${application.organizationName}`,
    `Authorized representative: ${application.representativeName}`,
    `Email: ${application.email}`,
    `Phone: ${application.phone ?? "Not provided"}`,
    `Location: ${application.location}`,
    `Website: ${application.websiteUrl ?? "Not provided"}`,
    `Product categories: ${categories}`,
    "",
    `Product: ${application.productName}`,
    "Product description:",
    application.productDescription,
    "",
    "Seller-described environmental claims:",
    application.environmentalClaims || "No environmental claim supplied",
    "",
    "Evidence links, certificate names or test-report details:",
    application.evidenceLinks || "Not provided",
    "",
    `Claim state: ${claimAssessment.statusLabel}`,
    INTAKE_EVIDENCE_STATE_LABELS[evidenceState],
    "Applicant-provided links are not accepted evidence until a trusted reviewer records a decision.",
    "",
    "I am sending these details for FarmerBook supplier application review. I understand that selecting an eco-friendly category does not create a certification or verification badge.",
  ].join("\n");
}

export function buildEcoProductApplicationEmail(input: EcoProductIntake) {
  const application = ecoProductIntakeSchema.parse(input);
  const subject = `Eco-product supplier application: ${application.organizationName}`;
  const summary = buildEcoProductApplicationSummary(application);
  const claimAssessment = assessEcoProductIntakeClaim(application);
  const evidenceState = intakeEvidenceState(application);

  return {
    recipient: FARMERBOOK_CONTACT_EMAIL,
    subject,
    summary,
    claimAssessment,
    evidenceState,
    evidenceStateLabel: INTAKE_EVIDENCE_STATE_LABELS[evidenceState],
    href: `mailto:${FARMERBOOK_CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(summary)}`,
  };
}
