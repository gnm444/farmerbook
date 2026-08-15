import { describe, expect, it } from "vitest";
import { GET as health } from "@/app/api/health/route";
import manifest from "@/app/manifest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { isPublicPath } from "@/proxy";

describe("platform metadata and health routes", () => {
  it("returns a minimal non-cached health response", async () => {
    const response = health();
    await expect(response.json()).resolves.toEqual({ status: "ok" });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("keeps private and demo routes out of indexing", () => {
    const route = robots();
    const rules = Array.isArray(route.rules) ? route.rules : [route.rules];
    const disallowed = rules.flatMap((rule) => rule.disallow ?? []);
    expect(disallowed).toContain("/admin/");
    expect(disallowed).toContain("/messages/");
    expect(disallowed).toContain("/marketplace/demo");
  });

  it("publishes only stable public pages and an installable manifest", async () => {
    const urls = (await sitemap()).map((entry) => new URL(entry.url).pathname);
    expect(urls).toContain("/");
    expect(urls).toContain("/marketplace");
    expect(urls).toContain("/featured-farmers");
    expect(urls).toContain("/featured-farmers/narayana-reddy");
    expect(urls).not.toContain("/marketplace/demo");
    expect(manifest()).toMatchObject({
      name: "FarmerBook",
      start_url: "/",
      display: "standalone",
    });
  });

  it("keeps search metadata routes public", () => {
    expect(isPublicPath("/robots.txt")).toBe(true);
    expect(isPublicPath("/sitemap.xml")).toBe(true);
    expect(isPublicPath("/manifest.webmanifest")).toBe(true);
  });
});
