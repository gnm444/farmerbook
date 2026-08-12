import { describe, expect, it } from "vitest";
import {
  SUPPORTED_LOCALES,
  createTranslator,
  englishMessages,
  interpolateMessage,
  loadMessages,
  messageFor,
  type Messages,
} from "@/lib/i18n";

function flatten(value: object, prefix = ""): Record<string, string> {
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, child]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      return typeof child === "string"
        ? [[path, child]]
        : Object.entries(flatten(child, path));
    }),
  );
}

describe("localized message catalogs", () => {
  it("loads every locale lazily with exact, nonempty English catalog parity", async () => {
    const expectedKeys = Object.keys(flatten(englishMessages)).sort();
    expect(expectedKeys.length).toBeGreaterThan(60);

    for (const locale of SUPPORTED_LOCALES) {
      const catalog = await loadMessages(locale);
      const entries = flatten(catalog);
      expect(Object.keys(entries).sort(), locale).toEqual(expectedKeys);
      for (const [key, value] of Object.entries(entries)) {
        expect(value.trim(), `${locale}:${key}`).not.toBe("");
      }
    }
  });

  it("falls back to English without constructing an import path from input", async () => {
    await expect(loadMessages("../../untrusted-module")).resolves.toEqual(
      englishMessages,
    );
    await expect(loadMessages("fr-FR")).resolves.toEqual(englishMessages);
  });

  it("interpolates only named text placeholders and preserves missing values", () => {
    expect(
      interpolateMessage("Step {current} of {total}", {
        current: 2,
        total: 5,
      }),
    ).toBe("Step 2 of 5");
    expect(interpolateMessage("Hello {name}; {missing}", { name: "<Farmer>" })).toBe(
      "Hello <Farmer>; {missing}",
    );
    expect(interpolateMessage("{constructor}", { constructor: "unsafe" })).toBe(
      "unsafe",
    );
  });

  it("provides typed full and namespaced translation access", async () => {
    const messages = (await loadMessages("hi")) as Messages;
    const translate = createTranslator(messages);
    expect(translate("onboarding.progress", { current: 1, total: 7 })).toContain(
      "1",
    );
    expect(messageFor(messages, "common.continue")).toBe("आगे बढ़ें");
  });
});
