import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  locale: "te-IN",
  workshopEnabled: true,
}));

vi.mock("@/lib/feature-flags", () => ({
  isFeatureEnabled: (name: string) => name === "ENABLE_HARI_BABU_WORKSHOP" && mocks.workshopEnabled,
}));
vi.mock("@/lib/i18n", () => ({
  getServerTranslations: vi.fn(async () => ({
    locale: mocks.locale,
    t: (key: string) => key,
  })),
}));
vi.mock("@/components/language-selector", () => ({ LanguageSelector: () => <span>Language</span> }));
vi.mock("@/components/ui", () => ({ Brand: () => <span>FarmerBook</span> }));

import { PublicHeader } from "@/components/public-header";

beforeEach(() => {
  mocks.locale = "te-IN";
  mocks.workshopEnabled = true;
});

describe("public workshop navigation", () => {
  it("links to the same route in the visitor's language", async () => {
    const html = renderToStaticMarkup(await PublicHeader());
    expect(html).toContain('href="/workshops/hari-babu-2026"');
    expect(html).toContain("రైతుల వర్క్‌షాప్");
  });

  it("hides the link while the workshop flag is off", async () => {
    mocks.workshopEnabled = false;
    const html = renderToStaticMarkup(await PublicHeader());
    expect(html).not.toContain('href="/workshops/hari-babu-2026"');
  });
});
