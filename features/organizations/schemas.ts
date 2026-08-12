import { z } from "zod";
import { agricultureCompanySectorBySlug } from "@/lib/agriculture/company-sectors";
import { ORGANIZATION_TYPES } from "./types";

const unique = <T>(values: T[]) => new Set(values).size === values.length;

export const organizationIdSchema = z.uuid();

export const organizationSlugSchema = z
  .string()
  .trim()
  .min(3, "Use at least 3 characters for the company address.")
  .max(80, "Inc address must be 80 characters or fewer.")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use lowercase letters, numbers and single hyphens only.",
  );

export const organizationTypeSchema = z.enum(ORGANIZATION_TYPES);

export const organizationSectorSlugSchema = z
  .string()
  .trim()
  .max(96)
  .refine(
    (value) => Boolean(agricultureCompanySectorBySlug(value)),
    "Choose a supported agriculture company sector.",
  );

export const organizationServiceAreaSchema = z.object({
  state: z.string().trim().min(2).max(80),
  district: z.string().trim().min(2).max(80).optional(),
  serviceRadiusKm: z.coerce.number().int().positive().max(2_000).optional(),
});

const optionalHttpsUrlSchema = z
  .union([
    z.literal(""),
    z
      .url("Enter a valid website URL.")
      .max(300)
      .refine((value) => value.startsWith("https://"), "Use an HTTPS website URL."),
  ])
  .transform((value) => value || undefined)
  .optional();

export const organizationProfileSchema = z.object({
  slug: organizationSlugSchema,
  displayName: z.string().trim().min(2).max(120),
  organizationType: organizationTypeSchema,
  description: z.string().trim().min(20).max(1_500),
  state: z.string().trim().min(2).max(80),
  district: z
    .union([z.literal(""), z.string().trim().min(2).max(80)])
    .transform((value) => value || undefined)
    .optional(),
  websiteUrl: optionalHttpsUrlSchema,
  sectorSlugs: z
    .array(organizationSectorSlugSchema)
    .min(1, "Choose at least one company sector.")
    .max(12)
    .refine(unique, "Choose each company sector once."),
  serviceAreas: z
    .array(organizationServiceAreaSchema)
    .min(1, "Add at least one service area.")
    .max(50)
    .refine(
      (areas) =>
        unique(
          areas.map(
            (area) =>
              `${area.state.toLocaleLowerCase("en-IN")}|${area.district?.toLocaleLowerCase("en-IN") ?? ""}`,
          ),
        ),
      "Add each state and district service area once.",
    ),
});

export const createOrganizationSchema = organizationProfileSchema;

export const updateOrganizationSchema = organizationProfileSchema.extend({
  organizationId: organizationIdSchema,
  expectedUpdatedAt: z.iso.datetime({ offset: true }),
});

export const organizationPublicationSchema = z.object({
  organizationId: organizationIdSchema,
  publicationState: z.enum(["published", "unpublished"]),
  expectedUpdatedAt: z.iso.datetime({ offset: true }),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
export type OrganizationPublicationInput = z.infer<
  typeof organizationPublicationSchema
>;
