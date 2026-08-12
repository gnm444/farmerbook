import { describe, expect, it } from "vitest";
import {
  formatCurrency,
  formatDate,
  formatList,
  formatNumber,
  formatRelativeTime,
} from "@/lib/i18n";

describe("locale-aware formatting", () => {
  it("uses Indian number grouping and INR currency", () => {
    expect(formatNumber(1_234_567.89, "en-IN")).toBe("12,34,567.89");
    const currency = formatCurrency(1234, "en-IN");
    expect(currency).toContain("₹");
    expect(currency).toContain("1,234");
  });

  it("formats dates in the requested locale with a stable India timezone", () => {
    expect(formatDate("2026-08-09T00:00:00.000Z", "en-IN")).toBe("9 Aug 2026");
    expect(formatDate("2026-08-09T00:00:00.000Z", "hi-IN")).not.toBe(
      formatDate("2026-08-09T00:00:00.000Z", "en-IN"),
    );
    expect(
      formatDate("2026-08-09T00:00:00.000Z", "en-IN", { year: "numeric" }),
    ).toBe("2026");
    expect(() => formatDate("not-a-date", "en-IN")).toThrow(RangeError);
  });

  it("formats relative time for past and future values", () => {
    const now = new Date("2026-08-09T12:00:00.000Z");
    expect(
      formatRelativeTime("2026-08-08T12:00:00.000Z", "en-IN", { now }),
    ).toBe("yesterday");
    expect(
      formatRelativeTime("2026-08-09T14:00:00.000Z", "en-IN", { now }),
    ).toBe("in 2 hours");
  });

  it("formats conjunction lists and safely falls back for unsupported locales", () => {
    expect(formatList(["बीज", "औज़ार"], "hi-IN")).toContain("और");
    expect(formatNumber(1000, "fr-FR")).toBe("1,000");
  });
});
