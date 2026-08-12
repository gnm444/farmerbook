import { z } from "zod";
import { SUPPORTED_LOCALES } from "@/lib/i18n/locales";
import {
  organizationIdSchema,
  organizationServiceAreaSchema,
} from "@/features/organizations/schemas";
import { OFFER_KINDS, OFFER_PRICE_MODELS, OFFER_PRICE_UNITS } from "./types";

const unique = <T>(values: T[]) => new Set(values).size === values.length;
const MAX_VALIDITY_DAYS = 1_826;

function currentIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(start: string, end: string) {
  return (
    (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) /
    86_400_000
  );
}

export const offerIdSchema = z.uuid();
export const offerKindSchema = z.enum(OFFER_KINDS);
export const offerPriceModelSchema = z.enum(OFFER_PRICE_MODELS);
export const offerPriceUnitSchema = z.enum(OFFER_PRICE_UNITS);
export const offerLocaleSchema = z.enum(SUPPORTED_LOCALES);

export const offerCategorySlugSchema = z
  .string()
  .trim()
  .min(2)
  .max(96)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Choose a canonical category.");

const offerBaseShape = {
  organizationId: organizationIdSchema,
  kind: offerKindSchema,
  contentLocale: offerLocaleSchema,
  title: z.string().trim().min(5).max(120),
  description: z.string().trim().min(20).max(2_000),
  terms: z.string().trim().max(2_000).default(""),
  categorySlugs: z
    .array(offerCategorySlugSchema)
    .min(1, "Choose at least one offer category.")
    .max(12)
    .refine(unique, "Choose each offer category once."),
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
  validFrom: z.iso.date(),
  validUntil: z.iso.date(),
  publicationIntent: z.enum(["draft", "submit"]),
} as const;

const pricedAmount = z.coerce.number().positive().max(1_000_000_000);

const fixedOfferSchema = z.strictObject({
  ...offerBaseShape,
  priceModel: z.literal("fixed"),
  currency: z.literal("INR"),
  priceMin: pricedAmount,
  priceMax: z.undefined().optional(),
  priceUnit: offerPriceUnitSchema,
});

const rangeOfferSchema = z.strictObject({
  ...offerBaseShape,
  priceModel: z.literal("range"),
  currency: z.literal("INR"),
  priceMin: pricedAmount,
  priceMax: pricedAmount,
  priceUnit: offerPriceUnitSchema,
});

const quoteOfferSchema = z.strictObject({
  ...offerBaseShape,
  priceModel: z.literal("quote"),
  currency: z.null().optional(),
  priceMin: z.null().optional(),
  priceMax: z.null().optional(),
  priceUnit: z.null().optional(),
});

const freeOfferSchema = z.strictObject({
  ...offerBaseShape,
  priceModel: z.literal("free"),
  currency: z.null().optional(),
  priceMin: z.null().optional(),
  priceMax: z.null().optional(),
  priceUnit: z.null().optional(),
});

const subsidizedOfferSchema = z.strictObject({
  ...offerBaseShape,
  priceModel: z.literal("subsidized"),
  currency: z.literal("INR"),
  priceMin: pricedAmount,
  priceMax: z.undefined().optional(),
  priceUnit: offerPriceUnitSchema,
});

export const createOfferSchema = z
  .discriminatedUnion("priceModel", [
    fixedOfferSchema,
    rangeOfferSchema,
    quoteOfferSchema,
    freeOfferSchema,
    subsidizedOfferSchema,
  ])
  .superRefine((offer, context) => {
    if (offer.validUntil < offer.validFrom) {
      context.addIssue({
        code: "custom",
        path: ["validUntil"],
        message: "The end date must be on or after the start date.",
      });
    }
    if (offer.validUntil < currentIsoDate()) {
      context.addIssue({
        code: "custom",
        path: ["validUntil"],
        message: "The offer cannot expire in the past.",
      });
    }
    if (daysBetween(offer.validFrom, offer.validUntil) > MAX_VALIDITY_DAYS) {
      context.addIssue({
        code: "custom",
        path: ["validUntil"],
        message: "Offer validity cannot exceed five years.",
      });
    }
    if (offer.priceModel === "range" && offer.priceMax < offer.priceMin) {
      context.addIssue({
        code: "custom",
        path: ["priceMax"],
        message: "The maximum price must be at least the minimum price.",
      });
    }
  });

export const updateOfferSchema = z.intersection(
  createOfferSchema,
  z.object({
    offerId: offerIdSchema,
    expectedUpdatedAt: z.iso.datetime({ offset: true }),
  }),
);

export const offerPublicationSchema = z.object({
  offerId: offerIdSchema,
  publicationState: z.enum(["draft", "published", "paused", "archived"]),
  expectedUpdatedAt: z.iso.datetime({ offset: true }),
});

export const offerEnquirySchema = z
  .object({
    offerId: offerIdSchema,
    message: z.string().trim().min(20).max(1_200),
    quantityNeeded: z.string().trim().min(2).max(120).optional(),
    needBy: z.iso.date().optional(),
    idempotencyKey: z.uuid(),
  })
  .superRefine((enquiry, context) => {
    if (!enquiry.needBy) return;
    const today = currentIsoDate();
    if (
      enquiry.needBy < today ||
      daysBetween(today, enquiry.needBy) > MAX_VALIDITY_DAYS
    ) {
      context.addIssue({
        code: "custom",
        path: ["needBy"],
        message: "Choose a need-by date within the next five years.",
      });
    }
  });

const HIGH_RISK_KINDS = new Set(["finance", "insurance"]);
const HIGH_RISK_CATEGORIES = new Set([
  "finance-credit-payments",
  "insurance-risk-services",
  "crop-protection-biologicals",
  "veterinary-animal-health",
  "certification-traceability",
]);

export function requiresOfferModerationReview(input: {
  kind: string;
  categorySlugs: readonly string[];
}) {
  return (
    HIGH_RISK_KINDS.has(input.kind) ||
    input.categorySlugs.some((slug) => HIGH_RISK_CATEGORIES.has(slug))
  );
}

export type CreateOfferInput = z.infer<typeof createOfferSchema>;
export type UpdateOfferInput = z.infer<typeof updateOfferSchema>;
