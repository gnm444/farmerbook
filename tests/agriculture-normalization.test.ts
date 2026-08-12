import { describe, expect, it } from "vitest";
import {
  categoryLabelKey,
  normalizeCategoryLabel,
  validateCustomCategoryLabel,
} from "@/lib/agriculture/normalization";

describe("custom agriculture category normalization", () => {
  it("normalizes Unicode compatibility characters and whitespace", () => {
    expect(normalizeCategoryLabel("  Ｔｏｍａｔｏ\n farming  ")).toBe(
      "Tomato farming",
    );
    expect(categoryLabelKey("  Mixed   Farming ")).toBe("mixed farming");
  });

  it("preserves valid Indian-script labels", () => {
    expect(validateCustomCategoryLabel("  मोती पालन  ")).toEqual({
      ok: true,
      value: {
        originalLabel: "  मोती पालन  ",
        displayLabel: "मोती पालन",
        normalizedLabel: "मोती पालन",
      },
    });
    expect(validateCustomCategoryLabel("முத்து வளர்ப்பு").ok).toBe(true);
  });

  it("rejects unsafe controls and embedded contact information", () => {
    expect(validateCustomCategoryLabel("Fish\u202efarm")).toEqual({
      ok: false,
      error: "unsafe_characters",
    });
    expect(validateCustomCategoryLabel("Visit https://example.com")).toEqual({
      ok: false,
      error: "contact_information",
    });
    expect(validateCustomCategoryLabel("Visit example.com")).toEqual({
      ok: false,
      error: "contact_information",
    });
    expect(validateCustomCategoryLabel("farmer@example.com")).toEqual({
      ok: false,
      error: "contact_information",
    });
    expect(validateCustomCategoryLabel("Call +91 98765 43210")).toEqual({
      ok: false,
      error: "contact_information",
    });
    expect(validateCustomCategoryLabel("Call:+919876543210")).toEqual({
      ok: false,
      error: "contact_information",
    });
    expect(validateCustomCategoryLabel("Ask @cheap_seeds")).toEqual({
      ok: false,
      error: "contact_information",
    });
    expect(validateCustomCategoryLabel("BUY NOW special offer")).toEqual({
      ok: false,
      error: "advertising_copy",
    });
  });

  it("bounds labels by Unicode code points", () => {
    expect(validateCustomCategoryLabel("अ")).toEqual({
      ok: false,
      error: "too_short",
    });
    expect(validateCustomCategoryLabel("अ".repeat(81))).toEqual({
      ok: false,
      error: "too_long",
    });
  });
});
