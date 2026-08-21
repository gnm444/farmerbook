import type {
  OwnedSocialChannel,
  VerifiedArticleEnvelope,
} from "./contracts";

const HASH_TAGS = "#FarmerBook #OrganicFarming #NaturalFarming";

export function buildOwnedSocialPost(
  channel: OwnedSocialChannel,
  article: VerifiedArticleEnvelope,
) {
  const link = new URL(article.canonicalUrl);
  link.searchParams.set("utm_source", channel);
  link.searchParams.set("utm_medium", "owned_social");
  link.searchParams.set("utm_campaign", article.campaignCode);
  const text = [
    article.title,
    article.excerpt,
    `Read on FarmerBook: ${link.toString()}`,
    HASH_TAGS,
  ].join("\n\n");
  if (text.length > 2_000) throw new Error("OWNED_SOCIAL_COPY_TOO_LONG");
  return { text, canonicalUrl: link.toString() };
}
