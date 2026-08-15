import { z } from "zod";
import { visibleTextFromHtml } from "@/features/outreach/html-to-text";
import type { SupportedLocale } from "@/lib/i18n/locales";
import type { YouTubeDiscoveryResult } from "./types";

export const YOUTUBE_DISCOVERY_ENDPOINT =
  "https://www.googleapis.com/youtube/v3/search";
export const YOUTUBE_DISCOVERY_MAX_RESULTS = 10;
export const YOUTUBE_DISCOVERY_TIMEOUT_MS = 8_000;
export const YOUTUBE_DISCOVERY_MAX_RESPONSE_BYTES = 250_000;

const searchResponseSchema = z.object({
  items: z.array(z.object({
    id: z.object({
      kind: z.literal("youtube#channel"),
      channelId: z.string().min(1).max(160),
    }),
    snippet: z.object({
      title: z.string().max(500),
      description: z.string().max(2_000),
      channelTitle: z.string().max(500).optional(),
    }),
  })).max(50),
}).passthrough();

const agriculturePattern =
  /(?:agri(?:culture|cultural)?|farmer|farming|farm|grower|crop|horticulture|orchard|dairy|livestock|poultry|fishery|fisheries|aquaculture|beekeep|sericulture|organic|natural farming|producer|fpo|cooperative|किसान|खेती|कृषि|రైతు|వ్యవసాయం)/iu;

export class YouTubeDiscoveryError extends Error {
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

export function youtubeDiscoveryConfiguration(
  environment: Record<string, string | undefined> = process.env,
) {
  const apiKey = environment.YOUTUBE_DATA_API_KEY?.trim() ?? "";
  return { apiKey, configured: apiKey.length >= 20 };
}

async function boundedJson(response: Response) {
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > YOUTUBE_DISCOVERY_MAX_RESPONSE_BYTES) {
    throw new YouTubeDiscoveryError("INVALID_RESPONSE");
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > YOUTUBE_DISCOVERY_MAX_RESPONSE_BYTES) {
    throw new YouTubeDiscoveryError("INVALID_RESPONSE");
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  } catch {
    throw new YouTubeDiscoveryError("INVALID_RESPONSE");
  }
}

export async function discoverFarmerChannelsOnYouTube(
  input: { query: string; locale: SupportedLocale },
  options: {
    environment?: Record<string, string | undefined>;
    fetcher?: typeof fetch;
  } = {},
) {
  const configuration = youtubeDiscoveryConfiguration(options.environment);
  if (!configuration.configured) throw new YouTubeDiscoveryError("NOT_CONFIGURED");
  const query = input.query.normalize("NFKC").trim().slice(0, 200);
  const endpoint = new URL(YOUTUBE_DISCOVERY_ENDPOINT);
  endpoint.search = new URLSearchParams({
    part: "snippet",
    q: query,
    type: "channel",
    regionCode: "IN",
    relevanceLanguage: input.locale.split("-")[0] ?? "en",
    safeSearch: "strict",
    maxResults: String(YOUTUBE_DISCOVERY_MAX_RESULTS),
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
          "FarmerBookYouTubeDiscovery/1.0 (+https://farmerbook.in/privacy)",
      },
      signal: AbortSignal.timeout(YOUTUBE_DISCOVERY_TIMEOUT_MS),
    });
  } catch {
    throw new YouTubeDiscoveryError("SEARCH_UNAVAILABLE");
  }
  if (response.status === 401 || response.status === 403) {
    throw new YouTubeDiscoveryError("AUTHENTICATION_FAILED");
  }
  if (response.status === 429) throw new YouTubeDiscoveryError("QUOTA_EXCEEDED");
  if (!response.ok) throw new YouTubeDiscoveryError("SEARCH_UNAVAILABLE");
  const parsed = searchResponseSchema.safeParse(await boundedJson(response));
  if (!parsed.success) throw new YouTubeDiscoveryError("INVALID_RESPONSE");
  const seen = new Set<string>();
  const results: YouTubeDiscoveryResult[] = [];
  for (const item of parsed.data.items) {
    if (results.length >= YOUTUBE_DISCOVERY_MAX_RESULTS) break;
    if (seen.has(item.id.channelId)) continue;
    const title = visibleTextFromHtml(item.snippet.title, 180);
    const description = visibleTextFromHtml(item.snippet.description, 1_000);
    if (!title || !agriculturePattern.test(`${title} ${description} ${query}`)) continue;
    seen.add(item.id.channelId);
    results.push({
      channelId: item.id.channelId,
      channelUrl:
        `https://www.youtube.com/channel/${encodeURIComponent(item.id.channelId)}`,
      title,
      description,
      discoveryProvider: "youtube_data_api",
      transient: true,
    });
  }
  return { query, results };
}
