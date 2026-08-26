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
      ],
      disallow: [
        "/admin/",
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
      ],
    },
    sitemap: new URL("/sitemap.xml", origin).toString(),
  };
}
