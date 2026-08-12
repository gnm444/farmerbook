import { z } from "zod";
import { SELECTABLE_AGRICULTURE_CATEGORIES } from "@/lib/agriculture/categories";
import { SUPPORTED_LOCALES } from "@/lib/i18n/locales";
import { INDIA_STATES_AND_UNION_TERRITORIES } from "@/lib/india/regions";
import { isSupportedOwnedSocialProfileUrl } from "./social-link-policy";

const categorySlugs = new Set<string>(
  SELECTABLE_AGRICULTURE_CATEGORIES.map((category) => category.slug),
);

export const safeProfileResearchText = (minimum: number, maximum: number) =>
  z
    .string()
    .trim()
    .min(minimum)
    .max(maximum)
    .refine(
      (value) =>
        !/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u202A-\u202E\u2066-\u2069]/.test(
          value,
        ),
      "Control and bidirectional override characters are not allowed.",
    );

export const profileResearchSourceUrl = z
  .url()
  .max(2_048)
  .refine((value) => new URL(value).protocol === "https:", {
    message: "Profile research sources must use HTTPS.",
  });

export const profileSampleEvidenceSchema = z
  .object({
    sourceUrl: profileResearchSourceUrl,
    sourceType: z.enum([
      "website",
      "youtube",
      "instagram",
      "facebook",
      "linkedin",
      "other_social",
      "pasted_description",
      "screenshot_ocr",
    ]),
    sourceTitle: safeProfileResearchText(1, 180).optional(),
    sourceText: safeProfileResearchText(2, 8_000),
    sourceHash: z.string().regex(/^[0-9a-f]{64}$/),
    collectedAt: z.iso.datetime(),
    subjectAssociation: z
      .enum([
        "owned_social_profile",
        "third_party_coverage",
        "professional_reference",
      ])
      .optional(),
    discoveryProvider: z
      .enum([
        "brave_search",
        "manual_google_review",
        "youtube_data_api",
        "operator_supplied",
      ])
      .optional(),
    providerQueryHash: z.string().regex(/^[0-9a-f]{64}$/).optional(),
    providerItemId: safeProfileResearchText(1, 160).optional(),
    usageRightsBasis: z
      .enum([
        "provider_storage_plan",
        "operator_selected_destination",
        "youtube_api_terms",
        "operator_supplied",
      ])
      .optional(),
  })
  .strict()
  .superRefine((value, context) => {
    const invalid = (() => {
      if (!value.discoveryProvider) {
        return Boolean(
          value.providerQueryHash ||
            value.providerItemId ||
            value.usageRightsBasis,
        );
      }
      if (value.discoveryProvider === "brave_search") {
        return !(
          value.providerQueryHash &&
          value.usageRightsBasis === "provider_storage_plan" &&
          !value.providerItemId
        );
      }
      if (value.discoveryProvider === "manual_google_review") {
        return !(
          value.providerQueryHash &&
          value.usageRightsBasis === "operator_selected_destination" &&
          !value.providerItemId
        );
      }
      if (value.discoveryProvider === "youtube_data_api") {
        return !(
          value.providerQueryHash &&
          value.providerItemId &&
          value.usageRightsBasis === "youtube_api_terms"
        );
      }
      return !(
        value.usageRightsBasis === "operator_supplied" &&
        !value.providerQueryHash &&
        !value.providerItemId
      );
    })();
    if (invalid) {
      context.addIssue({
        code: "custom",
        path: ["discoveryProvider"],
        message: "Search evidence requires complete provider provenance.",
      });
    }
    if (
      value.subjectAssociation === "owned_social_profile" &&
      !isSupportedOwnedSocialProfileUrl(value.sourceUrl, value.sourceType)
    ) {
      context.addIssue({
        code: "custom",
        path: ["sourceUrl"],
        message:
          "Farmer-owned social links must point to a supported account profile, not a post, video or coverage page.",
      });
    }
  });

