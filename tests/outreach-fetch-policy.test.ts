import { describe, expect, it, vi } from "vitest";
import {
  fetchPublicBusinessSource,
  SourceFetchError,
} from "@/features/outreach/fetch-source";
import {
  normalizeOutreachUrl,
  validateWebsiteUrl,
} from "@/features/outreach/url-policy";

describe("bounded outreach website fetch", () => {
  it("normalizes tracking parameters and blocks private or unsafe destinations", () => {
    expect(
      normalizeOutreachUrl("https://Farm.Example/path?utm_source=x&b=2&a=1#bio"),
    ).toBe("https://farm.example/path?a=1&b=2");
    for (const url of [
      "https://127.0.0.1/contact",
      "https://10.2.3.4/contact",
      "https://169.254.169.254/latest/meta-data",
      "https://[::1]/contact",
      "https://[::ffff:127.0.0.1]/contact",
      "https://localhost/contact",
      "https://user:pass@example.com/contact",
      "https://example.com:8443/contact",
    ]) {
      expect(validateWebsiteUrl(url, { production: true }).ok).toBe(false);
    }
    expect(validateWebsiteUrl("http://farm.example", { production: true }).ok).toBe(false);
    expect(validateWebsiteUrl("https://farm.example", { production: true }).ok).toBe(true);
  });

  it("follows at most same-origin redirects and one same-origin contact page", async () => {
    const fetcher = vi.fn(async (input: URL | RequestInfo) => {
      const url = String(input);
      if (url === "https://farm.example/") {
        return new Response(
          '<html><title>Green Farm</title><p>Millet grower</p><a href="/contact">Contact us</a></html>',
          { headers: { "content-type": "text/html" } },
        );
      }
      return new Response("For business enquiries: info@farm.example", {
        headers: { "content-type": "text/plain" },
      });
    });
    const result = await fetchPublicBusinessSource("https://farm.example", {
      fetcher: fetcher as typeof fetch,
      production: true,
    });
    expect(result).toMatchObject({ title: "Green Farm", pagesFetched: 2 });
    expect(result.text).toContain("info@farm.example");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("blocks cross-origin redirects and oversized bodies", async () => {
    const redirect = vi.fn(async () =>
      new Response(null, { status: 302, headers: { location: "https://other.example" } }),
    );
    await expect(
      fetchPublicBusinessSource("https://farm.example", {
        fetcher: redirect as typeof fetch,
        production: true,
      }),
    ).rejects.toMatchObject({ code: "BLOCKED_SOURCE" } satisfies Partial<SourceFetchError>);

    const oversized = vi.fn(async () =>
      new Response("x", {
        headers: { "content-type": "text/plain", "content-length": "300001" },
      }),
    );
    await expect(
      fetchPublicBusinessSource("https://farm.example", {
        fetcher: oversized as typeof fetch,
        production: true,
      }),
    ).rejects.toMatchObject({ code: "CONTENT_TOO_LARGE" } satisfies Partial<SourceFetchError>);
  });
});
