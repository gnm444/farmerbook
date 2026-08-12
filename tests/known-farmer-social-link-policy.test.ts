import { describe, expect, it } from "vitest";
import { isSupportedOwnedSocialProfileUrl } from "@/features/profile-agent/social-link-policy";
import { profileSampleEvidenceSchema } from "@/features/profile-agent/schemas";

describe("Known Farmer owned-social URL policy", () => {
  it.each([
    ["linkedin", "https://www.linkedin.com/in/anita-patil"],
    ["instagram", "https://www.instagram.com/anita_farms/"],
    ["facebook", "https://www.facebook.com/anita.farms"],
    ["facebook", "https://www.facebook.com/profile.php?id=1234"],
    ["youtube", "https://www.youtube.com/@AnitaFarms"],
    ["youtube", "https://www.youtube.com/channel/UC1234"],
  ])("accepts a %s account URL", (sourceType, sourceUrl) => {
    expect(isSupportedOwnedSocialProfileUrl(sourceUrl, sourceType)).toBe(true);
  });

  it.each([
    ["linkedin", "https://www.linkedin.com/posts/anita-patil_farming-123"],
    ["instagram", "https://www.instagram.com/reel/ABC123/"],
    ["facebook", "https://www.facebook.com/watch/1234"],
    ["youtube", "https://www.youtube.com/watch?v=ABC123"],
    ["youtube", "https://youtu.be/ABC123"],
  ])("rejects %s coverage as an owned profile", (sourceType, sourceUrl) => {
    expect(isSupportedOwnedSocialProfileUrl(sourceUrl, sourceType)).toBe(false);
  });

  it("rejects an owned association on a video while retaining it as third-party evidence", () => {
    const evidence = {
      sourceUrl: "https://www.youtube.com/watch?v=ABC123",
      sourceType: "youtube",
      sourceText: "Anita Patil discusses grape farming near Nashik.",
      sourceHash: "a".repeat(64),
      collectedAt: "2026-08-12T00:00:00.000Z",
    } as const;
    expect(
      profileSampleEvidenceSchema.safeParse({
        ...evidence,
        subjectAssociation: "owned_social_profile",
      }).success,
    ).toBe(false);
    expect(
      profileSampleEvidenceSchema.safeParse({
        ...evidence,
        subjectAssociation: "third_party_coverage",
      }).success,
    ).toBe(true);
  });
});