export const managedProfileAgentInputSchema = z
  .object({
    sampleId: z.uuid(),
    prospectId: z.uuid(),
    subjectName: safeProfileResearchText(2, 100).optional(),
    preferredLocale: z.enum(SUPPORTED_LOCALES),
    evidence: z.array(profileSampleEvidenceSchema).min(1).max(12),
  })
  .strict();

const socialLink = profileResearchSourceUrl.optional();

export const profileSampleClaimSchema = z
  .object({
    field: z.enum([
      "fullName",
      "headline",
      "district",
      "state",
      "bio",
      "categorySlugs",
      "farmingMethod",
      "experienceYears",
      "website",
      "linkedin",
      "instagram",
      "facebook",
      "youtube",
    ]),
    value: safeProfileResearchText(1, 500),
    sourceUrl: profileResearchSourceUrl,
    excerpt: safeProfileResearchText(2, 500),
    confidence: z.number().min(0).max(1),
  })
  .strict();

export const managedFarmerProfileSampleSchema = z
  .object({
    fullName: safeProfileResearchText(2, 100),
    headline: safeProfileResearchText(2, 160),
    district: safeProfileResearchText(2, 100).optional(),
    state: z.enum(INDIA_STATES_AND_UNION_TERRITORIES).optional(),
    bio: safeProfileResearchText(2, 500),
    categorySlugs: z
      .array(z.string())
      .max(8)
      .transform((values) => [...new Set(values)])
      .refine(
        (values) => values.every((value) => categorySlugs.has(value)),
        "The profile contains an unknown agriculture category.",
      ),
    farmingMethod: z
      .enum(["organic", "natural", "conventional", "mixed"])
      .optional(),
    experienceYears: z.number().int().min(0).max(80).optional(),
    socialLinks: z
      .object({
        website: socialLink,
        linkedin: socialLink,
        instagram: socialLink,
        facebook: socialLink,
        youtube: socialLink,
      })
      .strict(),
    claims: z.array(profileSampleClaimSchema).min(1).max(24),
    limitations: z.array(safeProfileResearchText(2, 300)).min(1).max(8),
  })
  .strict();

export const profileSampleBuildActionSchema = z
  .object({
    prospectId: z.uuid(),
    subjectName: safeProfileResearchText(2, 100).optional(),
    idempotencyKey: z.uuid(),
  })
  .strict();

export const profileNameDiscoveryActionSchema = z
  .object({
    fullName: safeProfileResearchText(2, 100).refine(
      (value) => value.split(/\s+/u).length <= 12,
      "Use no more than 12 words for the Farmer name.",
    ),
    locationHint: safeProfileResearchText(2, 120)
      .refine(
        (value) => value.split(/\s+/u).length <= 12,
        "Use no more than 12 words for the location hint.",
      )
      .optional(),
    farmingHint: safeProfileResearchText(2, 120)
      .refine(
        (value) => value.split(/\s+/u).length <= 18,
        "Use no more than 18 words for the farming hint.",
      )
      .optional(),
    idempotencyKey: z.uuid(),
  })
  .strict();

export const profileSampleDecisionSchema = z
  .object({
    token: z.string().min(40).max(768),
    decision: z.enum(["approve", "reject"]),
  })
  .strict();

export const approvalWorkflowInputSchema = z
  .object({
    sampleId: z.uuid(),
    sampleFingerprint: z.string().regex(/^[0-9a-f]{64}$/),
  })
  .strict();

export type ManagedProfileAgentInput = z.infer<
  typeof managedProfileAgentInputSchema
>;
export type ManagedFarmerProfileSample = z.infer<
  typeof managedFarmerProfileSampleSchema
>;
export type ApprovalWorkflowInput = z.infer<
  typeof approvalWorkflowInputSchema
>;
export type ProfileNameDiscoveryInput = z.infer<
  typeof profileNameDiscoveryActionSchema
>;
