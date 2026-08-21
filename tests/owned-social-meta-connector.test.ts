import { describe, expect, it, vi } from "vitest";
import { createOwnedSocialConnector } from "@/workers/owned-social-connector/index";

const input = {
  attemptId: "1484d0df-2f67-4f56-a09f-594509b91a8a",
  providerIdempotencyKey: `owned-social:facebook:${"a".repeat(64)}`,
  channel: "facebook",
  text: "A careful FarmerBook article about farm records and trust.",
  canonicalUrl:
    "https://farmerbook.in/blog/clear-farm-records?utm_source=facebook",
};

const env = {
  CONNECTOR_RELEASE_ENABLED: "true",
  META_GRAPH_API_VERSION: "v99.0",
  META_PAGE_ID: "1234567890",
  META_PAGE_ACCESS_TOKEN: "t".repeat(80),
};

function request(body: unknown = input) {
  return new Request("https://owned-social-connector.internal/v1/publish", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("isolated Meta owned-social connector", () => {
  it("fails closed before a Page token and release are configured", async () => {
    const providerFetch = vi.fn<typeof fetch>();
    const response = await createOwnedSocialConnector(providerFetch)
      .fetch(request(), { ...env, CONNECTOR_RELEASE_ENABLED: "false" });
    expect(await response.json()).toEqual({
      code: "FAILED",
      failureCode: "META_CONNECTOR_NOT_READY",
    });
    expect(providerFetch).not.toHaveBeenCalled();
  });

  it("posts once and verifies the exact Page object before reporting success", async () => {
    const providerFetch = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ id: "1234567890_999" }))
      .mockResolvedValueOnce(Response.json({
        id: "1234567890_999",
        message: input.text,
        permalink_url: "https://www.facebook.com/1234567890/posts/999",
      }));
    const response = await createOwnedSocialConnector(providerFetch)
      .fetch(request(), env);
    expect(await response.json()).toEqual({
      code: "VERIFIED",
      providerReceiptId: "1234567890_999",
    });
    expect(providerFetch).toHaveBeenCalledTimes(2);
    expect(providerFetch.mock.calls[0]?.[0].toString()).toContain(
      "/v99.0/1234567890/feed",
    );
    expect(providerFetch.mock.calls[1]?.[0].toString()).toContain(
      "/v99.0/1234567890_999?fields=id%2Cmessage%2Cpermalink_url",
    );
  });

  it("returns unknown and never repeats an ambiguous create", async () => {
    const providerFetch = vi.fn<typeof fetch>().mockRejectedValue(
      new Error("synthetic timeout"),
    );
    const response = await createOwnedSocialConnector(providerFetch)
      .fetch(request(), env);
    expect(await response.json()).toEqual({
      code: "UNKNOWN",
      failureCode: "META_CREATE_OUTCOME_UNKNOWN",
    });
    expect(providerFetch).toHaveBeenCalledTimes(1);
  });

  it("keeps Instagram closed until rights-cleared media is available", async () => {
    const providerFetch = vi.fn<typeof fetch>();
    const response = await createOwnedSocialConnector(providerFetch)
      .fetch(request({ ...input, channel: "instagram" }), env);
    expect(await response.json()).toEqual({
      code: "FAILED",
      failureCode: "RIGHTS_CLEARED_MEDIA_REQUIRED",
    });
    expect(providerFetch).not.toHaveBeenCalled();
  });
});
