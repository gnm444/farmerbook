import { describe, expect, it, vi } from "vitest";
import {
  buildManagedFarmerProfileSample,
  deterministicProfileSample,
  PROFILE_SAMPLE_PROMPT_VERSION,
} from "@/features/profile-agent/profile-builder";
import { managedProfileAgentInputSchema } from "@/features/profile-agent/schemas";

const input = managedProfileAgentInputSchema.parse({
  sampleId: "00000000-0000-4000-8000-000000000201",
  prospectId: "00000000-0000-4000-8000-000000000202",
  subjectName: "Anita Patil",
  preferredLocale: "mr-IN",
  evidence: [
    {
      sourceUrl: "https://www.linkedin.com/in/anita-patil",
      sourceType: "linkedin",
      sourceTitle: "Anita Patil",
      sourceText:
        "Anita Patil is a farmer in Maharashtra working with grapes and natural farming.",
      sourceHash: "a".repeat(64),
      collectedAt: "2026-08-11T00:00:00.000Z",
      subjectAssociation: "owned_social_profile",
    },
  ],
});

describe("managed Farmer profile agent", () => {
  it("builds a private, cited, explicitly unverified fallback", () => {
    const result = deterministicProfileSample(input);
    expect(result.sample.fullName).toBe("Anita Patil");
    expect(result.sample.state).toBe("Maharashtra");
    expect(result.sample.categorySlugs).toContain("grapes");
    expect(result.sample.socialLinks.linkedin).toBe(
      "https://www.linkedin.com/in/anita-patil",
    );
    expect(result.sample.claims[0].sourceUrl).toBe(input.evidence[0].sourceUrl);
    expect(result.sample.limitations.join(" ")).toMatch(/पडताळलेले नाही/i);
    expect(result.sample.headline).toContain("शेतकरी");
    expect(result.run.promptVersion).toBe(PROFILE_SAMPLE_PROMPT_VERSION);
  });

  it("rejects non-HTTPS research sources", () => {
    expect(() =>
      managedProfileAgentInputSchema.parse({
        ...input,
        evidence: [
          { ...input.evidence[0], sourceUrl: "http://example.com/farmer" },
        ],
      }),
    ).toThrow(/HTTPS/i);
  });

  it("keeps third-party social coverage as evidence instead of an owned link", () => {
    const result = deterministicProfileSample({
      ...input,
      evidence: [
        {
          ...input.evidence[0],
          subjectAssociation: "third_party_coverage",
        },
      ],
    });
    expect(result.sample.socialLinks.linkedin).toBeUndefined();
    expect(result.sample.claims[0].sourceUrl).toBe(input.evidence[0].sourceUrl);
  });

  it("retains a professional website without calling it an owned social profile", () => {
    const result = deterministicProfileSample({
      ...input,
      evidence: [{
        ...input.evidence[0],
        sourceUrl: "https://anitafarms.example/about",
        sourceType: "website",
        subjectAssociation: "professional_reference",
      }],
    });
    expect(result.sample.socialLinks.website).toBe(
      "https://anitafarms.example/about",
    );
  });

  it("fails closed to a deterministic sample when AI invents a citation", async () => {
    const ai = {
      run: vi.fn().mockResolvedValue({
        response: JSON.stringify({
          fullName: "Anita Patil",
          headline: "Grape farmer",
          bio: "Farmer profile draft supported by supplied evidence.",
          categorySlugs: ["grapes"],
          socialLinks: {},
          claims: [
            {
              field: "fullName",
              value: "Anita Patil",
              sourceUrl: "https://invented.example/profile",
              excerpt: "Invented evidence",
              confidence: 0.9,
            },
          ],
          limitations: ["Identity remains unverified."],
        }),
      }),
    };
    const result = await buildManagedFarmerProfileSample(input, ai);
    expect(result.run.status).toBe("fallback");
    expect(result.run.failureCode).toBe("AI_OUTPUT_INVALID");
    expect(result.sample.claims[0].sourceUrl).toBe(input.evidence[0].sourceUrl);
  });
});
