import { visibleTextFromHtml } from "@/features/outreach/html-to-text";
import type { SupportedLocale } from "@/lib/i18n/locales";
import {
  knownFarmerHintsSchema,
  type KnownFarmerHints,
  youtubeSearchListResponseSchema,
} from "./known-farmer-schemas";

export const YOUTUBE_SEARCH_ENDPOINT =
  "https://www.googleapis.com/youtube/v3/search";
export const YOUTUBE_SEARCH_TIMEOUT_MS = 8_000;
export const YOUTUBE_SEARCH_MAX_RESPONSE_BYTES = 250_000;
export const YOUTUBE_SEARCH_MAX_RESULTS = 5;
export const YOUTUBE_SEARCH_PROVIDER = "youtube_data_api" as const;

type YouTubeSearchEnvironment = Record<string, string | undefined>;

export type YouTubeFarmerCandidate = {
  providerItemId: string;
  resultKind: "channel" | "video";
  sourceUrl: string;
  sourceType: "youtube";
  sourceTitle: string;
  sourceText: string;
  channelId?: string;
  discoveryProvider: typeof YOUTUBE_SEARCH_PROVIDER;
  usageRightsBasis: "youtube_api_terms";
  defaultAssociation: "third_party_coverage";
};

export class YouTubeSearchError extends Error {
  constructor(
    public readonly code:
      | "NOT_CONFIGURED"
      | "AUTHENTICATION_FAILED"
      | "QUOTA_EXCEEDED"
      | "SEARCH_UNAVAILABLE"
      | "INVALID_RESPONSE",
  ) {
    super(code);
  }
}

export function youtubeSearchConfiguration(
  environment: YouTubeSearchEnvironment = process.env,
) {
  const apiKey = environment.YOUTUBE_DATA_API_KEY?.trim() ?? "";
  return { apiKey, configured: apiKey.length >= 20 };
}

function normalizedTokens(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en-IN")
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length >= 2);
}

function exactNameMatch(fullName: string, candidate: string) {
  const tokens = normalizedTokens(fullName);
  const normalizedCandidate = candidate
    .normalize("NFKC")
    .toLocaleLowerCase("en-IN");
  return tokens.length > 0 && tokens.every((token) =>
    normalizedCandidate.includes(token),
  );
}

const agriculturePattern =
  /\b(?:agri(?:culture|cultural)?|farmer|farming|farm|grower|crop|horticulture|orchard|dairy|livestock|poultry|fishery|fisheries|aquaculture|beekeep|sericulture|organic|natural farming|producer|fpo|cooperative)\b/i;

export function buildYouTubeFarmerQuery(input: KnownFarmerHints) {
  const parsed = knownFarmerHintsSchema.parse({
    fullName: input.fullName,
    locationHint: input.locationHint,
    farmingHint: input.farmingHint,
  });
  return [
    `"${parsed.fullName.replaceAll('"', "")}"`,
    "farmer agriculture farming",
    parsed.locationHint,
    parsed.farmingHint,
    "India",
  ]
    .filter(Boolean)
    .join(" ")
    .slice(0, 400);
}

async function boundedJson(response: Response) {
  const declaredSize = Number(response.headers.get("content-length"));
  if (
    Number.isFinite(declaredSize) &&
    declaredSize > YOUTUBE_SEARCH_MAX_RESPONSE_BYTES
  ) {
    throw new YouTubeSearchError("INVALID_RESPONSE");
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > YOUTUBE_SEARCH_MAX_RESPONSE_BYTES) {
    throw new YouTubeSearchError("INVALID_RESPONSE");
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  } catch {
    throw new YouTubeSearchError("INVALID_RESPONSE");
  }
}

