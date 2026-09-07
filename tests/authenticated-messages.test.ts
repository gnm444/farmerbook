import { describe, expect, it } from "vitest";
import {
  authenticatedMessageSections,
  authenticatedMessages,
  getAuthenticatedMessages,
} from "@/lib/i18n/authenticated-messages";
import { SUPPORTED_LOCALES } from "@/lib/i18n/locales";

describe("authenticated interface messages", () => {
  it("covers every exposed locale with every required nonempty key", () => {
    expect(Object.keys(authenticatedMessages)).toEqual(SUPPORTED_LOCALES);

    for (const locale of SUPPORTED_LOCALES) {
      const messages = authenticatedMessages[locale];
      for (const [section, keys] of Object.entries(authenticatedMessageSections)) {
        expect(Object.keys(messages[section as keyof typeof authenticatedMessageSections]), locale)
          .toEqual(keys);
      }
      for (const value of [
        ...Object.values(messages.navigation),
        ...Object.values(messages.network),
        ...Object.values(messages.discover),
        messages.betaDisclosure,
      ]) {
        expect(value.trim(), locale).not.toBe("");
      }
    }
  });

  it("does not silently reuse English for representative authenticated copy", () => {
    const english = authenticatedMessages["en-IN"];
    for (const locale of SUPPORTED_LOCALES.slice(1)) {
      const messages = authenticatedMessages[locale];
      expect(messages.navigation.feed, locale).not.toBe(english.navigation.feed);
      expect(messages.navigation.produceMarket, locale).not.toBe(
        english.navigation.produceMarket,
      );
      expect(messages.network.title, locale).not.toBe(english.network.title);
      expect(messages.network.findPeople, locale).not.toBe(english.network.findPeople);
      expect(messages.discover.title, locale).not.toBe(english.discover.title);
      expect(messages.betaDisclosure, locale).not.toBe(english.betaDisclosure);
    }
  });

  it("falls back safely for unknown or malformed locale input", () => {
    expect(getAuthenticatedMessages("fr-FR")).toBe(authenticatedMessages["en-IN"]);
    expect(getAuthenticatedMessages("../../te-IN")).toBe(
      authenticatedMessages["en-IN"],
    );
  });
});
