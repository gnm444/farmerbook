import type { NormalizedYouTubeChannelSeed } from "./types";

const channelIdPattern = /^UC[A-Za-z0-9_-]{8,62}$/u;
const handlePattern = /^[\p{L}\p{M}\p{N}._-]{3,100}$/u;
const allowedHosts = new Set(["youtube.com", "www.youtube.com", "m.youtube.com"]);

function normalizeHandle(value: string): NormalizedYouTubeChannelSeed {
  const handle = value.normalize("NFKC").trim().replace(/^@/u, "");
  if (!handlePattern.test(handle)) throw new Error("INVALID_YOUTUBE_CHANNEL_SEED");
  return { kind: "handle", value: handle };
}

function normalizeChannelId(value: string): NormalizedYouTubeChannelSeed {
  const channelId = value.normalize("NFKC").trim();
  if (!channelIdPattern.test(channelId)) {
    throw new Error("INVALID_YOUTUBE_CHANNEL_SEED");
  }
  return { kind: "channel_id", value: channelId };
}

export function normalizeYouTubeChannelSeed(
  input: string,
): NormalizedYouTubeChannelSeed {
  const seed = input.normalize("NFKC").trim();
  if (!seed || seed.length > 500) throw new Error("INVALID_YOUTUBE_CHANNEL_SEED");
  if (channelIdPattern.test(seed)) return normalizeChannelId(seed);
  if (seed.startsWith("@")) return normalizeHandle(seed);

  let url: URL;
  try {
    url = new URL(seed);
  } catch {
    throw new Error("INVALID_YOUTUBE_CHANNEL_SEED");
  }
  if (
    url.protocol !== "https:" ||
    !allowedHosts.has(url.hostname.toLocaleLowerCase("en-US")) ||
    url.username ||
    url.password ||
    url.port ||
    url.search ||
    url.hash
  ) {
    throw new Error("INVALID_YOUTUBE_CHANNEL_SEED");
  }
  const segments = url.pathname
    .split("/")
    .filter(Boolean)
    .map((segment) => decodeURIComponent(segment));
  if (segments.length === 1 && segments[0]?.startsWith("@")) {
    return normalizeHandle(segments[0]);
  }
  if (segments.length === 2 && segments[0] === "channel" && segments[1]) {
    return normalizeChannelId(segments[1]);
  }
  throw new Error("INVALID_YOUTUBE_CHANNEL_SEED");
}
