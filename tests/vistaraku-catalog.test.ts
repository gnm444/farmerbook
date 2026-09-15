import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  VISTARAKU_CATALOG_REVIEWED_AT,
  VISTARAKU_PARTNER,
  VISTARAKU_PRODUCTS,
  findVistarakuProduct,
} from "@/features/vistaraku/catalog";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Vistaraku reviewed catalog", () => {
  it("contains 22 uniquely addressable products from eight manufacturer pages", () => {
    expect(VISTARAKU_PRODUCTS).toHaveLength(22);
    expect(new Set(VISTARAKU_PRODUCTS.map((product) => product.slug)).size).toBe(22);
    expect(new Set(VISTARAKU_PRODUCTS.map((product) => product.sourceUrl))).toEqual(new Set([
      "https://www.vistaraku.co.in/lunch",
      "https://www.vistaraku.co.in/compartment",
      "https://www.vistaraku.co.in/breakfast",
      "https://www.vistaraku.co.in/snack",
      "https://www.vistaraku.co.in/bowls",
      "https://www.vistaraku.co.in/boxes",
      "https://www.vistaraku.co.in/cutlery",
      "https://www.vistaraku.co.in/cups",
    ]));
  });

  it("keeps each listing source-linked while leaving image rights with the manufacturer", () => {
    for (const product of VISTARAKU_PRODUCTS) {
      const sourceUrl = new URL(product.sourceUrl);
      expect(sourceUrl.origin).toBe("https://www.vistaraku.co.in");
      expect(product.packQuantity).toBeGreaterThan(0);
      expect(product.sourceReviewedAt).toBe(VISTARAKU_CATALOG_REVIEWED_AT);
      expect(Object.isFrozen(product)).toBe(true);
    }
  });

  it("preserves published values and makes unknown quantities explicit", () => {
    expect(findVistarakuProduct("rice-straws")?.minimumOrderQuantity).toBe(25_000);
    expect(findVistarakuProduct("500ml-food-box")?.minimumOrderQuantity).toBe(250);
    expect(findVistarakuProduct("7-inch-square-snack-plate")?.minimumOrderQuantity).toBeNull();
    expect(findVistarakuProduct("4-inch-square-bowl")?.minimumOrderNote).toContain("to be decided");
    expect(findVistarakuProduct("not-a-product")).toBeNull();
  });

  it("labels the public-source review without claiming marketplace verification", () => {
    expect(VISTARAKU_PARTNER).toMatchObject({
      name: "Vistaraku",
      kind: "Manufacturer brand",
      reviewedAt: "2026-09-15",
    });
  });

  it("keeps the catalog route public, responsive, and free of intake or image-provider imports", () => {
    const page = read("app/companies/vistaraku/page.tsx");
    const css = read("features/vistaraku/vistaraku.module.css");
    const sitemap = read("app/sitemap.ts");

    expect(page).toContain('alternates: { canonical: "/companies/vistaraku" }');
    expect(page).toContain("Private intake remains closed");
    expect(page).toContain("FarmerBook does not copy or host product imagery");
    expect(sitemap).toContain('"/companies/vistaraku"');
    expect(css).toContain(".storyCatalogGrid { display: grid;");
    expect(css).toContain(".storyCatalogGrid { grid-template-columns: 1fr;");
    for (const forbiddenImport of [
      "@/features/vistaraku/actions",
      "@/features/vistaraku/configuration",
      "@/features/vistaraku/vistaraku-forms",
      "@/lib/supabase",
      'from "next/image"',
      "static.wixstatic.com",
    ]) {
      expect(page).not.toContain(forbiddenImport);
    }
    expect(page.toLowerCase()).not.toContain("turnstile");
    expect(page).toContain("no material has zero impact");
    expect(page.toLowerCase()).not.toContain("disease prevention");
    expect(page.toLowerCase()).not.toContain("carbon neutral");
  });
});
