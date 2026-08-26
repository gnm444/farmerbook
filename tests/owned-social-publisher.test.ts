import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ownedSocialConnectorResponseSchema,
  verifiedArticleEnvelopeSchema,
  type VerifiedArticleEnvelope,
} from "@/features/social-publisher/contracts";
import { buildOwnedSocialPost } from "@/features/social-publisher/copy";
import { selectStaticPublicationForSyndication } from "@/features/social-publisher/static-syndication";
import { rightsClearedSocialMediaFor } from "@/features/social-publisher/media-registry";
import { wealthHealthParadoxPublication } from "@/features/blog/publications/wealth-health-paradox";
import { moneyCharacterPublication } from "@/features/blog/publications/money-character";

const article: VerifiedArticleEnvelope = {
  slug: "clear-farm-records",
  title: "Clear farm records for direct relationships",
  excerpt: "A bounded excerpt about careful records and respectful questions.",
  canonicalUrl: "https://farmerbook.in/blog/clear-farm-records",
  contentSha256: "a".repeat(64),
  runKey: "2026-08-21",
  locale: "en-IN",
  campaignCode: "daily_blog_20260821",
};

describe("FarmerBook owned-social publisher", () => {
  const agent = readFileSync("features/social-publisher/agent.ts", "utf8");
  const verifier = readFileSync(
    "features/blog/publication-verifier-agent.ts",
    "utf8",
  );
  const vite = readFileSync("vite.config.ts", "utf8");
  const worker = readFileSync("worker/index.ts", "utf8");

  it("accepts only a verified FarmerBook article envelope", () => {
    expect(verifiedArticleEnvelopeSchema.safeParse(article).success).toBe(true);
    expect(verifiedArticleEnvelopeSchema.safeParse({
      ...article,
      canonicalUrl: "https://example.com/blog/clear-farm-records",
    }).success).toBe(false);
  });

  it("derives deterministic copy and aggregate attribution", () => {
    const first = buildOwnedSocialPost("facebook", article);
    const second = buildOwnedSocialPost("facebook", article);
    expect(first).toEqual(second);
    expect(first.text).toContain(article.title);
    expect(first.text).toContain("utm_source=facebook");
    expect(first.text).toContain("utm_medium=owned_social");
    expect(first.text).toContain("#FarmerBook");
    expect(first.text.length).toBeLessThanOrEqual(2_000);
  });

  it("requires a provider receipt before claiming verification", () => {
    expect(ownedSocialConnectorResponseSchema.safeParse({
      code: "VERIFIED",
      providerReceiptId: "page-post-id",
    }).success).toBe(true);
    expect(ownedSocialConnectorResponseSchema.safeParse({
      code: "VERIFIED",
    }).success).toBe(false);
    expect(ownedSocialConnectorResponseSchema.safeParse({
      code: "UNKNOWN",
      failureCode: "PROVIDER_OUTCOME_UNKNOWN",
    }).success).toBe(true);
  });

  it("is separately bound, default-paused, quota-capped and no-blind-retry", () => {
    expect(vite).toContain('name: "OWNED_SOCIAL_PUBLISHER_AGENT"');
    expect(vite).toContain('tag: "owned-social-publisher-agent-v1"');
    expect(worker).toContain('export { OwnedSocialPublisherAgent }');
    expect(agent).toContain("facebook: true, instagram: true");
    expect(agent).toContain("DAILY_CHANNEL_LIMIT = 1");
    expect(agent).toContain("MONTHLY_CHANNEL_LIMIT = 31");
    expect(agent).toContain("CONNECTOR_OUTCOME_UNKNOWN");
    expect(agent).toContain("PROVIDER_FAILURES_REQUIRING_PAUSE");
    expect(agent).not.toContain("this.retry(");
    expect(verifier).toContain("enqueueVerifiedArticle");
    expect(worker).toContain("scanStaticPublications");
    expect(vite).toContain('crons: ["*/15 * * * *"]');
  });

  it("selects only the newest recently updated static editorial", () => {
    expect(selectStaticPublicationForSyndication(
      [moneyCharacterPublication, wealthHealthParadoxPublication],
      new Date("2026-08-23T05:00:00.000Z"),
    )?.slug).toBe(wealthHealthParadoxPublication.slug);
    expect(selectStaticPublicationForSyndication(
      [wealthHealthParadoxPublication],
      new Date("2026-08-27T05:00:00.000Z"),
    )).toBeNull();
  });

  it("keeps Instagram closed without rights-cleared media", () => {
    expect(agent).toContain("RIGHTS_CLEARED_MEDIA_REQUIRED");
    expect(agent).toContain("STATIC_SYNDICATION_CONTENT_MISMATCH");
    expect(agent).toContain("STATIC_SYNDICATION_MEDIA_MISMATCH");
    expect(agent).not.toContain("directMessages");
    expect(agent).not.toContain("friend");
    expect(agent).not.toContain("group");
  });

  it("registers only the reviewed editorial image for Instagram", () => {
    expect(rightsClearedSocialMediaFor(wealthHealthParadoxPublication)).toEqual({
      path: "/images/blog/wealth-health-paradox-editorial.jpg",
      provenance: "ai_generated",
      sha256: "9abf0c5fdcef6271ac93a9ce59f09a152a4d8245e5cdfda590895c1b45b81d21",
    });
    expect(rightsClearedSocialMediaFor(moneyCharacterPublication)).toBeNull();
  });

  it("allows one confirmed-failure retry only after operator resume", () => {
    expect(agent).toContain("CONFIRMED_FAILURES_RETRYABLE_AFTER_OPERATOR_RESUME");
    expect(agent).toContain("retryConfirmedFailureOnce");
    expect(agent).toContain("owned_social_attempt_history");
    expect(agent).toContain("existing?.state === \"failed\"");
    expect(agent).toContain("state IN ('prepared', 'verified', 'unknown')");
    expect(agent).toContain("providerFailureRequiresPause");
    expect(agent).toContain("confirmedFailureCanRetry");
    expect(agent).not.toContain("this.retry(");
  });
});
