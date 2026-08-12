import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  directionForLocale,
  isSupportedLocale,
  localeRegistry,
  normalizeLocale,
  resolveAcceptLanguage,
  resolveLocale,
} from "@/lib/i18n";

const expectedLocales = [
  "en-IN",
  "as-IN",
  "bn-IN",
  "brx-IN",
  "doi-IN",
  "gu-IN",
  "hi-IN",
  "kn-IN",
  "ks-Arab-IN",
  "kok-Deva-IN",
  "mai-IN",
  "ml-IN",
  "mni-Mtei-IN",
  "mr-IN",
  "ne-IN",
  "or-IN",
  "pa-Guru-IN",
  "sa-IN",
  "sat-Olck-IN",
  "sd-Arab-IN",
  "ta-IN",
  "te-IN",
  "ur-IN",
] as const;

describe("Indian locale registry", () => {
  it("contains English plus all 22 constitutionally Scheduled languages", () => {
    expect(SUPPORTED_LOCALES).toEqual(expectedLocales);
    expect(Object.keys(localeRegistry)).toHaveLength(23);
    for (const locale of SUPPORTED_LOCALES) {
      expect(localeRegistry[locale].nativeName.trim()).not.toBe("");
      expect(localeRegistry[locale].englishName.trim()).not.toBe("");
    }
  });

  it("normalizes exact, base-language, case and underscore variants safely", () => {
    expect(normalizeLocale("HI_in")).toBe("hi-IN");
    expect(normalizeLocale("ks-IN")).toBe("ks-Arab-IN");
    expect(normalizeLocale("mni")).toBe("mni-Mtei-IN");
    expect(normalizeLocale("pa")).toBe("pa-Guru-IN");
    expect(normalizeLocale("en-US")).toBe("en-IN");
    expect(normalizeLocale("fr-FR")).toBeNull();
    expect(normalizeLocale("../../hi-IN")).toBeNull();
    expect(normalizeLocale("x".repeat(65))).toBeNull();
    expect(normalizeLocale(null)).toBeNull();
    expect(isSupportedLocale("hi-IN")).toBe(true);
    expect(isSupportedLocale("HI-IN")).toBe(false);
  });

  it("resolves weighted Accept-Language values and ignores unacceptable ones", () => {
    expect(resolveAcceptLanguage("fr-FR, ta-IN;q=0.8, hi;q=0.9")).toBe(
      "hi-IN",
    );
    expect(resolveAcceptLanguage("fr-FR, ur;q=0, bn;q=0.7")).toBe("bn-IN");
    expect(resolveAcceptLanguage("te;q=bogus, ml;q=0.5")).toBe("ml-IN");
    expect(resolveAcceptLanguage("*")).toBe(DEFAULT_LOCALE);
    expect(resolveAcceptLanguage("fr-FR")).toBeNull();
    expect(resolveAcceptLanguage("x".repeat(2049))).toBeNull();
  });

  it("uses explicit, cookie, profile, header and fallback precedence", () => {
    expect(
      resolveLocale({
        explicit: "ta",
        profile: "hi",
        cookie: "bn",
        acceptLanguage: "ur",
      }),
    ).toBe("ta-IN");
    expect(resolveLocale({ profile: "ml", cookie: "bn" })).toBe("bn-IN");
    expect(resolveLocale({ profile: "ml" })).toBe("ml-IN");
    expect(resolveLocale({ cookie: "as" })).toBe("as-IN");
    expect(resolveLocale({ acceptLanguage: "sd" })).toBe("sd-Arab-IN");
    expect(resolveLocale({ acceptLanguage: "fr" })).toBe(DEFAULT_LOCALE);
  });

  it("marks Arabic-script Kashmiri, Sindhi and Urdu as RTL", () => {
    expect(directionForLocale("ks")).toBe("rtl");
    expect(directionForLocale("sd")).toBe("rtl");
    expect(directionForLocale("ur")).toBe("rtl");
    expect(directionForLocale("pa")).toBe("ltr");
    expect(directionForLocale("not-supported")).toBe("ltr");
  });
});
