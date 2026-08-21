import { describe, expect, it } from "vitest";
import {
  AUTONOMOUS_DAILY_PUBLICATION_LIMIT,
  AUTONOMOUS_MONTHLY_PUBLICATION_LIMIT,
  AUTONOMOUS_PUBLICATION_POLICY_VERSION,
  blogPublicationFingerprint,
  evaluateAutonomousPublication,
} from "@/features/blog/autonomous-publication-policy";
import { blogPublicationSchema } from "@/features/blog/contracts";
import {
  AUTONOMOUS_EDITORIAL_TOPICS,
  DAILY_EDITORIAL_TOPICS,
  selectDailyAutonomousBrief,
} from "@/features/blog/daily-editorial";

const brief = AUTONOMOUS_EDITORIAL_TOPICS[0]!;
const safeParagraph = [
  "Clear records help farmers and consumers discuss observations with care.",
  "A simple note can identify the product, the handoff, and the question being discussed.",
  "Each person can compare the note with the actual order and ask for clarification.",
  "This supports a respectful conversation while leaving uncertain matters clearly marked.",
].join(" ");

function eligiblePublication() {
  return blogPublicationSchema.parse({
    slug: `${brief.key}-2026-08-21-abcdef12`,
    category: brief.category,
    author: "FarmerBook Blog Writing Agent",
    publishedAt: "2026-08-21T03:30:00.000Z",
    updatedAt: "2026-08-21T03:30:00.000Z",
    readingMinutes: 5,
    editorialNote:
      "Prepared and released by FarmerBook's bounded standing publication policy.",
    sources: brief.sources.map(({ title, publisher, url }) => ({
      title,
      publisher,
      url,
    })),
    english: {
      title: "Clear records for stronger farmer and consumer conversations",
      excerpt:
        "A practical way to keep direct farm conversations clear, respectful, and evidence based.",
      dek:
        "Small records can make expectations visible without replacing careful questions or appropriate professional support.",
      sections: Array.from({ length: 4 }, (_, index) => ({
        heading: ["Start with the object", "Record the handoff", "Mark uncertainty", "Ask the next question"][index],
        paragraphs: [Array.from({ length: 4 }, () => safeParagraph).join(" ")],
        bullets: [],
      })),
      conclusion:
        "A modest record supports a clearer conversation and gives both sides a shared place to begin.",
      safetyNote:
        "Take high impact questions to the relevant Agriculture Department, authority, laboratory, or qualified professional.",
    },
  });
}

function decide(publication: unknown, overrides: Partial<Parameters<typeof evaluateAutonomousPublication>[0]> = {}) {
  return evaluateAutonomousPublication({
    publication,
    brief,
    runKey: "2026-08-21",
    sourceManifestFresh: true,
    dailyPublishedCount: 0,
    monthlyPublishedCount: 0,
    ...overrides,
  });
}

describe("autonomous Blog publication standing policy", () => {
  it("selects only reviewed low-risk briefs", () => {
    expect(AUTONOMOUS_PUBLICATION_POLICY_VERSION).toContain("standing-policy");
    expect(AUTONOMOUS_EDITORIAL_TOPICS.length).toBeGreaterThan(0);
    expect(AUTONOMOUS_EDITORIAL_TOPICS.length).toBeLessThan(DAILY_EDITORIAL_TOPICS.length);
    expect(AUTONOMOUS_EDITORIAL_TOPICS.every((item) => item.riskClass === "low"))
      .toBe(true);
    expect(selectDailyAutonomousBrief("2026-08-21").riskClass).toBe("low");
  });

  it("accepts only exact source-bounded, long-form low-risk content", () => {
    expect(decide(eligiblePublication())).toEqual({
      eligible: true,
      code: "AUTO_ELIGIBLE",
    });
  });

  it("fails claims, personal data, stale sources, source drift and higher risk closed", () => {
    const unsafeClaim = eligiblePublication();
    unsafeClaim.english.conclusion = "This method guarantees a premium for every farmer.";
    expect(decide(unsafeClaim).code).toBe("CLAIM_POLICY_FAILED");

    const personalData = eligiblePublication();
    personalData.english.conclusion = "Contact farmer@example.com for details about this record.";
    expect(decide(personalData).code).toBe("PERSONAL_DATA_FAILED");

    expect(decide(eligiblePublication(), { sourceManifestFresh: false }).code)
      .toBe("SOURCE_MANIFEST_STALE");

    const wrongSource = eligiblePublication();
    wrongSource.sources[0] = { ...wrongSource.sources[0]!, title: "Different source" };
    expect(decide(wrongSource).code).toBe("SOURCE_SCOPE_MISMATCH");

    const mediumBrief = DAILY_EDITORIAL_TOPICS.find((item) => item.riskClass === "medium")!;
    expect(decide(eligiblePublication(), { brief: mediumBrief }).code)
      .toBe("RISK_NOT_ELIGIBLE");
  });

  it("enforces one publication per day and thirty-one per month", () => {
    expect(decide(eligiblePublication(), {
      dailyPublishedCount: AUTONOMOUS_DAILY_PUBLICATION_LIMIT,
    }).code).toBe("DAILY_LIMIT_REACHED");
    expect(decide(eligiblePublication(), {
      monthlyPublishedCount: AUTONOMOUS_MONTHLY_PUBLICATION_LIMIT,
    }).code).toBe("MONTHLY_LIMIT_REACHED");
  });

  it("creates a deterministic exact-publication fingerprint", async () => {
    const publication = eligiblePublication();
    const first = await blogPublicationFingerprint(publication);
    expect(first).toMatch(/^[0-9a-f]{64}$/);
    expect(await blogPublicationFingerprint({ ...publication })).toBe(first);
  });
});
