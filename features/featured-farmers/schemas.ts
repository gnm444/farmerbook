import { z } from "zod";
import { SELECTABLE_AGRICULTURE_CATEGORIES } from "@/lib/agriculture/categories";
import { SUPPORTED_LOCALES } from "@/lib/i18n/locales";
import { INDIA_STATES_AND_UNION_TERRITORIES } from "@/lib/india/regions";
import {
  profileResearchSourceUrl,
  safeProfileResearchText,
} from "@/features/profile-agent/schemas";

const categorySlugs = new Set<string>(
  SELECTABLE_AGRICULTURE_CATEGORIES.map((category) => category.slug),
);

export const featuredFarmerSourceTypes = [
  "website",
  "youtube",
  "instagram",
  "facebook",
  "linkedin",
  "other_social",
] as const;

export const featuredFarmerDiscoveryMethods = [
  "manual_google_review",
  "youtube_data_api",
  "operator_supplied",
] as const;

export const featuredFarmerSourceQualities = [
  "official_record",
  "institutional_reference",
  "independent_reporting",
  "first_party",
  "owned_social_profile",
  "third_party_coverage",
] as const;

export const featuredFarmerSourceAssociations = [
  "professional_reference",
  "owned_social_profile",
  "third_party_coverage",
] as const;

export const featuredFarmerClaimTypes = [
  "significance",
  "impact",
  "award",
  "innovation",
  "community",
  "knowledge_sharing",
  "ecological_stewardship",
  "leadership",
] as const;

export const featuredFarmerStorySectionKinds = [
  "origin",
  "work",
  "impact",
  "community",
  "lessons",
] as const;

export const featuredFarmerSocialPlatforms = [
  "youtube",
  "instagram",
  "facebook",
  "linkedin",
] as const;

export const featuredFarmerMediaRightsBases = [
  "subject_permission",
  "publisher_licence",
  "farmerbook_owned",
  "open_licence",
] as const;

export const featuredFarmerSlugSchema = z
  .string()
  .trim()
  .min(3)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use a lowercase URL slug.");

const publicDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), {
    message: "Use a valid date.",
  });

export const featuredFarmerResearchHintsSchema = z
  .object({
    fullName: safeProfileResearchText(2, 100),
    districtHint: safeProfileResearchText(2, 100).optional(),
    stateHint: z.enum(INDIA_STATES_AND_UNION_TERRITORIES).optional(),
    farmingHint: safeProfileResearchText(2, 160).optional(),
  })
  .strict();

export const createFeaturedFarmerResearchSchema = featuredFarmerResearchHintsSchema
  .extend({
    significanceHypothesis: safeProfileResearchText(20, 800),
    preferredLocale: z.enum(SUPPORTED_LOCALES),
    idempotencyKey: z.uuid(),
  })
  .strict();

export const featuredFarmerResearchIdSchema = z
  .object({ researchId: z.uuid(), idempotencyKey: z.uuid() })
  .strict();

export const addFeaturedFarmerSourceSchema = z
  .object({
    researchId: z.uuid(),
    sourceUrl: profileResearchSourceUrl,
    publisher: safeProfileResearchText(2, 160),
    sourceTitle: safeProfileResearchText(2, 240),
    publishedAt: publicDateSchema.optional(),
    description: safeProfileResearchText(20, 8_000).optional(),
    screenshotDataUrl: z
      .string()
      .max(2_800_000)
      .refine(
        (value) => /^data:image\/(?:png|jpeg|webp);base64,/i.test(value),
        "Use a PNG, JPEG or WebP screenshot.",
      )
      .optional(),
    discoveryMethod: z.enum([
      "manual_google_review",
      "operator_supplied",
    ]),
    researchPurpose: z
      .enum(["identity", "significance", "institutions", "social", "current"])
      .optional(),
    sourceQuality: z.enum(featuredFarmerSourceQualities),
    subjectAssociation: z.enum(featuredFarmerSourceAssociations),
    sourcePermissionConfirmed: z.literal(true),
    idempotencyKey: z.uuid(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      (value.discoveryMethod === "manual_google_review") !==
      Boolean(value.researchPurpose)
    ) {
      context.addIssue({
        code: "custom",
        path: ["researchPurpose"],
        message: "Google-reviewed sources require the matching research query purpose.",
      });
    }
  });

export const decideFeaturedFarmerSourceSchema = z
  .object({
    researchId: z.uuid(),
    sourceId: z.uuid(),
    decision: z.enum(["selected", "rejected"]),
    sourceQuality: z.enum(featuredFarmerSourceQualities),
    subjectAssociation: z.enum(featuredFarmerSourceAssociations),
    expectedRevision: z.number().int().nonnegative(),
    idempotencyKey: z.uuid(),
  })
  .strict();

