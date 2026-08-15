import { isSupportedOwnedSocialProfileUrl } from "@/features/profile-agent/social-link-policy";
import type {
  FeaturedFarmerClaim,
  FeaturedFarmerSourceAssociation,
  FeaturedFarmerSourceQuality,
} from "./schemas";

const professionalQualities = new Set<FeaturedFarmerSourceQuality>([
  "official_record",
  "institutional_reference",
  "independent_reporting",
  "first_party",
]);

const authoritativeQualities = new Set<FeaturedFarmerSourceQuality>([
  "official_record",
  "institutional_reference",
  "independent_reporting",
]);

export type FeaturedFarmerReadinessSource = {
  id: string;
  sourceUrl: string;
  sourceType: string;
  publisherHost: string;
  sourceQuality: FeaturedFarmerSourceQuality;
  subjectAssociation: FeaturedFarmerSourceAssociation;
  decision: "pending" | "selected" | "rejected";
};

export type FeaturedFarmerReadinessSocial = {
  sourceId: string;
  platform: string;
  profileUrl: string;
};

export function canonicalPublisherHost(value: string) {
  const hostname = new URL(value).hostname.toLowerCase().replace(/^www\./, "");
  return hostname.replace(/\.$/, "");
}

export function validateOwnedSocialSource(input: {
  sourceUrl: string;
  sourceType: string;
  subjectAssociation: FeaturedFarmerSourceAssociation;
  sourceQuality: FeaturedFarmerSourceQuality;
}) {
  return (
    input.subjectAssociation === "owned_social_profile" &&
    input.sourceQuality === "owned_social_profile" &&
    isSupportedOwnedSocialProfileUrl(input.sourceUrl, input.sourceType)
  );
}

export function assessFeaturedFarmerReadiness(input: {
  sources: FeaturedFarmerReadinessSource[];
  claims: FeaturedFarmerClaim[];
  socialLinks: FeaturedFarmerReadinessSocial[];
  sectionCount: number;
  media?: { rightsApproved: boolean } | null;
}) {
  const selected = input.sources.filter((source) => source.decision === "selected");
  const professionalHosts = new Set(
    selected
      .filter(
        (source) =>
          source.sourceType === "website" &&
          professionalQualities.has(source.sourceQuality),
      )
      .map((source) => source.publisherHost),
  );
  const hasAuthoritative = selected.some((source) =>
    authoritativeQualities.has(source.sourceQuality),
  );
  const selectedIds = new Set(selected.map((source) => source.id));
  const citedClaims = input.claims.filter(
    (claim) =>
      claim.sourceIds.length > 0 &&
      claim.sourceIds.every((sourceId) => selectedIds.has(sourceId)),
  );
  const validSocialLinks = input.socialLinks.filter((social) => {
    const source = selected.find((candidate) => candidate.id === social.sourceId);
    return Boolean(
      source &&
        social.platform === source.sourceType &&
        social.profileUrl === source.sourceUrl &&
        validateOwnedSocialSource({
          sourceUrl: source.sourceUrl,
          sourceType: source.sourceType,
          subjectAssociation: source.subjectAssociation,
          sourceQuality: source.sourceQuality,
        }),
    );
  });
  const blockers: string[] = [];
  if (professionalHosts.size < 2) blockers.push("Add selected professional sources from at least two publisher domains.");
  if (!hasAuthoritative) blockers.push("Add an official, institutional, or independent source.");
  if (citedClaims.length < 2) blockers.push("Add at least two claims cited only to selected sources.");
  if (validSocialLinks.length < 1) blockers.push("Confirm at least one Farmer-owned social account.");
  if (input.sectionCount < 3) blockers.push("Write at least three cited story sections.");
  if (input.media && !input.media.rightsApproved) blockers.push("Approve image rights or remove the image.");
  return {
    ready: blockers.length === 0,
    blockers,
    professionalDomainCount: professionalHosts.size,
    authoritativeSourceCount: selected.filter((source) =>
      authoritativeQualities.has(source.sourceQuality),
    ).length,
    citedClaimCount: citedClaims.length,
    ownedSocialCount: validSocialLinks.length,
  };
}
