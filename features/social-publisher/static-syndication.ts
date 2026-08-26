import type { BlogPublication } from "@/features/blog/contracts";

export const STATIC_SYNDICATION_MAX_AGE_HOURS = 72;

export function selectStaticPublicationForSyndication(
  publications: readonly BlogPublication[],
  now: Date,
) {
  const nowTime = now.getTime();
  const oldestEligibleTime = nowTime
    - STATIC_SYNDICATION_MAX_AGE_HOURS * 60 * 60 * 1_000;
  return publications
    .filter((publication) => {
      const publishedAt = Date.parse(publication.publishedAt);
      const updatedAt = Date.parse(publication.updatedAt);
      return Number.isFinite(publishedAt)
        && Number.isFinite(updatedAt)
        && publishedAt <= nowTime
        && updatedAt <= nowTime
        && updatedAt >= oldestEligibleTime;
    })
    .sort((left, right) =>
      Date.parse(right.updatedAt) - Date.parse(left.updatedAt))[0] ?? null;
}
