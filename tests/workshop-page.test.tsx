import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  locale: "en-IN",
  enabled: vi.fn(() => true),
  closed: vi.fn(() => false),
  notFound: vi.fn(() => { throw new Error("NOT_FOUND"); }),
}));

vi.mock("@/lib/feature-flags", () => ({ isFeatureEnabled: mocks.enabled }));
vi.mock("@/features/workshops/registration-contracts", () => ({
  isWorkshopRegistrationClosed: mocks.closed,
}));
vi.mock("@/lib/i18n", () => ({
  getServerI18n: vi.fn(async () => ({ locale: mocks.locale })),
}));
vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));
vi.mock("@/components/public-header", () => ({ PublicHeader: () => <header>Header</header> }));
vi.mock("@/components/public-footer", () => ({ PublicFooter: () => <footer>Footer</footer> }));
vi.mock("@/features/workshops/workshop-registration-form", () => ({
  WorkshopRegistrationForm: () => <div>Registration form</div>,
}));

import HariBabuWorkshopPage, { generateMetadata } from "@/app/workshops/hari-babu-2026/page";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.locale = "en-IN";
  mocks.enabled.mockReturnValue(true);
  mocks.closed.mockReturnValue(false);
});

describe("Hari Babu workshop page", () => {
  it("shows the approved date, broad location, language-matched poster and QR", async () => {
    mocks.locale = "te-IN";
    const html = renderToStaticMarkup(await HariBabuWorkshopPage());
    expect(html).toContain("lang=\"te-IN\"");
    expect(html).toContain("23 డిసెంబర్ 2026");
    expect(html).toContain("తెలంగాణలో హరి బాబు గారి పొలం");
    expect(html).toContain("hari-babu-workshop-2026-telugu.png");
    expect(html).toContain("registration-qr.png");
    expect(html).toContain("download=\"\"");
    expect(html).not.toContain("seat");
  });

  it("uses Hindi metadata and canonical route", async () => {
    mocks.locale = "hi-IN";
    await expect(generateMetadata()).resolves.toMatchObject({
      title: "सुखवासी हरि बाबू प्राकृतिक किसान कार्यशाला",
      alternates: { canonical: "/workshops/hari-babu-2026" },
      openGraph: { images: ["/images/workshops/hari-babu-2026/hari-babu-workshop-2026-hindi.png"] },
    });
  });

  it("shows the localized close and private retention notice after the cutoff", async () => {
    mocks.locale = "te-IN";
    mocks.closed.mockReturnValue(true);
    const html = renderToStaticMarkup(await HariBabuWorkshopPage());
    expect(html).toContain("నమోదు ముగిసింది");
    expect(html).toContain("24 మార్చి 2027");
    expect(html).toContain('href="/data-deletion"');
    expect(html).toContain('href="mailto:ceo@farmerbook.in"');
    expect(html).not.toContain("Registration form");
  });

  it("states workshop-only use and the purge date in English and Hindi", async () => {
    for (const [locale, expected] of [
      ["en-IN", "automatically deleted on 24 March 2027"],
      ["hi-IN", "24 मार्च 2027"],
    ]) {
      mocks.locale = locale;
      const html = renderToStaticMarkup(await HariBabuWorkshopPage());
      expect(html).toContain(expected);
      expect(html).toContain('href="/data-deletion"');
    }
  });

  it("hides the route when the release flag is disabled", async () => {
    mocks.enabled.mockReturnValue(false);
    await expect(HariBabuWorkshopPage()).rejects.toThrow("NOT_FOUND");
    expect(mocks.notFound).toHaveBeenCalledOnce();
  });
});
