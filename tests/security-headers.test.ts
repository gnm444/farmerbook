import { describe, expect, it } from "vitest";
import {
  contentSecurityPolicy,
  withSecurityHeaders,
} from "@/lib/security-headers";

describe("production response security headers", () => {
  it("builds a narrow CSP for Supabase and Cloudflare Turnstile", () => {
    const policy = contentSecurityPolicy("https://project.supabase.co/path");
    expect(policy).toContain("default-src 'self'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("https://project.supabase.co");
    expect(policy).toContain("wss://project.supabase.co");
    expect(policy).toContain("https://challenges.cloudflare.com");
    expect(policy).toContain("img-src 'self' data: blob: https://i.ytimg.com");
    expect(policy).not.toContain("https://project.supabase.co/path");
  });

  it("sets HSTS only for HTTPS responses and preserves response data", async () => {
    const httpsResponse = withSecurityHeaders(
      new Request("https://farmerbook.example/marketplace"),
      new Response("available", { status: 202, headers: { "x-existing": "yes" } }),
    );
    expect(httpsResponse.status).toBe(202);
    await expect(httpsResponse.text()).resolves.toBe("available");
    expect(httpsResponse.headers.get("x-existing")).toBe("yes");
    expect(httpsResponse.headers.get("strict-transport-security")).toContain(
      "max-age=31536000",
    );
    expect(httpsResponse.headers.get("x-content-type-options")).toBe("nosniff");
    expect(httpsResponse.headers.get("x-frame-options")).toBe("DENY");

    const localResponse = withSecurityHeaders(
      new Request("http://localhost:3000"),
      new Response("local"),
    );
    expect(localResponse.headers.has("strict-transport-security")).toBe(false);
    expect(localResponse.headers.get("content-security-policy")).not.toContain(
      "upgrade-insecure-requests",
    );
  });
});
