import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET as health } from "@/app/api/health/route";
import manifest from "@/app/manifest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import {
  isInternalServicePath,
  isPublicPath,
  proxy,
  requiresUserSession,
} from "@/proxy";

afterEach(() => {
  vi.unstubAllEnvs();
});

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
    expect(urls).toContain("/blog");
    expect(urls).toContain("/blog/calculated-transition-to-natural-farming");
    expect(urls).toContain("/license");
    expect(urls).toContain("/eco-products");
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
    expect(isPublicPath("/license")).toBe(true);
    expect(isPublicPath("/eco-products")).toBe(true);
  });

  it("matches public subtrees without exposing prefix-confusable routes", () => {
    expect(isPublicPath("/api/outreach/provider/events")).toBe(true);
    expect(isPublicPath("/api/outreach-admin")).toBe(false);
    expect(isPublicPath("/profile/farmer-one")).toBe(true);
    expect(isPublicPath("/profile-export")).toBe(false);
  });

  it("bypasses browser sessions only for the exact bearer-protected processor", async () => {
    expect(isInternalServicePath("/api/managed-agents/run")).toBe(true);
    expect(isInternalServicePath("/api/managed-agents/run/extra")).toBe(false);
    expect(requiresUserSession("/api/managed-agents/run")).toBe(false);
    expect(requiresUserSession("/api/managed-agents/run/extra")).toBe(true);

    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "false");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    const internalResponse = await proxy(new NextRequest(
      "http://localhost:3000/api/managed-agents/run",
    ));
    const neighboringResponse = await proxy(new NextRequest(
      "http://localhost:3000/api/managed-agents/run/extra",
    ));

    expect(internalResponse.status).toBe(200);
    expect(neighboringResponse.status).toBe(307);
    expect(neighboringResponse.headers.get("location")).toContain("/login");
  });
});
