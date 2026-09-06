export const WEBSITE_GREETER_RELEASE_LOCALES = ["en-IN", "te-IN", "hi-IN"] as const;

export type WebsiteGreeterReleaseLocale =
  (typeof WEBSITE_GREETER_RELEASE_LOCALES)[number];

export const DEFAULT_WEBSITE_GREETER_LOCALE: WebsiteGreeterReleaseLocale = "en-IN";

const releaseLocaleSet = new Set<string>(WEBSITE_GREETER_RELEASE_LOCALES);

export function websiteGreeterLocaleFromLanguageTag(
  value: string | null | undefined,
): WebsiteGreeterReleaseLocale | null {
  const normalized = value?.trim().replace("_", "-").toLowerCase();
  if (!normalized) return null;
  if (normalized === "te" || normalized.startsWith("te-")) return "te-IN";
  if (normalized === "hi" || normalized.startsWith("hi-")) return "hi-IN";
  if (normalized === "en" || normalized.startsWith("en-")) return "en-IN";
  return null;
}

export function isWebsiteGreeterReleaseLocale(
  value: unknown,
): value is WebsiteGreeterReleaseLocale {
  return typeof value === "string" && releaseLocaleSet.has(value);
}

export function detectWebsiteGreeterLocale(options: {
  siteLocale?: string | null;
  browserLanguages?: readonly string[];
}): WebsiteGreeterReleaseLocale {
  return websiteGreeterLocaleFromLanguageTag(options.siteLocale)
    ?? options.browserLanguages
      ?.map(websiteGreeterLocaleFromLanguageTag)
      .find((locale): locale is WebsiteGreeterReleaseLocale => locale !== null)
    ?? DEFAULT_WEBSITE_GREETER_LOCALE;
}

export function websiteGreeterLocaleFromText(
  value: string,
): WebsiteGreeterReleaseLocale | null {
  if (/[\u0C00-\u0C7F]/u.test(value)) return "te-IN";
  if (/[\u0900-\u097F]/u.test(value)) return "hi-IN";
  return null;
}
