const unsafeControlPattern = /[\u0000-\u001f\u007f-\u009f\u200b\u202a-\u202e\u2060\u2066-\u2069\ufeff]/u;
const urlPattern =
  /(?:https?:\/\/|www\.|\b[\p{L}\p{N}-]+\.(?:com|in|org|net|co|io)\b)/iu;
const emailPattern = /\b[^\s@]+@[^\s@]+\.[^\s@]+\b/u;
const phonePattern = /(?:^|[^\p{L}\p{N}])\+?\d[\d\s().-]{6,}\d(?:\s|$)/u;
const handlePattern = /(?:^|\s)@[\p{L}\p{N}_-]{2,}/u;
const advertisingPattern =
  /\b(?:buy\s+now|call\s+now|contact\s+us|best\s+price|limited\s+time|discount|sale|special\s+offer|whats?app|\d+\s*%\s*off)\b/iu;

export type CustomCategoryValidationError =
  | "too_short"
  | "too_long"
  | "unsafe_characters"
  | "contact_information"
  | "advertising_copy";

export type NormalizedCustomCategory = {
  originalLabel: string;
  displayLabel: string;
  normalizedLabel: string;
};

export type CustomCategoryValidationResult =
  | { ok: true; value: NormalizedCustomCategory }
  | { ok: false; error: CustomCategoryValidationError };

function codePointLength(value: string) {
  return [...value].length;
}

export function normalizeCategoryLabel(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/gu, " ");
}

export function categoryLabelKey(value: string) {
  return normalizeCategoryLabel(value).toLocaleLowerCase("en");
}

export function validateCustomCategoryLabel(
  value: string,
  maxLength = 80,
): CustomCategoryValidationResult {
  const originalLabel = value;
  const displayLabel = normalizeCategoryLabel(value);
  const length = codePointLength(displayLabel);

  if (length < 2) return { ok: false, error: "too_short" };
  if (length > maxLength) return { ok: false, error: "too_long" };
  if (unsafeControlPattern.test(originalLabel)) {
    return { ok: false, error: "unsafe_characters" };
  }
  if (
    urlPattern.test(displayLabel) ||
    emailPattern.test(displayLabel) ||
    phonePattern.test(displayLabel) ||
    handlePattern.test(displayLabel)
  ) {
    return { ok: false, error: "contact_information" };
  }
  if (advertisingPattern.test(displayLabel)) {
    return { ok: false, error: "advertising_copy" };
  }

  return {
    ok: true,
    value: {
      originalLabel,
      displayLabel,
      normalizedLabel: categoryLabelKey(displayLabel),
    },
  };
}
