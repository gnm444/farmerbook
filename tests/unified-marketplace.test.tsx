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
  byCategory: "By food category",
  resultCount: "{count} products",
  sellerCount: "{count} farmers / sellers",
  categoryCount: "{count} food & product categories",
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

  const equipmentOffer: UnifiedMarketplaceItem = {
    id: "offer:equipment",
    name: "Tractor implements",
    description: "A published equipment offer",
    seller: { id: "supplier", name: "Farm Supplier", kind: "organization", href: "/companies/supplier" },
    sellerName: "Farm Supplier",
    category: "Equipment",
    categorySlug: "equipment",
    source: "live_offer",
    availability: "enquiry",
    href: "/offers/equipment",
    external: false,
    image: null,
    imageAlt: "",
    price: null,
    priceLabel: null,
    searchText: "tractor implements equipment farm supplier",
    disclosure: "Confirm current details.",
    sourceUrls: [],
  };

  const categoryEdgeItems: UnifiedMarketplaceItem[] = [
    {
      ...equipmentOffer,
      id: "reported:brinjal",
      name: "Purple Long Brinjal",
      category: "Brinjal Eggplant",
      categorySlug: "brinjal-eggplant",
      searchText: "purple long brinjal eggplant farm supplier",
    },
    {
      ...equipmentOffer,
      id: "reported:coconut-oil",
      name: "Coconut Oil",
      category: "On Farm Processing",
      categorySlug: "on-farm-processing",
      searchText: "coconut oil on farm processing farm supplier",
    },
    {
      ...equipmentOffer,
      id: "offer:soil-testing",
      name: "Soil testing",
      category: "Soil Testing Service",
      categorySlug: "soil-testing-service",
      searchText: "soil testing service farm supplier",
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

  it("keeps Vistaraku first and lets buyers browse food and product categories", () => {
    render(<UnifiedMarketplace items={[equipmentOffer, ...categoryEdgeItems, ...items].reverse()} labels={labels} />);

    const sellerHeadings = screen.getAllByRole("heading", { level: 3 });
    expect(sellerHeadings[0]).toHaveTextContent("Vistaraku");

    fireEvent.click(screen.getByRole("button", { name: "By product" }));
    expect(screen.getAllByRole("heading", { level: 3 })[0]).toHaveTextContent("12 inch leaf plate");

    fireEvent.click(screen.getByRole("button", { name: "By food category" }));
    expect(screen.getByRole("heading", { name: "Dairy & ghee" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Natural tableware" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Vegetables & herbs" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Oils & oilseeds" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Farm services" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Other food & farm products" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Poultry & eggs" })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("6 food & product categories");

    fireEvent.click(screen.getByRole("button", { name: "Browse Dairy & ghee" }));
    expect(screen.getByRole("heading", { name: "Organic A2 Gir Cow Milk" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "12 inch leaf plate" })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("1 products");
    expect(screen.getByText("Dairy & ghee", { selector: "strong" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "By farmer / seller" }));
    expect(screen.getByRole("status")).toHaveTextContent("3 farmers / sellers");
    expect(screen.getAllByRole("heading", { level: 3 })[0]).toHaveTextContent("Vistaraku");
    expect(screen.queryByText("Dairy & ghee", { selector: "strong" })).not.toBeInTheDocument();
  });

  it("shows an accessible empty state for an unmatched search", () => {
    render(<UnifiedMarketplace items={items} labels={labels} />);
    fireEvent.click(screen.getByRole("button", { name: "By product" }));
    fireEvent.change(screen.getByRole("searchbox", { name: labels.searchLabel }), { target: { value: "unicorn" } });

    expect(screen.getByRole("heading", { name: "No results" })).toBeInTheDocument();
    expect(screen.getByText("Try again")).toBeInTheDocument();
  });

  it("frames the home-page plate callout without making a cancer-prevention claim", () => {
    render(
      <UnifiedMarketplace
        items={items}
        labels={labels}
        plateAwareness={{
          eyebrow: "Plate awareness",
          title: "“Cancer plate?” Check the evidence.",
          body: "Do not call a plate cancer-causing without material-specific evidence.",
          note: "Natural leaf plates are not a cancer-prevention claim.",
          pledgeCta: "Pledge against plastic plates",
          cta: "See Vistaraku leaf plates",
          evidence: "Read food-contact guidance",
          evidenceHref: "https://example.com/guidance",
          guidance: "Read packaging rules",
          guidanceHref: "https://example.com/rules",
          imageAlt: "Natural leaf plate",
        }}
      />,
    );

    const calloutHeading = screen.getByRole("heading", { name: "“Cancer plate?” Check the evidence." });
    expect(calloutHeading).toBeInTheDocument();
    expect(calloutHeading.compareDocumentPosition(screen.getByRole("status")) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    expect(screen.getByText("Natural leaf plates are not a cancer-prevention claim.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Pledge against plastic plates/ })).toHaveAttribute("href", "/pledge");
    expect(screen.getByRole("link", { name: /See Vistaraku leaf plates/ })).toHaveAttribute("href", "/companies/vistaraku#shop");
    expect(screen.getByRole("link", { name: /Read food-contact guidance/ })).toHaveAttribute("href", "https://example.com/guidance");
    expect(screen.getByRole("link", { name: /Read packaging rules/ })).toHaveAttribute("href", "https://example.com/rules");
  });
});
