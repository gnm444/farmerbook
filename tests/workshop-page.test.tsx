import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  locale: "en-IN",
  enabled: vi.fn(() => true),
  notFound: vi.fn(() => { throw new Error("NOT_FOUND"); }),
}));

vi.mock("@/lib/feature-flags", () => ({ isFeatureEnabled: mocks.enabled }));
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

  it("hides the route when the release flag is disabled", async () => {
    mocks.enabled.mockReturnValue(false);
    await expect(HariBabuWorkshopPage()).rejects.toThrow("NOT_FOUND");
    expect(mocks.notFound).toHaveBeenCalledOnce();
  });
});
