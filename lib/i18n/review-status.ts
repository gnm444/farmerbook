import {
  SUPPORTED_LOCALES,
  normalizeLocale,
  type SupportedLocale,
} from "./locales";

export type LocaleReviewStatus =
  | "source"
  | "needs_native_review"
  | "native_reviewed";

export type LocaleReviewRecord = Readonly<{
  status: LocaleReviewStatus;
  reviewer: string | null;
  reviewedAt: string | null;
  catalogHash: string | null;
}>;

export type LocaleReviewLabel = "beta" | "reviewed" | null;

const source = Object.freeze({
  status: "source",
  reviewer: null,
  reviewedAt: null,
  catalogHash: null,
} as const satisfies LocaleReviewRecord);

const needsNativeReview = Object.freeze({
  status: "needs_native_review",
  reviewer: null,
  reviewedAt: null,
  catalogHash: null,
} as const satisfies LocaleReviewRecord);

export const localeReviewRegistry = Object.freeze({
  "en-IN": source,
  "as-IN": needsNativeReview,
  "bn-IN": needsNativeReview,
  "brx-IN": needsNativeReview,
  "doi-IN": needsNativeReview,
  "gu-IN": needsNativeReview,
  "hi-IN": needsNativeReview,
  "kn-IN": needsNativeReview,
  "ks-Arab-IN": needsNativeReview,
  "kok-Deva-IN": needsNativeReview,
  "mai-IN": needsNativeReview,
  "ml-IN": needsNativeReview,
  "mni-Mtei-IN": needsNativeReview,
  "mr-IN": needsNativeReview,
  "ne-IN": needsNativeReview,
  "or-IN": needsNativeReview,
  "pa-Guru-IN": needsNativeReview,
  "sa-IN": needsNativeReview,
  "sat-Olck-IN": needsNativeReview,
  "sd-Arab-IN": needsNativeReview,
  "ta-IN": needsNativeReview,
  "te-IN": needsNativeReview,
  "ur-IN": needsNativeReview,
} satisfies Record<SupportedLocale, LocaleReviewRecord>);

if (Object.keys(localeReviewRegistry).length !== SUPPORTED_LOCALES.length) {
  throw new Error(
    "Locale review registry is out of sync with supported locales.",
  );
}

export function reviewStatusForLocale(
  value: unknown,
): LocaleReviewRecord | null {
  const locale = normalizeLocale(value);
  return locale ? localeReviewRegistry[locale] : null;
}

export function isNativeReviewComplete(record: LocaleReviewRecord): boolean {
  return (
    record.status === "native_reviewed" &&
    Boolean(record.reviewer?.trim()) &&
    Boolean(record.reviewedAt?.trim()) &&
    Boolean(record.catalogHash?.trim())
  );
}

export function isLocaleNativeReviewed(value: unknown): boolean {
  const record = reviewStatusForLocale(value);
  return record ? isNativeReviewComplete(record) : false;
}

export function localeNeedsNativeReview(value: unknown): boolean {
  const record = reviewStatusForLocale(value);
  return Boolean(
    record && !isNativeReviewComplete(record) && record.status !== "source",
  );
}

export function localeReviewLabel(value: unknown): LocaleReviewLabel {
  const record = reviewStatusForLocale(value);
  if (!record || record.status === "source") return null;
  return isNativeReviewComplete(record) ? "reviewed" : "beta";
}
