import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  locale: "en-IN",
  workshopEnabled: true,
}));

vi.mock("@/lib/feature-flags", () => ({
  isFeatureEnabled: (name: string) => name === "ENABLE_HARI_BABU_WORKSHOP" && mocks.workshopEnabled,
}));
vi.mock("@/lib/i18n", () => ({
  getServerI18n: vi.fn(async () => ({
    locale: mocks.locale,
    t: (key: string) => key,
  })),
}));
vi.mock("@/components/public-header", () => ({ PublicHeader: () => <header>Header</header> }));
vi.mock("@/components/public-footer", () => ({ PublicFooter: () => <footer>Footer</footer> }));
vi.mock("@/features/marketplace/unified-catalog-loader", () => ({
  loadUnifiedMarketplaceCatalog: vi.fn(async () => []),
}));
vi.mock("@/features/marketplace/unified-marketplace", () => ({
  UnifiedMarketplace: () => <div>Marketplace</div>,
}));

import LandingPage from "@/app/page";

beforeEach(() => {
  mocks.locale = "en-IN";
  mocks.workshopEnabled = true;
});

describe("workshop home discovery", () => {
  it("shows a Hindi workshop link and matching poster when enabled", async () => {
    mocks.locale = "hi-IN";
    const html = renderToStaticMarkup(await LandingPage());
    expect(html).toContain("सुखवासी हरि बाबू के साथ प्राकृतिक किसानों की कार्यशाला");
    expect(html).toContain('href="/workshops/hari-babu-2026"');
    expect(html).toContain("hari-babu-workshop-2026-hindi.png");
  });

  it("removes the workshop promotion when disabled", async () => {
    mocks.workshopEnabled = false;
    const html = renderToStaticMarkup(await LandingPage());
    expect(html).not.toContain('href="/workshops/hari-babu-2026"');
  });
});
