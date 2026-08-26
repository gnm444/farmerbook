import { describe, expect, it } from "vitest";
import {
  assessFeaturedFarmerReadiness,
  canonicalPublisherHost,
  validateOwnedSocialSource,
} from "@/features/featured-farmers/source-policy";

const claims = [
  {
    claimKey: "impact_one",
    claimType: "impact" as const,
    statement: "A documented farming impact supported by the selected evidence.",
    sourceIds: ["11111111-1111-4111-8111-111111111111"],
  },
  {
    claimKey: "innovation_two",
    claimType: "innovation" as const,
    statement: "A documented innovation supported by another selected source.",
    sourceIds: ["22222222-2222-4222-8222-222222222222"],
  },
];

const sources = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    sourceUrl: "https://icar.gov.in/example",
    sourceType: "website",
    publisherHost: "icar.gov.in",
    sourceQuality: "official_record" as const,
    subjectAssociation: "professional_reference" as const,
    decision: "selected" as const,
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    sourceUrl: "https://news.example/story",
    sourceType: "website",
    publisherHost: "news.example",
    sourceQuality: "independent_reporting" as const,
    subjectAssociation: "professional_reference" as const,
    decision: "selected" as const,
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    sourceUrl: "https://www.youtube.com/@asha-example",
    sourceType: "youtube",
    publisherHost: "youtube.com",
    sourceQuality: "owned_social_profile" as const,
    subjectAssociation: "owned_social_profile" as const,
    decision: "selected" as const,
  },
];

describe("featured Farmer source policy", () => {
  it("normalizes publisher hosts", () => {
    expect(canonicalPublisherHost("https://www.ICAR.gov.in/story")).toBe("icar.gov.in");
  });

  it("accepts account pages but rejects YouTube videos as owned profiles", () => {
    expect(validateOwnedSocialSource({
      sourceUrl: "https://www.youtube.com/@asha-example",
      sourceType: "youtube",
      sourceQuality: "owned_social_profile",
      subjectAssociation: "owned_social_profile",
    })).toBe(true);
    expect(validateOwnedSocialSource({
      sourceUrl: "https://www.youtube.com/watch?v=example",
      sourceType: "youtube",
      sourceQuality: "owned_social_profile",
      subjectAssociation: "owned_social_profile",
    })).toBe(false);
  });

  it("requires source diversity, citations, story sections, and an owned social account", () => {
    const ready = assessFeaturedFarmerReadiness({
      sources,
      claims,
      socialLinks: [{
        sourceId: sources[2]!.id,
        platform: "youtube",
        profileUrl: sources[2]!.sourceUrl,
      }],
      sectionCount: 3,
      media: null,
    });
    expect(ready).toMatchObject({
      ready: true,
      professionalDomainCount: 2,
      citedClaimCount: 2,
      ownedSocialCount: 1,
    });

    expect(assessFeaturedFarmerReadiness({
      sources: sources.slice(0, 1),
      claims,
      socialLinks: [],
      sectionCount: 2,
      media: { rightsApproved: false },
    }).blockers).toHaveLength(5);
  });

  it("makes only professional-source blockers optional", () => {
    const youtubeSources = [
      {
        id: "11111111-1111-4111-8111-111111111111",
        sourceUrl: "https://www.youtube.com/watch?v=one",
        sourceType: "youtube",
        publisherHost: "youtube.com",
        sourceQuality: "first_party" as const,
        subjectAssociation: "professional_reference" as const,
        decision: "selected" as const,
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        sourceUrl: "https://www.youtube.com/watch?v=two",
        sourceType: "youtube",
        publisherHost: "youtube.com",
        sourceQuality: "third_party_coverage" as const,
        subjectAssociation: "third_party_coverage" as const,
        decision: "selected" as const,
      },
      {
        id: "33333333-3333-4333-8333-333333333333",
        sourceUrl: "https://www.youtube.com/@asha-example",
        sourceType: "youtube",
        publisherHost: "youtube.com",
        sourceQuality: "owned_social_profile" as const,
        subjectAssociation: "owned_social_profile" as const,
        decision: "selected" as const,
      },
    ];
    const socialLinks = [{
      sourceId: youtubeSources[2]!.id,
      platform: "youtube",
      profileUrl: youtubeSources[2]!.sourceUrl,
    }];

    expect(assessFeaturedFarmerReadiness({
      sources: youtubeSources,
      claims,
      socialLinks,
      sectionCount: 3,
      media: null,
      requireProfessionalSources: false,
    })).toMatchObject({
      ready: true,
      blockers: [],
      professionalDomainCount: 0,
      authoritativeSourceCount: 0,
      citedClaimCount: 2,
      ownedSocialCount: 1,
    });

    expect(assessFeaturedFarmerReadiness({
      sources: youtubeSources,
      claims,
      socialLinks,
      sectionCount: 3,
      media: null,
      requireProfessionalSources: true,
    }).blockers).toEqual([
      "Add selected professional sources from at least two publisher domains.",
      "Add an official, institutional, or independent source.",
    ]);

    expect(assessFeaturedFarmerReadiness({
      sources: youtubeSources,
      claims: claims.slice(0, 1),
      socialLinks: [],
      sectionCount: 2,
      media: { rightsApproved: false },
      requireProfessionalSources: false,
    }).blockers).toEqual([
      "Add at least two claims cited only to selected sources.",
      "Confirm at least one Farmer-owned social account.",
      "Write at least three cited story sections.",
      "Approve image rights or remove the image.",
    ]);
  });
});
