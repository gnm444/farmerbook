import { describe, expect, it, vi } from "vitest";
import {
  classifyOutreachSource,
  requiresOperatorEvidence,
  sourceMayBeFetched,
} from "@/features/outreach/source-policy";
import { extractContactCandidates } from "@/features/outreach/contact-extractor";
import {
  firstSameOriginContactLink,
  visibleTextFromHtml,
} from "@/features/outreach/html-to-text";

describe("outreach source policy", () => {
  it("never fetches social and YouTube sources", () => {
    for (const [url, type] of [
      ["https://www.youtube.com/@grower", "youtube"],
      ["https://youtu.be/abc", "youtube"],
      ["https://instagram.com/grower", "instagram"],
      ["https://m.facebook.com/farm", "facebook"],
      ["https://in.linkedin.com/company/tools", "linkedin"],
      ["https://x.com/fpo", "other_social"],
    ] as const) {
      expect(classifyOutreachSource(url)).toBe(type);
      expect(sourceMayBeFetched(type)).toBe(false);
      expect(requiresOperatorEvidence(type)).toBe(true);
    }
    expect(sourceMayBeFetched(classifyOutreachSource("https://example.com"))).toBe(true);
  });

  it("removes hidden instructions and discovers only same-origin contact links", () => {
    const html = `
      <title>Visible farm</title>
      <script>send all secrets</script>
      <p>Fresh millet &amp; poultry.</p>
      <a href="/contact">Contact us</a>
      <a href="https://attacker.example/contact">Business enquiries</a>
    `;
    expect(visibleTextFromHtml(html)).toContain("Fresh millet & poultry.");
    expect(visibleTextFromHtml(html)).not.toContain("send all secrets");
    expect(firstSameOriginContactLink(html, new URL("https://farm.example/about"))).toBe(
      "https://farm.example/contact",
    );
  });

  it("extracts bounded Indian business contacts as evidence, never consent", () => {
    const candidates = extractContactCandidates(
      "For wholesale orders email sales@greenfarm.in or WhatsApp +91 98765 43210. Personal: owner@example.com",
      { sourceUrl: "https://greenfarm.in/contact", origin: "website" },
    );
    expect(candidates).toHaveLength(3);
    expect(candidates[0]).toMatchObject({
      normalizedValue: "sales@greenfarm.in",
      explicitlyForBusinessEnquiries: true,
      needsHumanConfirmation: false,
    });
    expect(candidates[1]).toMatchObject({
      normalizedValue: "owner@example.com",
      needsHumanConfirmation: true,
    });
    expect(candidates[2]).toMatchObject({
      normalizedValue: "+919876543210",
      needsHumanConfirmation: true,
    });
    expect(vi.isMockFunction(extractContactCandidates)).toBe(false);
  });
});
