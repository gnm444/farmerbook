import { describe, expect, it } from "vitest";
import { workshopPrivacyCopy } from "@/features/workshops/workshop-privacy";

describe("workshop data notice", () => {
  it("states the use, fixed removal date and early-request path in each workshop language", () => {
    for (const locale of ["en-IN", "te-IN", "hi-IN"]) {
      const result = workshopPrivacyCopy(locale);
      expect(result.locale).toBe(locale);
      expect(result.copy.privacy).toMatch(/2026/u);
      expect(result.copy.privacy).toMatch(/2027/u);
      expect(result.copy.request).toContain("ceo@farmerbook.in");
      expect(result.copy.deletion).toContain("ceo@farmerbook.in");
    }
  });

  it("labels the fallback notice as English", () => {
    expect(workshopPrivacyCopy("ur-IN").locale).toBe("en-IN");
  });
});
