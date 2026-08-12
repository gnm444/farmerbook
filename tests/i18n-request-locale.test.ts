import { describe, expect, it } from "vitest";
import { DEFAULT_LOCALE, getRequestLocale } from "@/lib/i18n";

describe("request locale resolution", () => {
  it("honours explicit, cookie, profile, header and English precedence", () => {
    expect(
      getRequestLocale({
        explicit: "ta",
        profile: "hi",
        cookie: "bn",
        acceptLanguage: "ur",
      }),
    ).toBe("ta-IN");
    expect(
      getRequestLocale({
        explicit: "fr",
        profile: "ml",
        cookie: "bn",
        acceptLanguage: "ur",
      }),
    ).toBe("bn-IN");
    expect(
      getRequestLocale({ profile: "fr", cookie: "as", acceptLanguage: "ur" }),
    ).toBe("as-IN");
    expect(
      getRequestLocale({ cookie: "fr", acceptLanguage: "sd;q=0.9, hi;q=0.5" }),
    ).toBe("sd-Arab-IN");
    expect(getRequestLocale({ acceptLanguage: "fr-FR" })).toBe(DEFAULT_LOCALE);
    expect(getRequestLocale()).toBe(DEFAULT_LOCALE);
  });

  it("normalizes injected locale variants without framework request objects", () => {
    expect(getRequestLocale({ explicit: "KS_in" })).toBe("ks-Arab-IN");
    expect(getRequestLocale({ profile: "mni" })).toBe("mni-Mtei-IN");
    expect(getRequestLocale({ cookie: "PA_in" })).toBe("pa-Guru-IN");
  });
});
