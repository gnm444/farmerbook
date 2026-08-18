import { z } from "zod";
import { ECO_FRIENDLY_COMPANY_SECTOR_SLUGS } from "@/lib/agriculture/company-sectors";
import {
  assessEcoProductIntakeClaim,
  parseEvidenceLinks,
  prohibitedPlasticIntakeIssue,
} from "./intake-claims";

export const ECO_PRODUCT_BUSINESS_ROLES = [
  "manufacturer_brand",
  "dealer_distributor",
  "both",
] as const;

export type EcoProductBusinessRole =
  (typeof ECO_PRODUCT_BUSINESS_ROLES)[number];

export const ecoProductBusinessRoleLabels: Record<
  EcoProductBusinessRole,
  string
> = {
  manufacturer_brand: "Manufacturer",
  dealer_distributor: "Distributor",
  both: "Manufacturer and distributor",
};

const singleLine = (minimum: number, maximum: number) =>
  z
    .string()
    .trim()
    .min(minimum)
    .max(maximum)
    .regex(/^[^\r\n]+$/, "Use one line without control characters.");

const optionalHttpsUrl = z
  .union([
    z.literal(""),
    z
      .url("Enter a valid website URL.")
      .max(300)
      .refine((value) => value.startsWith("https://"), "Use an HTTPS website URL."),
  ])
  .optional()
  .transform((value) => value || undefined);

export const ecoProductIntakeSchema = z
  .strictObject({
    businessRole: z.enum(ECO_PRODUCT_BUSINESS_ROLES),
    organizationName: singleLine(2, 120),
    representativeName: singleLine(2, 120),
    email: z.email("Enter a valid email address.").max(254),
    phone: z
      .union([
        z.literal(""),
        z
          .string()
          .trim()
          .regex(
            /^[+0-9][0-9 ()-]{6,20}$/,
            "Enter a valid phone number with its country code.",
          ),
      ])
      .optional()
      .transform((value) => value || undefined),
    location: singleLine(2, 160),
    websiteUrl: optionalHttpsUrl,
    categorySlugs: z
      .array(z.enum(ECO_FRIENDLY_COMPANY_SECTOR_SLUGS))
      .min(1, "Choose at least one product category.")
      .max(ECO_FRIENDLY_COMPANY_SECTOR_SLUGS.length)
      .refine((values) => new Set(values).size === values.length),
    productName: singleLine(2, 120),
    productDescription: z.string().trim().min(30).max(600),
    environmentalClaims: z.string().trim().max(400),
    evidenceLinks: z.string().trim().max(500),
    consent: z.literal(true, {
      error: "Confirm that you want to prepare this application for FarmerBook review.",
    }),
  })
  .superRefine((application, context) => {
    const evidenceLinks = parseEvidenceLinks(application.evidenceLinks);
    if (evidenceLinks.length > 5) {
      context.addIssue({
        code: "custom",
        path: ["evidenceLinks"],
        message: "Add no more than five evidence links.",
      });
    }
    if (
      evidenceLinks.some((value) => {
        try {
          return new URL(value).protocol !== "https:";
        } catch {
          return true;
        }
      })
    ) {
      context.addIssue({
        code: "custom",
        path: ["evidenceLinks"],
        message: "Put each public HTTPS evidence link on its own line.",
      });
    }

    const assessment = assessEcoProductIntakeClaim(application);
    const issue = prohibitedPlasticIntakeIssue(application);
    if (issue) {
      context.addIssue({
        code: "custom",
        path: ["productDescription"],
        message: issue.message,
      });
    }

    const vagueClaimIssue = assessment.issues.find((candidate) =>
      ["unbounded_environmental_claim", "vague_environmental_claim"].includes(
        candidate.code,
      ),
    );
    if (application.environmentalClaims && vagueClaimIssue) {
      context.addIssue({
        code: "custom",
        path: ["environmentalClaims"],
        message: vagueClaimIssue.message,
      });
    }

    const certificationNeedsEvidence =
      /\b(?:certified|certification|certificate|ecomark|india organic|jaivik bharat|pgs[ -]?india|npop)\b/iu.test(
        application.environmentalClaims,
      ) ||
      assessment.issues.some((candidate) =>
        [
          "named_certification_evidence_required",
          "compostable_plastic_certificate_required",
        ].includes(candidate.code),
      );
    if (certificationNeedsEvidence && evidenceLinks.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["evidenceLinks"],
        message:
          "Add a public evidence link for certified wording or compostable plastic. FarmerBook will still review it separately.",
      });
    }
  });

export type EcoProductIntake = z.infer<typeof ecoProductIntakeSchema>;
