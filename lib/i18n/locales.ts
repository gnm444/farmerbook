export const DEFAULT_LOCALE = "en-IN" as const;
export const LOCALE_COOKIE_NAME = "fb_locale";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const localeRegistry = {
  "en-IN": { nativeName: "English", englishName: "English", direction: "ltr" },
  "as-IN": { nativeName: "অসমীয়া", englishName: "Assamese", direction: "ltr" },
  "bn-IN": { nativeName: "বাংলা", englishName: "Bengali", direction: "ltr" },
  "brx-IN": { nativeName: "बड़ो", englishName: "Bodo", direction: "ltr" },
  "doi-IN": { nativeName: "डोगरी", englishName: "Dogri", direction: "ltr" },
  "gu-IN": { nativeName: "ગુજરાતી", englishName: "Gujarati", direction: "ltr" },
  "hi-IN": { nativeName: "हिन्दी", englishName: "Hindi", direction: "ltr" },
  "kn-IN": { nativeName: "ಕನ್ನಡ", englishName: "Kannada", direction: "ltr" },
  "ks-Arab-IN": { nativeName: "کٲشُر", englishName: "Kashmiri", direction: "rtl" },
  "kok-Deva-IN": { nativeName: "कोंकणी", englishName: "Konkani", direction: "ltr" },
  "mai-IN": { nativeName: "मैथिली", englishName: "Maithili", direction: "ltr" },
  "ml-IN": { nativeName: "മലയാളം", englishName: "Malayalam", direction: "ltr" },
  "mni-Mtei-IN": { nativeName: "ꯃꯤꯇꯩ ꯂꯣꯟ", englishName: "Manipuri", direction: "ltr" },
  "mr-IN": { nativeName: "मराठी", englishName: "Marathi", direction: "ltr" },
  "ne-IN": { nativeName: "नेपाली", englishName: "Nepali", direction: "ltr" },
  "or-IN": { nativeName: "ଓଡ଼ିଆ", englishName: "Odia", direction: "ltr" },
  "pa-Guru-IN": { nativeName: "ਪੰਜਾਬੀ", englishName: "Punjabi", direction: "ltr" },
  "sa-IN": { nativeName: "संस्कृतम्", englishName: "Sanskrit", direction: "ltr" },
  "sat-Olck-IN": { nativeName: "ᱥᱟᱱᱛᱟᱲᱤ", englishName: "Santali", direction: "ltr" },
  "sd-Arab-IN": { nativeName: "سنڌي", englishName: "Sindhi", direction: "rtl" },
  "ta-IN": { nativeName: "தமிழ்", englishName: "Tamil", direction: "ltr" },
  "te-IN": { nativeName: "తెలుగు", englishName: "Telugu", direction: "ltr" },
  "ur-IN": { nativeName: "اردو", englishName: "Urdu", direction: "rtl" },
} as const;

export type SupportedLocale = keyof typeof localeRegistry;
export type TextDirection = (typeof localeRegistry)[SupportedLocale]["direction"];

export const SUPPORTED_LOCALES = Object.freeze(
  Object.keys(localeRegistry) as SupportedLocale[],
);

export const CORE_LOCALES = Object.freeze([
  "en-IN",
  "hi-IN",
  "mr-IN",
] as const satisfies readonly SupportedLocale[]);

const localeByLowercase = new Map(
  SUPPORTED_LOCALES.map((locale) => [locale.toLowerCase(), locale]),
);

const localeByLanguage = new Map<string, SupportedLocale>([
  ["en", "en-IN"],
  ["as", "as-IN"],
  ["bn", "bn-IN"],
  ["brx", "brx-IN"],
  ["doi", "doi-IN"],
  ["gu", "gu-IN"],
  ["hi", "hi-IN"],
  ["kn", "kn-IN"],
  ["ks", "ks-Arab-IN"],
  ["kok", "kok-Deva-IN"],
  ["mai", "mai-IN"],
  ["ml", "ml-IN"],
  ["mni", "mni-Mtei-IN"],
  ["mr", "mr-IN"],
  ["ne", "ne-IN"],
  ["or", "or-IN"],
  ["pa", "pa-Guru-IN"],
  ["sa", "sa-IN"],
  ["sat", "sat-Olck-IN"],
  ["sd", "sd-Arab-IN"],
  ["ta", "ta-IN"],
  ["te", "te-IN"],
  ["ur", "ur-IN"],
]);

export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(localeRegistry, value)
  );
}

export function normalizeLocale(value: unknown): SupportedLocale | null {
  if (typeof value !== "string") return null;
  const candidate = value.trim().replaceAll("_", "-");
  if (!candidate || candidate.length > 64 || /[^A-Za-z0-9-]/.test(candidate)) {
    return null;
  }

  const exact = localeByLowercase.get(candidate.toLowerCase());
  if (exact) return exact;

  try {
    const [canonical] = Intl.getCanonicalLocales(candidate);
    if (!canonical) return null;
    const supported = localeByLowercase.get(canonical.toLowerCase());
    if (supported) return supported;
    return localeByLanguage.get(new Intl.Locale(canonical).language) ?? null;
  } catch {
    return null;
  }
}

export function directionForLocale(value: unknown): TextDirection {
  const locale = normalizeLocale(value) ?? DEFAULT_LOCALE;
  return localeRegistry[locale].direction;
}

export function resolveAcceptLanguage(
  header: string | null | undefined,
): SupportedLocale | null {
  if (!header || header.length > 2048) return null;

  const candidates = header
    .split(",", 50)
    .map((entry, index) => {
      const [rangePart, ...parameters] = entry.trim().split(";");
      const range = rangePart?.trim() ?? "";
      let quality = 1;
      for (const parameter of parameters) {
        if (!/^q\s*=/i.test(parameter.trim())) continue;
        const match = /^q\s*=\s*(0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/i.exec(
          parameter.trim(),
        );
        quality = match ? Number(match[1]) : 0;
      }
      return { range, quality, index };
    })
    .filter(({ range, quality }) => Boolean(range) && quality > 0)
    .sort((left, right) => right.quality - left.quality || left.index - right.index);

  for (const { range } of candidates) {
    if (range === "*") return DEFAULT_LOCALE;
    const locale = normalizeLocale(range);
    if (locale) return locale;
  }
  return null;
}

export function resolveLocale({
  explicit,
  profile,
  cookie,
  acceptLanguage,
  fallback = DEFAULT_LOCALE,
}: {
  explicit?: unknown;
  profile?: unknown;
  cookie?: unknown;
  acceptLanguage?: string | null;
  fallback?: SupportedLocale;
}): SupportedLocale {
  return (
    normalizeLocale(explicit) ??
    normalizeLocale(cookie) ??
    normalizeLocale(profile) ??
    resolveAcceptLanguage(acceptLanguage) ??
    fallback
  );
}

export function isLocaleEnabled(
  value: unknown,
  extendedLocalesEnabled: boolean,
): value is SupportedLocale {
  const locale = normalizeLocale(value);
  return Boolean(
    locale &&
      (extendedLocalesEnabled ||
        CORE_LOCALES.some((coreLocale) => coreLocale === locale)),
  );
}
