import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  const origin = getSiteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/marketplace", "/profile/", "/store/", "/companies", "/join"],
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
