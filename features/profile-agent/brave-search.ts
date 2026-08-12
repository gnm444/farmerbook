import { visibleTextFromHtml } from "@/features/outreach/html-to-text";
import { classifyOutreachSource } from "@/features/outreach/source-policy";
import { validateWebsiteUrl } from "@/features/outreach/url-policy";
import type { ProfileNameDiscoveryInput } from "./schemas";

export const BRAVE_SEARCH_ENDPOINT =
  "https://api.search.brave.com/res/v1/web/search";
export const BRAVE_SEARCH_TIMEOUT_MS = 8_000;
export const BRAVE_SEARCH_MAX_RESPONSE_BYTES = 250_000;
export const BRAVE_SEARCH_MAX_RESULTS = 5;
export const BRAVE_SEARCH_PROVIDER = "brave_search";

type BraveSearchEnvironment = Record<string, string | undefined>;

function parseBraveResults(value: unknown) {
  if (!value || typeof value !== "object") {
    throw new BraveSearchError("INVALID_RESPONSE");
  }
  const web = (value as { web?: unknown }).web;
  if (!web || typeof web !== "object") return [];
  const results = (web as { results?: unknown }).results;
  if (!Array.isArray(results)) return [];
  return results.flatMap((candidate) => {
    if (!candidate || typeof candidate !== "object") return [];
    const result = candidate as Record<string, unknown>;
    if (typeof result.url !== "string" || typeof result.title !== "string") {
      return [];
    }
    return [{
      url: result.url,
      title: result.title,
      description:
        typeof result.description === "string" ? result.description : "",
    }];
  });
}

export type BraveFarmerSearchResult = {
  sourceUrl: string;
  sourceType: Exclude<
    ReturnType<typeof classifyOutreachSource>,
    "unsupported"
  >;
  sourceTitle: string;
  sourceText: string;
  discoveryProvider: typeof BRAVE_SEARCH_PROVIDER;
  usageRightsBasis: "provider_storage_plan";
};

export class BraveSearchError extends Error {
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

export function braveSearchConfiguration(
  environment: BraveSearchEnvironment = process.env,
) {
  const apiKey = environment.BRAVE_SEARCH_API_KEY?.trim() ?? "";
  const storageRightsConfirmed =
    environment.BRAVE_SEARCH_STORAGE_RIGHTS_CONFIRMED?.trim().toLowerCase() ===
    "true";
  return {
    apiKey,
    storageRightsConfirmed,
    configured: apiKey.length >= 20 && storageRightsConfirmed,
  };
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

const blockedDiscoveryHosts = [
  "farmerbook.in",
  "google.com",
  "bing.com",
  "search.brave.com",
  "brave.com",
];

function hostIsBlocked(hostname: string) {
  return blockedDiscoveryHosts.some(
    (host) => hostname === host || hostname.endsWith(`.${host}`),
  );
}

export function buildBraveFarmerQuery(input: ProfileNameDiscoveryInput) {
  return [
    `"${input.fullName.replaceAll('"', "")}"`,
    "farmer agriculture farming",
    input.locationHint,
    input.farmingHint,
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
    declaredSize > BRAVE_SEARCH_MAX_RESPONSE_BYTES
  ) {
    throw new BraveSearchError("INVALID_RESPONSE");
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > BRAVE_SEARCH_MAX_RESPONSE_BYTES) {
    throw new BraveSearchError("INVALID_RESPONSE");
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  } catch {
    throw new BraveSearchError("INVALID_RESPONSE");
  }
}

export async function searchFarmerByName(
  input: ProfileNameDiscoveryInput,
  options: {
    fetcher?: typeof fetch;
    environment?: BraveSearchEnvironment;
  } = {},
) {
  const configuration = braveSearchConfiguration(options.environment);
  if (!configuration.configured) {
    throw new BraveSearchError("NOT_CONFIGURED");
  }
  const query = buildBraveFarmerQuery(input);
  const endpoint = new URL(BRAVE_SEARCH_ENDPOINT);
  endpoint.search = new URLSearchParams({
    q: query,
    count: "10",
    country: "IN",
    search_lang: "en",
    safesearch: "strict",
    spellcheck: "0",
  }).toString();
  let response: Response;
  try {
    response = await (options.fetcher ?? fetch)(endpoint, {
      method: "GET",
      redirect: "error",
      headers: {
        accept: "application/json",
        "accept-encoding": "gzip",
        "x-subscription-token": configuration.apiKey,
        "user-agent":
          "FarmerBookManagedProfileResearch/1.0 (+https://farmerbook.in/privacy)",
      },
      signal: AbortSignal.timeout(BRAVE_SEARCH_TIMEOUT_MS),
    });
  } catch {
    throw new BraveSearchError("SEARCH_UNAVAILABLE");
  }
  if (response.status === 401 || response.status === 403) {
    throw new BraveSearchError("AUTHENTICATION_FAILED");
  }
  if (response.status === 429) {
    throw new BraveSearchError("QUOTA_EXCEEDED");
  }
  if (!response.ok) throw new BraveSearchError("SEARCH_UNAVAILABLE");

  const candidates = parseBraveResults(await boundedJson(response));
  const seen = new Set<string>();
  const results: BraveFarmerSearchResult[] = [];
  for (const candidate of candidates) {
    if (results.length >= BRAVE_SEARCH_MAX_RESULTS) break;
    const validation = validateWebsiteUrl(candidate.url, { production: true });
    if (!validation.ok) continue;
    const sourceUrl = validation.url.toString();
    const parsedUrl = new URL(sourceUrl);
    if (
      parsedUrl.protocol !== "https:" ||
      hostIsBlocked(parsedUrl.hostname.toLowerCase()) ||
      seen.has(sourceUrl)
    ) {
      continue;
    }
    const sourceTitle = visibleTextFromHtml(candidate.title, 180);
    const sourceText = visibleTextFromHtml(candidate.description, 1_000);
    const searchable = `${sourceTitle} ${sourceText} ${sourceUrl}`;
    if (
      sourceTitle.length < 2 ||
      sourceText.length < 2 ||
      !exactNameMatch(input.fullName, searchable) ||
      !agriculturePattern.test(searchable)
    ) {
      continue;
    }
    const sourceType = classifyOutreachSource(sourceUrl);
    if (sourceType === "unsupported") continue;
    seen.add(sourceUrl);
    results.push({
      sourceUrl,
      sourceType,
      sourceTitle,
      sourceText,
      discoveryProvider: BRAVE_SEARCH_PROVIDER,
      usageRightsBasis: "provider_storage_plan",
    });
  }
  return { query, results };
}
