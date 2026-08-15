import { z } from "zod";
import type {
  NormalizedYouTubeChannelSeed,
  ResolvedYouTubeChannel,
  YouTubeClient,
  YouTubeUploadPage,
  YouTubeVideoMetadata,
} from "./types";

export const YOUTUBE_DATA_API_ORIGIN = "https://www.googleapis.com";
export const YOUTUBE_DATA_API_PATH = "/youtube/v3";
export const YOUTUBE_CLIENT_TIMEOUT_MS = 8_000;
export const YOUTUBE_CLIENT_MAX_RESPONSE_BYTES = 500_000;
export const YOUTUBE_UPLOAD_PAGE_SIZE = 50;
export const YOUTUBE_VIDEO_BATCH_SIZE = 50;

const channelResponseSchema = z
  .object({
    items: z.array(z.object({
      id: z.string().min(1).max(64),
      contentDetails: z.object({
        relatedPlaylists: z.object({
          uploads: z.string().min(1).max(100),
        }).passthrough(),
      }).passthrough(),
    }).passthrough()).max(1),
  })
  .passthrough();

const uploadPageResponseSchema = z
  .object({
    nextPageToken: z.string().min(1).max(1_000).optional(),
    items: z.array(z.object({
      contentDetails: z.object({
        videoId: z.string().regex(/^[A-Za-z0-9_-]{11}$/u),
      }).passthrough(),
    }).passthrough()).max(YOUTUBE_UPLOAD_PAGE_SIZE),
  })
  .passthrough();

const videoResponseSchema = z
  .object({
    items: z.array(z.object({
      id: z.string().regex(/^[A-Za-z0-9_-]{11}$/u),
      snippet: z.object({
        channelId: z.string().min(1).max(64),
        title: z.string().max(2_000),
        description: z.string().max(100_000),
        publishedAt: z.iso.datetime({ offset: true }),
      }).passthrough(),
      status: z.object({
        privacyStatus: z.enum(["public", "private", "unlisted"]),
      }).passthrough(),
    }).passthrough()).max(YOUTUBE_VIDEO_BATCH_SIZE),
  })
  .passthrough();

const errorResponseSchema = z
  .object({
    error: z.object({
      errors: z.array(z.object({
        reason: z.string(),
      }).passthrough()).optional(),
      status: z.string().optional(),
    }).passthrough(),
  })
  .passthrough();

export type YouTubeClientErrorCode =
  | "NOT_CONFIGURED"
  | "INVALID_REQUEST"
  | "AUTHENTICATION_FAILED"
  | "QUOTA_EXCEEDED"
  | "PROVIDER_UNAVAILABLE"
  | "INVALID_RESPONSE"
  | "CHANNEL_NOT_FOUND";

export class YouTubeClientError extends Error {
  constructor(public readonly code: YouTubeClientErrorCode) {
    super(code);
    this.name = "YouTubeClientError";
  }
}

export type YouTubeClientOptions = {
  apiKey?: string;
  environment?: Record<string, string | undefined>;
  fetcher?: typeof fetch;
};

export function sourcedFarmerYouTubeConfiguration(
  environment: Record<string, string | undefined> = process.env,
) {
  const apiKey = environment.YOUTUBE_DATA_API_KEY?.trim() ?? "";
  return { apiKey, configured: apiKey.length > 0 };
}

async function boundedJson(response: Response): Promise<unknown> {
  const contentLength = response.headers.get("content-length");
  if (contentLength) {
    const declaredBytes = Number(contentLength);
    if (
      Number.isFinite(declaredBytes) &&
      declaredBytes > YOUTUBE_CLIENT_MAX_RESPONSE_BYTES
    ) throw new YouTubeClientError("INVALID_RESPONSE");
  }
  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await response.arrayBuffer());
  } catch {
    throw new YouTubeClientError("INVALID_RESPONSE");
  }
  if (bytes.byteLength > YOUTUBE_CLIENT_MAX_RESPONSE_BYTES) {
    throw new YouTubeClientError("INVALID_RESPONSE");
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  } catch {
    throw new YouTubeClientError("INVALID_RESPONSE");
  }
}

function errorCodeForResponse(response: Response, payload: unknown) {
  if (response.status === 429) return "QUOTA_EXCEEDED" as const;
  const parsed = errorResponseSchema.safeParse(payload);
  const reasons = parsed.success
    ? parsed.data.error.errors?.map((error) => error.reason) ?? []
    : [];
  if (
    reasons.some((reason) =>
      /(?:quota|rateLimitExceeded|dailyLimitExceeded)/iu.test(reason)
    )
  ) return "QUOTA_EXCEEDED" as const;
  if (response.status === 401 || response.status === 403) {
    return "AUTHENTICATION_FAILED" as const;
  }
  return "PROVIDER_UNAVAILABLE" as const;
}