export const featuredFarmerClaimSchema = z
  .object({
    claimKey: z
      .string()
      .min(2)
      .max(60)
      .regex(/^[a-z][a-z0-9_]*$/),
    claimType: z.enum(featuredFarmerClaimTypes),
    statement: safeProfileResearchText(10, 700),
    displayLabel: safeProfileResearchText(2, 80).optional(),
    displayValue: safeProfileResearchText(1, 80).optional(),
    displayContext: safeProfileResearchText(2, 240).optional(),
    sourceIds: z.array(z.uuid()).min(1).max(8).transform((ids) => [...new Set(ids)]),
  })
  .strict();

export const featuredFarmerStorySectionSchema = z
  .object({
    kind: z.enum(featuredFarmerStorySectionKinds),
    heading: safeProfileResearchText(2, 120),
    body: safeProfileResearchText(40, 2_500),
    claimKeys: z
      .array(z.string().regex(/^[a-z][a-z0-9_]*$/))
      .min(1)
      .max(12)
      .transform((keys) => [...new Set(keys)]),
  })
  .strict();

export const featuredFarmerMediaSchema = z
  .object({
    assetUrl: z
      .string()
      .min(1)
      .max(2_048)
      .refine(
        (value) => value.startsWith("/") || /^https:\/\//i.test(value),
        "Use a FarmerBook asset path or HTTPS image URL.",
      ),
    altText: safeProfileResearchText(5, 240),
    credit: safeProfileResearchText(2, 180),
    rightsBasis: z.enum(featuredFarmerMediaRightsBases),
    rightsReference: safeProfileResearchText(5, 500),
  })
  .strict();

const categorySlugSchema = z.string().refine(
  (value) => categorySlugs.has(value),
  "Use a supported agriculture category.",
);

export const saveFeaturedFarmerDraftSchema = z
  .object({
    researchId: z.uuid(),
    slug: featuredFarmerSlugSchema,
    headline: safeProfileResearchText(8, 180),
    deck: safeProfileResearchText(20, 360),
    whyFeatured: safeProfileResearchText(40, 900),
    sections: z.array(featuredFarmerStorySectionSchema).min(3).max(7),
    categorySlugs: z
      .array(categorySlugSchema)
      .max(8)
      .transform((slugs) => [...new Set(slugs)]),
    limitations: z
      .array(safeProfileResearchText(5, 300))
      .min(1)
      .max(8),
    claims: z.array(featuredFarmerClaimSchema).min(2).max(24),
    media: featuredFarmerMediaSchema.optional(),
    expectedRevision: z.number().int().nonnegative().optional(),
    idempotencyKey: z.uuid(),
  })
  .strict()
  .superRefine((value, context) => {
    const keys = new Set(value.claims.map((claim) => claim.claimKey));
    if (keys.size !== value.claims.length) {
      context.addIssue({
        code: "custom",
        path: ["claims"],
        message: "Claim keys must be unique.",
      });
    }
    for (const [index, section] of value.sections.entries()) {
      if (section.claimKeys.some((key) => !keys.has(key))) {
        context.addIssue({
          code: "custom",
          path: ["sections", index, "claimKeys"],
          message: "Every story reference must point to a supplied claim.",
        });
      }
    }
  });

export const confirmFeaturedFarmerSocialSchema = z
  .object({
    researchId: z.uuid(),
    sourceId: z.uuid(),
    platform: z.enum(featuredFarmerSocialPlatforms),
    ownershipBasis: safeProfileResearchText(10, 500),
    displayOrder: z.number().int().min(0).max(20).default(0),
    idempotencyKey: z.uuid(),
  })
  .strict();

export const removeFeaturedFarmerSocialSchema = z
  .object({
    researchId: z.uuid(),
    platform: z.enum(featuredFarmerSocialPlatforms),
    expectedRevision: z.number().int().nonnegative(),
    idempotencyKey: z.uuid(),
  })
  .strict();

export const publishFeaturedFarmerSchema = z
  .object({
    researchId: z.uuid(),
    expectedRevision: z.number().int().nonnegative(),
    factCheckedAt: z.iso.datetime(),
    idempotencyKey: z.uuid(),
  })
  .strict();

export const withdrawFeaturedFarmerSchema = z
  .object({
    researchId: z.uuid(),
    reason: safeProfileResearchText(10, 500),
    expectedRevision: z.number().int().nonnegative(),
    idempotencyKey: z.uuid(),
  })
  .strict();

export type FeaturedFarmerResearchHints = z.infer<
  typeof featuredFarmerResearchHintsSchema
>;
export type FeaturedFarmerClaim = z.infer<typeof featuredFarmerClaimSchema>;
export type FeaturedFarmerStorySection = z.infer<
  typeof featuredFarmerStorySectionSchema
>;
export type FeaturedFarmerSourceQuality =
  (typeof featuredFarmerSourceQualities)[number];
export type FeaturedFarmerSourceAssociation =
  (typeof featuredFarmerSourceAssociations)[number];
export type FeaturedFarmerSocialPlatform =
  (typeof featuredFarmerSocialPlatforms)[number];
