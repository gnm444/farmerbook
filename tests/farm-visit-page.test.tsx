import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import englishMessages from "@/lib/i18n/messages/en-IN";

const mocks = vi.hoisted(() => ({
  enabled: vi.fn(() => true),
  notFound: vi.fn(() => { throw new Error("NOT_FOUND"); }),
}));

vi.mock("@/lib/feature-flags", () => ({ isFeatureEnabled: mocks.enabled }));
vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));
vi.mock("@/lib/i18n", () => ({
  getServerTranslations: vi.fn(async () => ({
    locale: "en-IN",
    t: (name: keyof typeof englishMessages.farmVisits) => englishMessages.farmVisits[name],
  })),
}));
vi.mock("@/components/public-header", () => ({ PublicHeader: () => <header>Header</header> }));
vi.mock("@/components/public-footer", () => ({ PublicFooter: () => <footer>Footer</footer> }));
vi.mock("@/features/farm-visits/farm-visit-request-gate", () => ({
  FarmVisitRequestGate: () => <div data-testid="request-gate">Customer request gate</div>,
}));

import FarmVisitsPage, { generateMetadata } from "@/app/farm-visits/page";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.enabled.mockReturnValue(true);
});

describe("Farm Visits public page", () => {
  it("renders the approved video without autoplay and explains confirmation boundaries", async () => {
    const html = renderToStaticMarkup(await FarmVisitsPage());
    expect(html).toContain("Meet farming where it happens");
    expect(html).toContain("organic-farm-visit.mp4");
    expect(html).toContain("organic-farm-visit-poster.webp");
    expect(html).toContain("controls");
    expect(html).toContain("playsInline");
    expect(html).not.toContain("autoplay");
    expect(html).toContain("The Farmer must be willing and available");
    expect(html).toContain("not organic certification");
    expect(html).toContain("Customer request gate");
  });

  it("publishes canonical metadata", async () => {
    await expect(generateMetadata()).resolves.toMatchObject({
      title: "Request a farm visit",
      alternates: { canonical: "/farm-visits" },
    });
  });

  it("returns not found while the release flag is disabled", async () => {
    mocks.enabled.mockReturnValue(false);
    await expect(FarmVisitsPage()).rejects.toThrow("NOT_FOUND");
    expect(mocks.notFound).toHaveBeenCalledOnce();
  });
});
