import type { SupportedLocale } from "@/lib/i18n/locales";
import type {
  OrganizationActionErrorCode,
  OrganizationServiceArea,
  OrganizationSummary,
} from "@/features/organizations/types";

export const OFFER_KINDS = [
  "product",
  "service",
  "rental",
  "promotion",
  "finance",
  "insurance",
  "advisory",
  "training",
  "support",
] as const;

export type OfferKind = (typeof OFFER_KINDS)[number];

export const offerKindLabels: Record<OfferKind, string> = {
  product: "Product",
  service: "Service",
  rental: "Rental or custom hiring",
  promotion: "Promotion",
  finance: "Finance",
  insurance: "Insurance",
  advisory: "Advisory",
  training: "Training",
  support: "Support programme",
};

export const OFFER_PRICE_MODELS = [
  "fixed",
  "range",
  "quote",
  "free",
  "subsidized",
] as const;

export type OfferPriceModel = (typeof OFFER_PRICE_MODELS)[number];

export const OFFER_PRICE_UNITS = [
  "each",
  "piece",
  "set",
  "kg",
  "litre",
  "tray",
  "dozen",
  "hour",
  "day",
  "month",
  "acre",
  "hectare",
  "service",
] as const;

export type OfferPriceUnit = (typeof OFFER_PRICE_UNITS)[number];

export type OfferPrice =
  | {
      model: "fixed" | "subsidized";
      currency: "INR";
      amount: number;
      unit: OfferPriceUnit;
    }
  | {
      model: "range";
      currency: "INR";
      minimum: number;
      maximum: number;
      unit: OfferPriceUnit;
    }
  | { model: "quote" }
  | { model: "free" };

export type OfferPublicationState =
  | "draft"
  | "published"
  | "paused"
  | "archived";
export type OfferModerationState =
  | "not_required"
  | "pending"
  | "approved"
  | "rejected";
export type OfferAvailabilityState = "scheduled" | "active" | "expired";

export type BusinessOffer = {
  id: string;
  organizationId: string;
  kind: OfferKind;
  contentLocale: SupportedLocale;
  title: string;
  description: string;
  terms: string;
  categorySlugs: string[];
  serviceAreas: OrganizationServiceArea[];
  validFrom: string;
  validUntil: string;
  price: OfferPrice;
  publicationState: OfferPublicationState;
  moderationState: OfferModerationState;
  requiresModerationReview: boolean;
  availabilityState: OfferAvailabilityState;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  organization?: OrganizationSummary;
};

export type OfferActionResult<T> =
  | {
      ok: true;
      code: "CREATED" | "UPDATED" | "PUBLICATION_UPDATED" | "CONNECTED";
      data: T;
    }
  | {
      ok: false;
      code: OrganizationActionErrorCode;
      message: string;
      fieldErrors?: Readonly<Record<string, readonly string[]>>;
    };
