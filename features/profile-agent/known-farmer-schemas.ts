import { z } from "zod";
import { SUPPORTED_LOCALES } from "@/lib/i18n/locales";
import {
  profileResearchSourceUrl,
  safeProfileResearchText,
} from "./schemas";

export const knownFarmerRelationshipBases = [
  "founder_known",
  "team_known",
  "in_person_meeting",
  "trusted_partner_referral",
] as const;

export const knownFarmerSubjectAssociations = [
  "owned_social_profile",
  "third_party_coverage",
  "professional_reference",
] as const;

export const knownFarmerDiscoveryMethods = [
  "manual_google_review",
  "youtube_data_api",
  "operator_supplied",
] as const;

export const knownFarmerHintsSchema = z
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
  })
  .strict();

export const createKnownFarmerIntakeSchema = knownFarmerHintsSchema
  .extend({
    preferredLocale: z.enum(SUPPORTED_LOCALES),
    relationshipBasis: z.enum(knownFarmerRelationshipBases),
    relationshipConfirmed: z.literal(true),
    idempotencyKey: z.uuid(),
  })
  .strict();

export const knownFarmerIntakeIdSchema = z
  .object({
    intakeId: z.uuid(),
    idempotencyKey: z.uuid(),
  })
  .strict();

export const addKnownFarmerSourceSchema = z
  .object({
    intakeId: z.uuid(),
    sourceUrl: profileResearchSourceUrl,
    description: safeProfileResearchText(2, 8_000).optional(),
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
    sourcePermissionConfirmed: z.literal(true),
    idempotencyKey: z.uuid(),
  })
  .strict();

export const decideKnownFarmerCandidateSchema = z
  .object({
    intakeId: z.uuid(),
    candidateId: z.uuid(),
    decision: z.enum(["selected", "rejected"]),
    subjectAssociation: z.enum(knownFarmerSubjectAssociations),
    expectedRevision: z.number().int().nonnegative(),
    idempotencyKey: z.uuid(),
  })
  .strict();

export const buildKnownFarmerProfileSchema = knownFarmerIntakeIdSchema;

export const youtubeSearchListResponseSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            id: z
              .object({
                kind: z.string(),
                channelId: z.string().optional(),
                videoId: z.string().optional(),
              })
              .passthrough(),
            snippet: z
              .object({
                title: z.string(),
                description: z.string(),
                channelId: z.string().optional(),
                channelTitle: z.string().optional(),
              })
              .passthrough(),
          })
          .passthrough(),
      )
      .default([]),
  })
  .passthrough();

export type KnownFarmerHints = z.infer<typeof knownFarmerHintsSchema>;
export type KnownFarmerSubjectAssociation =
  (typeof knownFarmerSubjectAssociations)[number];
