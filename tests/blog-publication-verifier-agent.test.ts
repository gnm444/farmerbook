import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { blogPublicationVerificationJobSchema } from "@/features/blog/contracts";

describe("independent Blog publication verifier Agent", () => {
  const verifier = readFileSync(
    "features/blog/publication-verifier-agent.ts",
    "utf8",
  );
  const agent = readFileSync("features/blog/agent.ts", "utf8");
  const story = readFileSync("app/blog/[slug]/page.tsx", "utf8");

  it("uses a bounded content-hash job contract", () => {
    expect(blogPublicationVerificationJobSchema.safeParse({
      draftId: "1484d0df-2f67-4f56-a09f-594509b91a8a",
      slug: "clear-farm-records",
      contentSha256: "a".repeat(64),
      title: "Clear farm records for direct relationships",
      excerpt: "A bounded excerpt about careful records and respectful questions.",
      canonicalUrl: "https://farmerbook.in/blog/clear-farm-records",
      runKey: "2026-08-21",
    }).success).toBe(true);
    expect(blogPublicationVerificationJobSchema.safeParse({
      draftId: "1484d0df-2f67-4f56-a09f-594509b91a8a",
      slug: "clear-farm-records",
      contentSha256: "not-a-hash",
      title: "Clear farm records for direct relationships",
      excerpt: "A bounded excerpt about careful records and respectful questions.",
      canonicalUrl: "https://farmerbook.in/blog/clear-farm-records",
      runKey: "2026-08-21",
    }).success).toBe(false);
  });

  it("verifies a separately rendered public fingerprint after a delay", () => {
    expect(verifier).toContain('this.schedule(\n      90,');
    expect(verifier).toContain('"verifyPublication"');
    expect(verifier).toContain('data-publication-sha256=');
    expect(story).toContain("data-publication-sha256={publicationSha256}");
  });

  it("quarantines mismatches and pauses the writer", () => {
    expect(verifier).toContain("PUBLICATION_ROUTE_CONTENT_MISMATCH");
    expect(agent).toContain('visibility_status = ${input.status === "verified" ? "public" : "quarantined"}');
    expect(agent).toContain('if (input.status === "failed")');
    expect(agent).toContain("cancelEditorialSchedules(null)");
  });
});
