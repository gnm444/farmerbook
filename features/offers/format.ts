import { formatCurrency, type InterpolationValues, type MessageName, type SupportedLocale } from "@/lib/i18n";
import type { OfferPrice } from "./types";

export type OfferTranslator = (name: MessageName<"offers">, values?: InterpolationValues) => string;

export function formatOfferPrice(price: OfferPrice, locale: SupportedLocale, t: OfferTranslator) {
  const money = (value: number) => formatCurrency(value, locale, "INR", { maximumFractionDigits: Number.isInteger(value) ? 0 : 2 });
  if (price.model === "quote") return t("priceOnRequest");
  if (price.model === "free") return t("free");
  if (price.model === "range") {
    return t("priceRange", { minimum: money(price.minimum), maximum: money(price.maximum), unit: price.unit });
  }
  return t(price.model === "subsidized" ? "subsidized" : "priceFixed", { price: money(price.amount), unit: price.unit });
}
