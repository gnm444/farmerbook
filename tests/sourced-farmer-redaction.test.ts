import { describe, expect, it } from "vitest";
import {
  CONTACT_REDACTION_MARKER,
  containsContactInformation,
  redactContactInformation,
} from "@/features/sourced-farmers/redaction";

describe("sourced Farmer contact redaction", () => {
  it("destroys emails, phones, handles, messaging links, and direct-contact URLs", () => {
    const source = [
      "Email Grower.Name+field@example.invalid or grower [at] example [dot] org.",
      "Call +91 98765 43210, 09876543210, or +1 (415) 555-2671.",
      "WhatsApp https://wa.me/919876543210 and tel:+919812345678.",
      "Instagram @fictional_grower https://instagram.com/fictional_grower.",
      "More context https://example.org/agriculture/report remains attributable.",
    ].join("\n");
    const redacted = redactContactInformation(source);
    expect(redacted).toContain(CONTACT_REDACTION_MARKER);
    expect(redacted).toContain("https://example.org/agriculture/report");
    expect(redacted).not.toContain("Grower.Name");
    expect(redacted).not.toContain("98765");
    expect(redacted).not.toContain("fictional_grower");
    expect(redacted).not.toContain("wa.me");
    expect(containsContactInformation(redacted)).toBe(false);
  });

  it("does not erase ordinary farming quantities, dates, acres, years, or yields", () => {
    const source =
      "17 acres, 20 years, 40 quintals per acre, 15 papaya plants, published 2026-08-14.";
    expect(redactContactInformation(source)).toBe(source);
    expect(containsContactInformation(source)).toBe(false);
  });

  it("handles Telugu contact labels and Unicode handles", () => {
    const redacted = redactContactInformation(
      "వాట్సాప్ +91-98765-43210 సంప్రదించడానికి @రైతుమిత్ర",
    );
    expect(redacted).not.toContain("98765");
    expect(redacted).not.toContain("రైతుమిత్ర");
    expect(containsContactInformation(redacted)).toBe(false);
  });
});
