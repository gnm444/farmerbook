import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  buildUnifiedMarketplaceCatalog,
  type UnifiedMarketplaceItem,
} from "@/features/marketplace/unified-catalog";
import {
  UnifiedMarketplace,
  type UnifiedMarketplaceLabels,
} from "@/features/marketplace/unified-marketplace";

const labels: UnifiedMarketplaceLabels = {
  eyebrow: "Marketplace",
  title: "Find products",
  description: "One place",
  searchLabel: "Search products, farmers or categories",
  searchPlaceholder: "Search",
  categoryLabel: "Category",
  allCategories: "All categories",
  byProduct: "By product",
  bySeller: "By farmer / seller",
  resultCount: "{count} products",
  sellerCount: "{count} farmers / sellers",
  noResultsTitle: "No results",
  noResultsBody: "Try again",
  browse: "Browse",
  orderEnquiry: "Open order enquiry",
  priceOnRequest: "Price on request",
  externalStore: "Open seller store",
  reportedCatalogue: "Reported catalogue",
  liveListing: "Live listing",
  liveOffer: "Live offer",
  farmerBookStore: "FarmerBook enquiry",
  partnerStore: "Partner store",
  editorialCatalogue: "Editorial catalogue",
  disclosure: "Availability varies.",
};

describe("unified marketplace catalog", () => {
  it("indexes the existing seller and partner catalogues without making them live listings", () => {
    const items = buildUnifiedMarketplaceCatalog({ produceListings: [] });
    const vistaraku = items.find((item) => item.id === "vistaraku:buffet-plate-12");
    const avani = items.find((item) => item.name === "Cold Pressed Safflower Oil (1000 ml)");
    const editorial = items.find((item) => item.sellerName === "Sandeep Dasari");

    expect(items.filter((item) => item.source === "partner_store")).toHaveLength(29);
    expect(items.filter((item) => item.source === "farmerbook_store")).toHaveLength(25);
    expect(vistaraku).toMatchObject({
      source: "partner_store",
      availability: "enquiry",
      href: "/companies/vistaraku#shop",
      external: false,
    });
    expect(avani).toMatchObject({
      source: "farmerbook_store",
      availability: "enquiry",
      href: "/store/user_05605c17f44",
    });
    expect(editorial?.source).toBe("editorial_catalogue");
    expect(["reported", "external"]).toContain(editorial?.availability);
    expect(items.every((item) => item.id.includes(":"))).toBe(true);
  });
});

describe("UnifiedMarketplace", () => {
  const items: UnifiedMarketplaceItem[] = [
    {
      id: "partner:leaf-plate",
      name: "12 inch leaf plate",
      description: "Natural tableware",
      seller: { id: "vistaraku", name: "Vistaraku", kind: "brand", href: "/companies/vistaraku" },
      sellerName: "Vistaraku",
      category: "Tableware",
      categorySlug: "tableware",
      source: "partner_store",
      availability: "enquiry",
      href: "/companies/vistaraku#shop",
      external: false,
      image: null,
      imageAlt: "",
      price: null,
      priceLabel: null,
      searchText: "12 inch leaf plate natural tableware vistaraku",
      disclosure: "Confirm current details.",
      sourceUrls: [],
    },
    {
      id: "farmer:milk",
      name: "Organic A2 Gir Cow Milk",
      description: "Farmer catalogue",
      seller: { id: "avani", name: "Avani Van Farms", kind: "farmer", href: "/store/avani" },
      sellerName: "Avani Van Farms",
      category: "Dairy",
      categorySlug: "dairy",
      source: "farmerbook_store",
      availability: "enquiry",
      href: "/store/avani",
      external: false,
      image: null,
      imageAlt: "",
      price: null,
      priceLabel: "₹120 / packet",
      searchText: "organic a2 gir cow milk dairy avani van farms",
      disclosure: "Confirm current details.",
      sourceUrls: [],
    },
  ];

  it("groups sellers by default and searches products when switched", () => {
    render(<UnifiedMarketplace items={items} labels={labels} />);

    expect(screen.getByRole("heading", { name: "Vistaraku" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Avani Van Farms" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "By product" }));
    fireEvent.change(screen.getByRole("searchbox", { name: labels.searchLabel }), { target: { value: "milk" } });

    expect(screen.getByRole("heading", { name: "Organic A2 Gir Cow Milk" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "12 inch leaf plate" })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("1 products");
  });

  it("shows an accessible empty state for an unmatched search", () => {
    render(<UnifiedMarketplace items={items} labels={labels} />);
    fireEvent.click(screen.getByRole("button", { name: "By product" }));
    fireEvent.change(screen.getByRole("searchbox", { name: labels.searchLabel }), { target: { value: "unicorn" } });

    expect(screen.getByRole("heading", { name: "No results" })).toBeInTheDocument();
    expect(screen.getByText("Try again")).toBeInTheDocument();
  });
});