function endpoint(resource: "channels" | "playlistItems" | "videos") {
  return new URL(`${YOUTUBE_DATA_API_ORIGIN}${YOUTUBE_DATA_API_PATH}/${resource}`);
}

export function createYouTubeClient(options: YouTubeClientOptions = {}): YouTubeClient {
  const configured = sourcedFarmerYouTubeConfiguration(
    options.environment ?? process.env,
  );
  const apiKey = (options.apiKey ?? configured.apiKey).trim();
  if (!apiKey) throw new YouTubeClientError("NOT_CONFIGURED");
  const fetcher = options.fetcher ?? fetch;

  const request = async (url: URL) => {
    if (
      url.origin !== YOUTUBE_DATA_API_ORIGIN ||
      !url.pathname.startsWith(`${YOUTUBE_DATA_API_PATH}/`)
    ) throw new YouTubeClientError("INVALID_REQUEST");
    let response: Response;
    try {
      response = await fetcher(url, {
        method: "GET",
        redirect: "error",
        headers: {
          accept: "application/json",
          "accept-encoding": "gzip",
          "user-agent":
            "FarmerBookSourcedFarmerResearch/1.0 (+https://farmerbook.in/privacy)",
        },
        signal: AbortSignal.timeout(YOUTUBE_CLIENT_TIMEOUT_MS),
      });
    } catch {
      throw new YouTubeClientError("PROVIDER_UNAVAILABLE");
    }
    const payload = await boundedJson(response);
    if (!response.ok) throw new YouTubeClientError(errorCodeForResponse(response, payload));
    return payload;
  };

  const resolveChannel = async (
    seed: NormalizedYouTubeChannelSeed,
  ): Promise<ResolvedYouTubeChannel> => {
    const url = endpoint("channels");
    url.search = new URLSearchParams({
      part: "contentDetails",
      maxResults: "1",
      ...(seed.kind === "handle"
        ? { forHandle: `@${seed.value}` }
        : { id: seed.value }),
      key: apiKey,
    }).toString();
    const parsed = channelResponseSchema.safeParse(await request(url));
    if (!parsed.success) throw new YouTubeClientError("INVALID_RESPONSE");
    const channel = parsed.data.items[0];
    if (!channel) throw new YouTubeClientError("CHANNEL_NOT_FOUND");
    return {
      channelId: channel.id,
      uploadsPlaylistId: channel.contentDetails.relatedPlaylists.uploads,
      canonicalUrl: `https://www.youtube.com/channel/${channel.id}`,
    };
  };

  const listUploadPage = async (input: {
    uploadsPlaylistId: string;
    pageToken?: string;
  }): Promise<YouTubeUploadPage> => {
    if (
      !input.uploadsPlaylistId || input.uploadsPlaylistId.length > 100 ||
      (input.pageToken?.length ?? 0) > 1_000
    ) throw new YouTubeClientError("INVALID_REQUEST");
    const url = endpoint("playlistItems");
    url.search = new URLSearchParams({
      part: "contentDetails",
      playlistId: input.uploadsPlaylistId,
      maxResults: String(YOUTUBE_UPLOAD_PAGE_SIZE),
      ...(input.pageToken ? { pageToken: input.pageToken } : {}),
      key: apiKey,
    }).toString();
    const parsed = uploadPageResponseSchema.safeParse(await request(url));
    if (!parsed.success) throw new YouTubeClientError("INVALID_RESPONSE");
    return {
      items: parsed.data.items.map((item) => ({
        videoId: item.contentDetails.videoId,
      })),
      nextPageToken: parsed.data.nextPageToken ?? null,
    };
  };

  const listVideos = async (
    videoIds: readonly string[],
  ): Promise<YouTubeVideoMetadata[]> => {
    const uniqueIds = [...new Set(videoIds)];
    if (
      uniqueIds.length === 0 ||
      uniqueIds.length > YOUTUBE_VIDEO_BATCH_SIZE ||
      uniqueIds.some((id) => !/^[A-Za-z0-9_-]{11}$/u.test(id))
    ) throw new YouTubeClientError("INVALID_REQUEST");
    const url = endpoint("videos");
    url.search = new URLSearchParams({
      part: "snippet,status",
      id: uniqueIds.join(","),
      key: apiKey,
    }).toString();
    const parsed = videoResponseSchema.safeParse(await request(url));
    if (!parsed.success) throw new YouTubeClientError("INVALID_RESPONSE");
    return parsed.data.items.map((item) => ({
      videoId: item.id,
      channelId: item.snippet.channelId,
      title: item.snippet.title,
      description: item.snippet.description,
      publishedAt: item.snippet.publishedAt,
      privacyStatus: item.status.privacyStatus,
    }));
  };

  return { resolveChannel, listUploadPage, listVideos };
}
