import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/env";
import { isFeatureEnabled } from "@/lib/feature-flags";

export default function robots(): MetadataRoute.Robots {
  const origin = getSiteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: [
        "/",
        "/marketplace",
        "/featured-farmers/",
        "/profile/",
        "/store/",
        "/companies",
        "/join",
        "/partner-interest",
        ...(isFeatureEnabled("ENABLE_FARM_VISITS") ? ["/farm-visits"] : []),
        ...(isFeatureEnabled("ENABLE_HARI_BABU_WORKSHOP")
          ? ["/workshops/hari-babu-2026"] : []),
      ],
      disallow: [
        "/admin/",
        "/api/admin/",
        "/business/",
        "/company/",
        "/discover/",
        "/feed/",
        "/market/",
        "/messages/",
        "/network/",
        "/onboarding/",
        "/purchases/",
        "/settings/",
        "/marketplace/demo",
        "/chat",
      ],
    },
    sitemap: new URL("/sitemap.xml", origin).toString(),
  };
}
