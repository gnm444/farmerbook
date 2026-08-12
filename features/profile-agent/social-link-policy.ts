const supportedSocialTypes = [
  "youtube",
  "instagram",
  "facebook",
  "linkedin",
] as const;

export type SupportedOwnedSocialType = (typeof supportedSocialTypes)[number];

function hostMatches(hostname: string, domain: string) {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

function pathParts(url: URL) {
  return url.pathname.split("/").filter(Boolean);
}

export function isSupportedOwnedSocialProfileUrl(
  sourceUrl: string,
  sourceType: string,
) {
  if (
    !supportedSocialTypes.includes(sourceType as SupportedOwnedSocialType)
  ) {
    return false;
  }

  let url: URL;
  try {
    url = new URL(sourceUrl);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  const hostname = url.hostname.toLowerCase();
  const parts = pathParts(url);
  if (sourceType === "linkedin") {
    return (
      hostMatches(hostname, "linkedin.com") &&
      parts.length === 2 &&
      parts[0]?.toLowerCase() === "in"
    );
  }
  if (sourceType === "instagram") {
    return (
      hostMatches(hostname, "instagram.com") &&
      parts.length === 1 &&
      !["p", "reel", "reels", "stories", "tv"].includes(
        parts[0]?.toLowerCase() ?? "",
      )
    );
  }
  if (sourceType === "facebook") {
    if (!hostMatches(hostname, "facebook.com")) return false;
    if (parts[0]?.toLowerCase() === "profile.php") {
      return Boolean(url.searchParams.get("id"));
    }
    return (
      parts.length === 1 &&
      !["groups", "photo", "photos", "reel", "reels", "story.php", "watch"].includes(
        parts[0]?.toLowerCase() ?? "",
      )
    );
  }
  if (sourceType === "youtube") {
    return (
      hostMatches(hostname, "youtube.com") &&
      ((parts.length === 1 && parts[0]?.startsWith("@")) ||
        (parts.length === 2 && parts[0]?.toLowerCase() === "channel"))
    );
  }
  return false;
}
