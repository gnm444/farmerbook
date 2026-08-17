import type { MetadataRoute } from "next";
import { loadFeaturedFarmerPublications } from "@/features/featured-farmers/queries";
import { getSiteUrl } from "@/lib/env";
import { isFeatureEnabled } from "@/lib/feature-flags";

const publicPaths = [
  "",
  "/marketplace",
  "/login",
  "/signup",
  "/community-rules",
  "/privacy",
  "/terms",
  "/license",
  "/data-deletion",
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = getSiteUrl();
  const featuredPublications = await loadFeaturedFarmerPublications();
  const paths: readonly string[] = [
    ...publicPaths,
    ...(isFeatureEnabled("ENABLE_AGRI_BUSINESSES") ? ["/companies"] : []),
    ...(isFeatureEnabled("ENABLE_OUTREACH_AGENT") ? ["/join"] : []),
    "/featured-farmers",
  ];
  return [
    ...paths.map((path) => ({
      url: new URL(path || "/", origin).toString(),
      changeFrequency: path === "/marketplace" ? ("daily" as const) : ("monthly" as const),
      priority:
        path === ""
          ? 1
          : path === "/marketplace"
            ? 0.9
            : path === "/featured-farmers"
              ? 0.7
              : 0.5,
    })),
    ...featuredPublications.map((publication) => ({
      url: new URL(
        `/featured-farmers/${publication.slug}`,
        origin,
      ).toString(),
      lastModified: new Date(publication.fact_checked_at),
      changeFrequency: "yearly" as const,
      priority: 0.8,
    })),
  ];
}
