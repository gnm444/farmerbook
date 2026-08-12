import { z } from "zod";
import { SUPPORTED_LOCALES } from "@/lib/i18n";
import { agricultureCategoryBySlug } from "@/lib/agriculture/categories";
import {
  INC_SOURCING_CADENCES,
  INC_SOURCING_CLAIM_TYPES,
  INC_SOURCING_UNITS,
} from "./types";

const today = () => new Date().toISOString().slice(0, 10);
const unique = <T>(values: T[]) => new Set(values).size === values.length;
const amount = z.coerce.number().positive().max(1_000_000_000);
const unit = z.enum(INC_SOURCING_UNITS);
const optionalText = (maximum: number) =>
  z.union([z.literal(""), z.string().trim().max(maximum)]).default("");

const base = {
  organizationId: z.uuid(),
  contentLocale: z.enum(SUPPORTED_LOCALES),
  productName: z.string().trim().min(2).max(120),
  varietyOrGrade: optionalText(160),
  qualityRequirements: optionalText(1_200),
  quantityMin: amount,
  quantityMax: z.union([z.literal(""), amount]).transform((value) => value === "" ? undefined : value).optional(),
  quantityUnit: unit,
  cadence: z.enum(INC_SOURCING_CADENCES),
  deliveryMode: z.enum(["collect", "deliver", "either"]),
  destinationState: z.string().trim().min(2).max(80),
  destinationDistrict: z.union([z.literal(""), z.string().trim().min(2).max(80)]).transform((value) => value || undefined).optional(),
  opensOn: z.iso.date(),
  closesOn: z.iso.date(),
  needBy: z.iso.date(),
  paymentTerms: optionalText(1_000),
  requiredLicenceScope: z.union([z.literal(""), z.string().trim().max(120).regex(/^[A-Za-z0-9 ._/-]+$/)]).default(""),
  categorySlugs: z.array(z.string().trim()).min(1).max(12).refine(unique).refine(
    (slugs) => slugs.every((slug) => {
      const category = agricultureCategoryBySlug(slug);
      return Boolean(category?.selectable);
    }),
    "Choose supported farming categories.",
  ),
  publicationIntent: z.enum(["draft", "submit"]),
} as const;

const quote = z.strictObject({
  ...base,
  priceModel: z.literal("quote"),
  currency: z.null().optional(),
  priceMin: z.null().optional(),
  priceMax: z.null().optional(),
  priceUnit: z.null().optional(),
});
const target = z.strictObject({
  ...base,
  priceModel: z.literal("target"),
  currency: z.literal("INR"),
  priceMin: amount,
  priceMax: z.null().optional(),
  priceUnit: unit,
});
const range = z.strictObject({
  ...base,
  priceModel: z.literal("range"),
  currency: z.literal("INR"),
  priceMin: amount,
  priceMax: amount,
  priceUnit: unit,
});

export const createIncSourcingRequestSchema = z
  .discriminatedUnion("priceModel", [quote, target, range])
  .superRefine((value, context) => {
    if (value.quantityMax != null && value.quantityMax < value.quantityMin) {
      context.addIssue({ code: "custom", path: ["quantityMax"], message: "Maximum quantity must be at least the minimum." });
    }
    if (value.closesOn < value.opensOn || value.needBy < value.opensOn) {
      context.addIssue({ code: "custom", path: ["closesOn"], message: "Choose a valid sourcing window." });
    }
    if (value.closesOn < today()) {
      context.addIssue({ code: "custom", path: ["closesOn"], message: "The sourcing request cannot close in the past." });
    }
    if (value.priceModel === "range" && value.priceMax < value.priceMin) {
      context.addIssue({ code: "custom", path: ["priceMax"], message: "Maximum price must be at least the minimum." });
    }
  });

export const incSourcingPublicationSchema = z.object({
  sourcingRequestId: z.uuid(),
  publicationState: z.enum(["published", "paused", "closed", "archived"]),
  expectedUpdatedAt: z.iso.datetime({ offset: true }),
});

export const incSourcingResponseSchema = z.object({
  sourcingRequestId: z.uuid(),
  message: z.string().trim().min(20).max(2_000),
  quantityAvailable: z.union([z.literal(""), amount]).transform((value) => value === "" ? undefined : value).optional(),
  quantityUnit: z.union([z.literal(""), unit]).transform((value) => value || undefined).optional(),
  availableFrom: z.union([z.literal(""), z.iso.date()]).transform((value) => value || undefined).optional(),
  indicativePrice: z.union([z.literal(""), amount]).transform((value) => value === "" ? undefined : value).optional(),
  priceUnit: z.union([z.literal(""), unit]).transform((value) => value || undefined).optional(),
  idempotencyKey: z.uuid(),
}).superRefine((value, context) => {
  if ((value.quantityAvailable == null) !== (value.quantityUnit == null)) {
    context.addIssue({ code: "custom", path: ["quantityUnit"], message: "Add both quantity and unit." });
  }
  if ((value.indicativePrice == null) !== (value.priceUnit == null)) {
    context.addIssue({ code: "custom", path: ["priceUnit"], message: "Add both indicative price and unit." });
  }
});

export const incVerificationSubmissionSchema = z.object({
  organizationId: z.uuid(),
  requestedClaimTypes: z.array(z.enum(INC_SOURCING_CLAIM_TYPES)).min(2).max(7).refine(unique),
  officialDomain: z.union([z.literal(""), z.string().trim().toLowerCase().regex(/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/)]).transform((value) => value || undefined).optional(),
  applicantNote: z.string().trim().max(1_000),
});

export type CreateIncSourcingRequestInput = z.infer<typeof createIncSourcingRequestSchema>;
