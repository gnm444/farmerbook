import { readFileSync } from "node:fs";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  ECO_FRIENDLY_COMPANY_SECTOR_SLUGS,
  agricultureCompanySectorBySlug,
  hasEcoFriendlyCompanySector,
} from "@/lib/agriculture/company-sectors";
import { createOrganizationSchema } from "@/features/organizations/schemas";
import { createOfferSchema } from "@/features/offers/schemas";
import { CompanySectorOptions } from "@/features/organizations/company-sector-options";
import {
  ECO_FRIENDLY_SELLER_DECLARATION,
  EcoFriendlyClaimNotice,
} from "@/features/organizations/eco-friendly-claim-notice";

const migrationPath =
  "supabase/migrations/20260818123000_eco_friendly_product_catalog.sql";

describe("eco-friendly product onboarding", () => {
  it("provides concrete, selectable discovery sectors in the canonical catalog", () => {
    expect(ECO_FRIENDLY_COMPANY_SECTOR_SLUGS).toEqual([
      "solar-renewable-energy",
      "biodegradable-compostable-packaging",
      "compost-bio-inputs",
      "water-saving-irrigation-products",
      "reusable-repairable-farm-products",
    ]);

    for (const slug of ECO_FRIENDLY_COMPANY_SECTOR_SLUGS) {
      const sector = agricultureCompanySectorBySlug(slug);
      expect(sector).toMatchObject({
        slug,
        group: "eco-friendly-products",
        domain: "business_sector",
        selectable: true,
      });
      expect(sector?.offerExamples.length).toBeGreaterThan(0);
    }
    expect(hasEcoFriendlyCompanySector(["farm-tools-implements"])).toBe(false);
    expect(hasEcoFriendlyCompanySector(["compost-bio-inputs"])).toBe(true);
  });

  it("makes the seller-declared eco group available in the shared onboarding selector", () => {
    render(
      <select aria-label="Company sectors" multiple>
        <CompanySectorOptions />
      </select>,
    );

    const group = screen.getByRole("group", {
      name: "Eco-friendly products — seller-declared",
    });
    expect(group).toBeVisible();
    expect(
      screen.getByRole("option", {
        name: "Biodegradable and compostable packaging",
      }),
    ).toHaveValue("biodegradable-compostable-packaging");
    expect(
      screen.getByRole("option", {
        name: "Reusable and repairable farm products",
      }),
    ).toHaveValue("reusable-repairable-farm-products");
  });

  it("accepts an eco-friendly provider in the existing organization schema", () => {
    const result = createOrganizationSchema.parse({
      slug: "jal-mitra-products",
      displayName: "Jal Mitra Products",
      organizationType: "manufacturer_brand",
      description:
        "Water-saving irrigation products and reusable field equipment for small farms.",
      state: "Telangana",
      district: "Hyderabad",
      websiteUrl: "",
      sectorSlugs: [
        "water-saving-irrigation-products",
        "reusable-repairable-farm-products",
      ],
      serviceAreas: [{ state: "Telangana", district: "Hyderabad" }],
    });

    expect(result.sectorSlugs).toEqual([
      "water-saving-irrigation-products",
      "reusable-repairable-farm-products",
    ]);
  });

  it("accepts a concrete eco product in the existing business-offer schema", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-18T00:00:00Z"));
    try {
      const result = createOfferSchema.parse({
        organizationId: "2cb71437-cdf0-4551-a853-2617c8e76cc2",
        kind: "product",
        contentLocale: "en-IN",
        title: "Reusable harvest crates for farm collections",
        description:
          "Stackable and repairable harvest crates offered directly to farmer groups.",
        terms: "Seller will confirm material, reuse guidance and delivery before purchase.",
        categorySlugs: ["reusable-repairable-farm-products"],
        serviceAreas: [{ state: "Telangana", district: "Hyderabad" }],
        validFrom: "2026-08-18",
        validUntil: "2027-08-18",
        publicationIntent: "draft",
        priceModel: "quote",
      });

      expect(result.categorySlugs).toEqual([
        "reusable-repairable-farm-products",
      ]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("labels eco-friendly as seller-declared and never as certified", () => {
    const { rerender } = render(
      <EcoFriendlyClaimNotice sectorSlugs={["compost-bio-inputs"]} />,
    );

    expect(
      screen.getByText("Seller-declared eco-friendly category"),
    ).toBeVisible();
    expect(screen.getByText(ECO_FRIENDLY_SELLER_DECLARATION)).toBeVisible();
    expect(screen.queryByText(/^certified eco-friendly$/i)).not.toBeInTheDocument();

    rerender(<EcoFriendlyClaimNotice sectorSlugs={["farm-tools-implements"]} />);
    expect(
      screen.queryByText("Seller-declared eco-friendly category"),
    ).not.toBeInTheDocument();
  });

  it("adds taxonomy rows without activating staged company or offer releases", () => {
    const sql = readFileSync(migrationPath, "utf8").toLocaleLowerCase("en-IN");

    expect(sql).toContain("'eco-friendly-products', null, 'business_sector'");
    expect(sql).toMatch(
      /'eco-friendly-products', null, 'business_sector',[\s\S]*?'agriculture\.companysectors\.eco-friendly-products', false/,
    );
    for (const slug of ECO_FRIENDLY_COMPANY_SECTOR_SLUGS.slice(1)) {
      expect(sql).toContain(`'${slug}'`);
    }
    expect(sql).toContain("set parent_slug = 'eco-friendly-products'");
    expect(sql).not.toMatch(/update\s+public\.ecosystem_release_controls/);
    expect(sql).not.toMatch(/insert\s+into\s+public\.ecosystem_release_controls/);
  });

  it("renders the disclosure on onboarding and public eco claim surfaces", () => {
    for (const filePath of [
      "features/organizations/organization-create-form.tsx",
      "features/onboarding/onboarding-flow.tsx",
      "features/offers/offer-create-form.tsx",
      "features/organizations/organization-card.tsx",
      "features/offers/offer-card.tsx",
      "app/companies/[slug]/page.tsx",
      "app/offers/[offerId]/page.tsx",
    ]) {
      expect(readFileSync(filePath, "utf8")).toContain(
        "<EcoFriendlyClaimNotice",
      );
    }
  });
});
