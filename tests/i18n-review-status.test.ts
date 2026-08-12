import { describe, expect, it } from "vitest";
import {
  SUPPORTED_LOCALES,
  isLocaleNativeReviewed,
  isNativeReviewComplete,
  localeNeedsNativeReview,
  localeReviewLabel,
  localeReviewRegistry,
  reviewStatusForLocale,
  type LocaleReviewRecord,
} from "@/lib/i18n";

describe("locale catalog review status", () => {
  it("tracks every supported locale exactly", () => {
    expect(Object.keys(localeReviewRegistry)).toEqual(SUPPORTED_LOCALES);
    expect(localeReviewRegistry["en-IN"]).toEqual({
      status: "source",
      reviewer: null,
      reviewedAt: null,
      catalogHash: null,
    });

    for (const locale of SUPPORTED_LOCALES.slice(1)) {
      expect(localeReviewRegistry[locale]).toEqual({
        status: "needs_native_review",
        reviewer: null,
        reviewedAt: null,
        catalogHash: null,
      });
    }
  });

  it("marks unreviewed translations as beta, never reviewed", () => {
    expect(localeReviewLabel("en-IN")).toBeNull();
    expect(localeNeedsNativeReview("en-IN")).toBe(false);
    expect(isLocaleNativeReviewed("en-IN")).toBe(false);
    expect(localeReviewLabel("hi")).toBe("beta");
    expect(localeReviewLabel("ur-IN")).toBe("beta");
    expect(localeNeedsNativeReview("ta")).toBe(true);
    expect(isLocaleNativeReviewed("ta")).toBe(false);
  });

  it("requires complete review evidence before returning reviewed", () => {
    const incomplete: LocaleReviewRecord = {
      status: "native_reviewed",
      reviewer: "Language reviewer",
      reviewedAt: "2026-08-09",
      catalogHash: null,
    };
    const complete: LocaleReviewRecord = {
      ...incomplete,
      catalogHash: "sha256:catalog-digest",
    };

    expect(isNativeReviewComplete(incomplete)).toBe(false);
    expect(isNativeReviewComplete(complete)).toBe(true);
  });

  it("does not coerce unsupported input into a review status", () => {
    expect(reviewStatusForLocale("fr-FR")).toBeNull();
    expect(localeReviewLabel("fr-FR")).toBeNull();
    expect(localeNeedsNativeReview("fr-FR")).toBe(false);
    expect(isLocaleNativeReviewed("fr-FR")).toBe(false);
  });
});
