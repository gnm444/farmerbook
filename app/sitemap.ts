import type { MetadataRoute } from "next";
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
  "/data-deletion",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = getSiteUrl();
  const paths: readonly string[] = [
    ...publicPaths,
    ...(isFeatureEnabled("ENABLE_AGRI_BUSINESSES") ? ["/companies"] : []),
    ...(isFeatureEnabled("ENABLE_OUTREACH_AGENT") ? ["/join"] : []),
  ];
  return paths.map((path) => ({
    url: new URL(path || "/", origin).toString(),
    changeFrequency: path === "/marketplace" ? "daily" : "monthly",
    priority: path === "" ? 1 : path === "/marketplace" ? 0.9 : 0.5,
  }));
}
