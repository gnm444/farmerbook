import type {
  FeaturedFarmerClaim,
  FeaturedFarmerStorySection,
} from "./schemas";

export function validateStoryClaimReferences(
  sections: FeaturedFarmerStorySection[],
  claims: FeaturedFarmerClaim[],
) {
  const keys = new Set(claims.map((claim) => claim.claimKey));
  return sections.every(
    (section) =>
      section.claimKeys.length > 0 &&
      section.claimKeys.every((key) => keys.has(key)),
  );
}

export function buildConservativeStorySections(
  claims: FeaturedFarmerClaim[],
): FeaturedFarmerStorySection[] {
  const ordered = claims.slice(0, 6);
  if (ordered.length < 2) return [];
  const first = ordered[0];
  const second = ordered[1];
  const remaining = ordered.slice(2);
  return [
    {
      kind: "work",
      heading: "The work",
      body: `${first.statement} This section is limited to the reviewed claim and its linked sources.`,
      claimKeys: [first.claimKey],
    },
    {
      kind: "impact",
      heading: "Documented impact",
      body: `${second.statement} The evidence is listed with the story so readers can review the original source.`,
      claimKeys: [second.claimKey],
    },
    {
      kind: "lessons",
      heading: "What other farmers can examine",
      body: remaining.length
        ? `${remaining.map((claim) => claim.statement).join(" ")} These points are presented as sourced experience, not guaranteed advice.`
        : `${first.statement} Readers should examine the cited context before applying this experience to another farm.`,
      claimKeys: (remaining.length ? remaining : [first]).map((claim) => claim.claimKey),
    },
  ];
}
