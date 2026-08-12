import { resolveLocale, type SupportedLocale } from "./locales";

export type RequestLocaleSources = Readonly<{
  explicit?: unknown;
  profile?: unknown;
  cookie?: unknown;
  acceptLanguage?: string | null;
}>;

/**
 * Resolves request-provided values without importing framework request APIs.
 * Callers inject the values they have already read from routes, profiles,
 * cookies, and the Accept-Language header.
 */
export function getRequestLocale(
  sources: RequestLocaleSources = {},
): SupportedLocale {
  return resolveLocale(sources);
}
