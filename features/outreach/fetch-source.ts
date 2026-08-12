import { firstSameOriginContactLink, visibleTextFromHtml } from "./html-to-text";
import { validateWebsiteUrl } from "./url-policy";

export const SOURCE_FETCH_TIMEOUT_MS = 8_000;
export const SOURCE_MAX_RESPONSE_BYTES = 300_000;
export const SOURCE_MAX_TEXT_LENGTH = 12_000;
export const FARMERBOOK_RESEARCH_USER_AGENT =
  "FarmerBookResearch/1.0 (+https://farmerbook.in/privacy)";

export type FetchedSourceDocument = {
  sourceUrl: string;
  title: string | null;
  text: string;
  pagesFetched: number;
};

export class SourceFetchError extends Error {
  constructor(
    public readonly code:
      | "BLOCKED_SOURCE"
      | "FETCH_TIMEOUT"
      | "FETCH_FAILED"
      | "CONTENT_TOO_LARGE"
      | "UNSUPPORTED_CONTENT",
  ) {
    super(code);
  }
}

function htmlTitle(html: string) {
  const match = /<title\b[^>]*>([\s\S]{1,300}?)<\/title>/i.exec(html);
  return match ? visibleTextFromHtml(match[1], 180) || null : null;
}

async function boundedResponseText(response: Response) {
  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > SOURCE_MAX_RESPONSE_BYTES) {
    throw new SourceFetchError("CONTENT_TOO_LARGE");
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > SOURCE_MAX_RESPONSE_BYTES) {
    throw new SourceFetchError("CONTENT_TOO_LARGE");
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

async function fetchOnePage(
  initialUrl: URL,
  fetcher: typeof fetch,
  production: boolean,
) {
  let current = initialUrl;
  for (let redirectCount = 0; redirectCount <= 2; redirectCount += 1) {
    let response: Response;
    try {
      response = await fetcher(current, {
        method: "GET",
        redirect: "manual",
        headers: {
          accept: "text/html,text/plain;q=0.9",
          "user-agent": FARMERBOOK_RESEARCH_USER_AGENT,
        },
        signal: AbortSignal.timeout(SOURCE_FETCH_TIMEOUT_MS),
      });
    } catch (error) {
      if (error instanceof Error && error.name === "TimeoutError") {
        throw new SourceFetchError("FETCH_TIMEOUT");
      }
      throw new SourceFetchError("FETCH_FAILED");
    }
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || redirectCount === 2) throw new SourceFetchError("BLOCKED_SOURCE");
      const redirected = new URL(location, current);
      const validation = validateWebsiteUrl(redirected.toString(), {
        production,
        expectedOrigin: initialUrl.origin,
      });
      if (!validation.ok) throw new SourceFetchError("BLOCKED_SOURCE");
      current = validation.url;
      continue;
    }
    if (!response.ok) throw new SourceFetchError("FETCH_FAILED");
    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
      throw new SourceFetchError("UNSUPPORTED_CONTENT");
    }
    return {
      finalUrl: current,
      contentType,
      raw: await boundedResponseText(response),
    };
  }
  throw new SourceFetchError("BLOCKED_SOURCE");
}

export async function fetchPublicBusinessSource(
  value: string,
  options: { fetcher?: typeof fetch; production?: boolean } = {},
): Promise<FetchedSourceDocument> {
  const production = options.production ?? true;
  const validation = validateWebsiteUrl(value, { production });
  if (!validation.ok) throw new SourceFetchError("BLOCKED_SOURCE");
  const fetcher = options.fetcher ?? fetch;
  const first = await fetchOnePage(validation.url, fetcher, production);
  const firstIsHtml = first.contentType.includes("text/html");
  const title = firstIsHtml ? htmlTitle(first.raw) : null;
  let combinedText = firstIsHtml
    ? visibleTextFromHtml(first.raw, SOURCE_MAX_TEXT_LENGTH)
    : first.raw.replace(/\s+/g, " ").trim().slice(0, SOURCE_MAX_TEXT_LENGTH);
  let pagesFetched = 1;

  if (firstIsHtml) {
    const contactLink = firstSameOriginContactLink(first.raw, first.finalUrl);
    if (contactLink && contactLink !== first.finalUrl.toString()) {
      try {
        const second = await fetchOnePage(new URL(contactLink), fetcher, production);
        const secondText = second.contentType.includes("text/html")
          ? visibleTextFromHtml(second.raw, SOURCE_MAX_TEXT_LENGTH)
          : second.raw.replace(/\s+/g, " ").trim().slice(0, SOURCE_MAX_TEXT_LENGTH);
        combinedText = `${combinedText}\n${secondText}`.slice(0, SOURCE_MAX_TEXT_LENGTH);
        pagesFetched = 2;
      } catch {
        // The submitted source remains usable when its optional contact page fails.
      }
    }
  }

  return {
    sourceUrl: first.finalUrl.toString(),
    title,
    text: combinedText,
    pagesFetched,
  };
}