function candidateFromItem(
  item: ReturnType<typeof youtubeSearchListResponseSchema.parse>["items"][number],
) {
  const sourceTitle = visibleTextFromHtml(item.snippet.title, 180);
  const sourceText = visibleTextFromHtml(item.snippet.description, 1_000);
  if (item.id.kind === "youtube#channel" && item.id.channelId) {
    return {
      providerItemId: item.id.channelId,
      resultKind: "channel" as const,
      sourceUrl: `https://www.youtube.com/channel/${encodeURIComponent(item.id.channelId)}`,
      sourceType: "youtube" as const,
      sourceTitle,
      sourceText,
      channelId: item.id.channelId,
      discoveryProvider: YOUTUBE_SEARCH_PROVIDER,
      usageRightsBasis: "youtube_api_terms" as const,
      defaultAssociation: "third_party_coverage" as const,
    };
  }
  if (item.id.kind === "youtube#video" && item.id.videoId) {
    return {
      providerItemId: item.id.videoId,
      resultKind: "video" as const,
      sourceUrl: `https://www.youtube.com/watch?v=${encodeURIComponent(item.id.videoId)}`,
      sourceType: "youtube" as const,
      sourceTitle,
      sourceText,
      channelId: item.snippet.channelId,
      discoveryProvider: YOUTUBE_SEARCH_PROVIDER,
      usageRightsBasis: "youtube_api_terms" as const,
      defaultAssociation: "third_party_coverage" as const,
    };
  }
  return null;
}

export async function searchKnownFarmerOnYouTube(
  input: KnownFarmerHints & { preferredLocale: SupportedLocale },
  options: {
    fetcher?: typeof fetch;
    environment?: YouTubeSearchEnvironment;
  } = {},
) {
  const configuration = youtubeSearchConfiguration(options.environment);
  if (!configuration.configured) {
    throw new YouTubeSearchError("NOT_CONFIGURED");
  }
  const query = buildYouTubeFarmerQuery(input);
  const endpoint = new URL(YOUTUBE_SEARCH_ENDPOINT);
  endpoint.search = new URLSearchParams({
    part: "snippet",
    q: query,
    type: "channel,video",
    regionCode: "IN",
    relevanceLanguage: input.preferredLocale.split("-")[0] ?? "en",
    safeSearch: "strict",
    maxResults: "10",
    key: configuration.apiKey,
  }).toString();

  let response: Response;
  try {
    response = await (options.fetcher ?? fetch)(endpoint, {
      method: "GET",
      redirect: "error",
      headers: {
        accept: "application/json",
        "accept-encoding": "gzip",
        "user-agent":
          "FarmerBookKnownFarmerResearch/1.0 (+https://farmerbook.in/privacy)",
      },
      signal: AbortSignal.timeout(YOUTUBE_SEARCH_TIMEOUT_MS),
    });
  } catch {
    throw new YouTubeSearchError("SEARCH_UNAVAILABLE");
  }
  if (response.status === 401 || response.status === 403) {
    throw new YouTubeSearchError("AUTHENTICATION_FAILED");
  }
  if (response.status === 429) {
    throw new YouTubeSearchError("QUOTA_EXCEEDED");
  }
  if (!response.ok) throw new YouTubeSearchError("SEARCH_UNAVAILABLE");

  const parsed = youtubeSearchListResponseSchema.safeParse(
    await boundedJson(response),
  );
  if (!parsed.success) throw new YouTubeSearchError("INVALID_RESPONSE");
  const seen = new Set<string>();
  const results: YouTubeFarmerCandidate[] = [];
  for (const item of parsed.data.items) {
    if (results.length >= YOUTUBE_SEARCH_MAX_RESULTS) break;
    const candidate = candidateFromItem(item);
    if (!candidate || seen.has(candidate.sourceUrl)) continue;
    const searchable = [
      candidate.sourceTitle,
      candidate.sourceText,
      item.snippet.channelTitle,
    ]
      .filter(Boolean)
      .join(" ");
    if (
      candidate.sourceTitle.length < 2 ||
      candidate.sourceText.length < 2 ||
      !exactNameMatch(input.fullName, searchable) ||
      !agriculturePattern.test(searchable)
    ) {
      continue;
    }
    seen.add(candidate.sourceUrl);
    results.push(candidate);
  }
  return { query, results };
}
