import {
  getCuratedPublishedFeaturedFarmerPublications,
  type FeaturedFarmerPublication,
} from "@/features/featured-farmers/queries";
import type { BusinessOffer, OfferPrice } from "@/features/offers/types";
import {
  getPublicStorefrontCatalog,
  type PublicStorefrontProduct,
} from "@/features/marketplace/public-storefront-catalog";
import {
  formatINR,
  packPrice,
  storePrice,
  VISTARAKU_STORE_PRODUCTS,
  type VistarakuStoreProduct,
} from "@/features/vistaraku/store-products";
import type { ProduceListing } from "@/lib/types";

const AVANI_STOREFRONT_HANDLE = "user_05605c17f44";

export const UNIFIED_MARKETPLACE_SOURCES = [
  "live_listing",
  "live_offer",
  "farmerbook_store",
  "partner_store",
  "editorial_catalogue",
] as const;

export type UnifiedMarketplaceSource =
  (typeof UNIFIED_MARKETPLACE_SOURCES)[number];

export type UnifiedMarketplaceAvailability =
  | "live"
  | "enquiry"
  | "external"
  | "reported";

export type UnifiedMarketplaceSeller = Readonly<{
  id: string;
  name: string;
  kind: "farmer" | "organization" | "brand" | "editorial_subject";
  slug?: string;
  href?: string;
}>;

export type UnifiedMarketplacePrice = Readonly<{
  model: "fixed" | "range" | "quote" | "free" | "subsidized" | "reported";
  label: string;
  currency?: "INR";
  amount?: number;
  minimum?: number;
  maximum?: number;
  unit?: string;
  packQuantity?: number;
  packAmount?: number;
}>;

/**
 * A presentation-neutral marketplace record. `availability` is deliberately
 * separate from `source`: editorial products remain reported even when their
 * link leads to an external seller page.
 */
export type UnifiedMarketplaceItem = Readonly<{
  id: string;
  name: string;
  description: string;
  seller: UnifiedMarketplaceSeller;
  sellerName: string;
  category: string;
  categorySlug: string;
  source: UnifiedMarketplaceSource;
  availability: UnifiedMarketplaceAvailability;
  href: string;
  external: boolean;
  image: string | null;
  imageAlt: string;
  imageVariant?: ProduceListing["imageVariant"];
  price: UnifiedMarketplacePrice | null;
  priceLabel: string | null;
  searchText: string;
  disclosure: string;
  sourceUrls: readonly string[];
}>;

export type UnifiedMarketplaceCatalogInput = Readonly<{
  produceListings: readonly ProduceListing[];
  businessOffers?: readonly BusinessOffer[];
}>;

type SearchPart = string | number | null | undefined | readonly string[];

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";
}

function humanizeSlug(value: string) {
  return value
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function searchText(...parts: SearchPart[]) {
  const values = parts.flatMap((part) =>
    Array.isArray(part) ? part : part == null ? [] : [String(part)],
  );
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
    .join(" ")
    .normalize("NFKC")
    .toLocaleLowerCase("en-IN");
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value);
}

function produceImage(listing: ProduceListing) {
  const srcByVariant: Record<ProduceListing["imageVariant"], string> = {
    "tomato-crates": "/images/marketplace/tomato-crates.webp",
    "grape-vines": "/images/marketplace/grape-vines.webp",
    "onion-sacks": "/images/marketplace/onion-sacks.webp",
    "okra-basket": "/images/marketplace/okra-basket.webp",
  };
  return {
    src: srcByVariant[listing.imageVariant],
    alt: `${listing.title} offered by ${listing.seller?.fullName ?? "a FarmerBook seller"}`,
    variant: listing.imageVariant,
  };
}

export function adaptProduceListings(
  listings: readonly ProduceListing[],
): UnifiedMarketplaceItem[] {
  return listings
    .filter((listing) => listing.status === "active")
    .map((listing) => {
      const sellerName = listing.seller?.fullName ?? "FarmerBook seller";
      const sellerHref = listing.seller?.handle
        ? `/store/${listing.seller.handle}`
        : undefined;
      const priceLabel = `${formatCurrency(listing.price)} / ${listing.priceUnit}`;
      const categoryLabel = listing.crop || "Farm produce";
      const disclosure =
        "Live FarmerBook produce listing. Confirm current quantity, grade, delivery, final price and payment with the seller.";

      return {
        id: `produce:${listing.id}`,
        name: listing.title,
        description: listing.description,
        seller: {
          id: listing.sellerId,
          name: sellerName,
          kind: "farmer" as const,
          ...(listing.seller?.handle ? { slug: listing.seller.handle } : {}),
          ...(sellerHref ? { href: sellerHref } : {}),
        },
        sellerName,
        category: categoryLabel,
        categorySlug: slugify(listing.crop),
        source: "live_listing" as const,
        availability: "live" as const,
        href: `/marketplace/${listing.id}`,
        external: false,
        image: produceImage(listing).src,
        imageAlt: produceImage(listing).alt,
        imageVariant: listing.imageVariant,
        price: {
          model: "fixed" as const,
          label: priceLabel,
          currency: "INR" as const,
          amount: listing.price,
          unit: listing.priceUnit,
        },
        priceLabel,
        searchText: searchText(
          listing.title,
          listing.description,
          listing.crop,
          listing.variety,
          listing.grade,
          listing.certifications,
          listing.deliveryOptions,
          sellerName,
          listing.seller?.district,
          listing.seller?.state,
          priceLabel,
        ),
        disclosure,
        sourceUrls: [],
      } satisfies UnifiedMarketplaceItem;
    });
}

function adaptAvaniProduct(
  product: PublicStorefrontProduct,
  catalog: NonNullable<ReturnType<typeof getPublicStorefrontCatalog>>,
): UnifiedMarketplaceItem {
  const sellerName = "Avani Van Farms";
  const href = `/store/${AVANI_STOREFRONT_HANDLE}`;
  return {
    id: `avani:${slugify(`${product.category}-${product.name}`)}`,
    name: product.name,
    description: product.description,
    seller: {
      id: AVANI_STOREFRONT_HANDLE,
      name: sellerName,
      kind: "farmer",
      slug: AVANI_STOREFRONT_HANDLE,
      href,
    },
    sellerName,
    category: product.category,
    categorySlug: slugify(product.category),
    source: "farmerbook_store",
    availability: "enquiry",
    href,
    external: false,
    image: null,
    imageAlt: "",
    price: product.priceLabel
      ? { model: "reported", label: product.priceLabel }
      : null,
    priceLabel: product.priceLabel ?? null,
    searchText: searchText(
      product.name,
      product.category,
      product.description,
      product.priceLabel,
      sellerName,
      catalog.title,
      catalog.intro,
    ),
    disclosure: catalog.note,
    sourceUrls: [catalog.sourceUrl],
  };
}

export function adaptAvaniPublicStorefrontCatalog(): UnifiedMarketplaceItem[] {
  const catalog = getPublicStorefrontCatalog(AVANI_STOREFRONT_HANDLE);
  if (!catalog) return [];
  return catalog.products.map((product) => adaptAvaniProduct(product, catalog));
}

function adaptVistarakuProduct(
  product: VistarakuStoreProduct,
): UnifiedMarketplaceItem {
  const unitAmount = storePrice(product);
  const packAmount = packPrice(product);
  const priceLabel = `${formatINR(unitAmount)} / ${product.unitLabel}`;
  const disclosure =
    "Vistaraku order enquiry. The displayed markup is included; Vistaraku confirms stock, GST, freight, delivery, final price and payment before an order is accepted.";
  return {
    id: `vistaraku:${product.slug}`,
    name: product.name,
    description: [
      `${product.category}; sold in packs of ${product.packQuantity}.`,
      product.note,
      product.gstNote,
    ]
      .filter(Boolean)
      .join(" "),
    seller: {
      id: "vistaraku",
      name: "Vistaraku",
      kind: "brand",
      slug: "vistaraku",
      href: "/companies/vistaraku",
    },
    sellerName: "Vistaraku",
    category: product.category,
    categorySlug: slugify(product.category),
    source: "partner_store",
    availability: "enquiry",
    href: "/companies/vistaraku#shop",
    external: false,
    image: product.image,
    imageAlt: product.imageAlt,
    price: {
      model: "fixed",
      label: priceLabel,
      currency: "INR",
      amount: unitAmount,
      unit: product.unitLabel,
      packQuantity: product.packQuantity,
      packAmount,
    },
    priceLabel,
    searchText: searchText(
      product.name,
      product.category,
      product.note,
      product.gstNote,
      product.unitLabel,
      product.packQuantity,
      priceLabel,
      "Vistaraku natural leaf tableware",
    ),
    disclosure,
    sourceUrls: ["https://www.vistaraku.co.in/"],
  };
}

export function adaptVistarakuProducts(): UnifiedMarketplaceItem[] {
  return VISTARAKU_STORE_PRODUCTS.map(adaptVistarakuProduct);
}

function publicationImage(publication: FeaturedFarmerPublication) {
  const image =
    publication.snapshot.sourceHostedPreview ?? publication.snapshot.media;
  return image
    ? {
        src: image.assetUrl,
        alt: image.altText,
      }
    : null;
}

export function adaptFeaturedFarmerReportedProducts(
  publications: readonly FeaturedFarmerPublication[] =
    getCuratedPublishedFeaturedFarmerPublications(),
): UnifiedMarketplaceItem[] {
  return publications
    .filter((publication) => publication.publication_status !== "preview")
    .flatMap((publication) => {
      const profileHref = `/featured-farmers/${publication.slug}`;
      const image = publicationImage(publication);
      return (publication.snapshot.reportedProducts ?? []).map((product) => {
        const external = Boolean(product.productUrl);
        const href = product.productUrl ?? profileHref;
        const disclosure = external
          ? "Reported from cited public sources; not a live FarmerBook listing. This link opens an external seller page. Confirm current stock, price, delivery, certification and food-business registration with the seller."
          : "Reported from cited public sources; not a live FarmerBook listing or order page. Current stock, price, delivery, certification and food-business registration have not been independently confirmed.";
        const price = product.price
          ? ({ model: "reported", label: product.price } as const)
          : null;

        return {
          id: `reported:${publication.slug}:${slugify(`${product.categorySlug}-${product.name}`)}`,
          name: product.name,
          description: [
            `Reported product from ${publication.snapshot.fullName}'s editorial profile.`,
            product.packSizes?.length
              ? `Reported pack sizes: ${product.packSizes.join(", ")}.`
              : undefined,
          ]
            .filter(Boolean)
            .join(" "),
          seller: {
            id: publication.publication_id,
            name: publication.snapshot.fullName,
            kind: "editorial_subject" as const,
            slug: publication.slug,
            href: profileHref,
          },
          sellerName: publication.snapshot.fullName,
          category: humanizeSlug(product.categorySlug),
          categorySlug: product.categorySlug,
          source: "editorial_catalogue" as const,
          availability: external ? "external" as const : "reported" as const,
          href,
          external,
          image: image?.src ?? null,
          imageAlt: image?.alt ?? "",
          price,
          priceLabel: product.price ?? null,
          searchText: searchText(
            product.name,
            product.categorySlug,
            humanizeSlug(product.categorySlug),
            publication.snapshot.fullName,
            publication.snapshot.district,
            publication.snapshot.state,
            product.price,
            product.packSizes,
            "reported editorial external",
          ),
          disclosure,
          sourceUrls: product.sourceUrls,
        } satisfies UnifiedMarketplaceItem;
      });
    });
}

function offerPrice(price: OfferPrice): UnifiedMarketplacePrice {
  if (price.model === "quote") {
    return { model: "quote", label: "Price on request" };
  }
  if (price.model === "free") {
    return { model: "free", label: "Free" };
  }
  if (price.model === "range") {
    return {
      model: "range",
      label: `${formatCurrency(price.minimum)}–${formatCurrency(price.maximum)} / ${price.unit}`,
      currency: "INR",
      minimum: price.minimum,
      maximum: price.maximum,
      unit: price.unit,
    };
  }
  return {
    model: price.model,
    label: `${price.model === "subsidized" ? "Subsidized " : ""}${formatCurrency(price.amount)} / ${price.unit}`,
    currency: "INR",
    amount: price.amount,
    unit: price.unit,
  };
}

export function adaptBusinessOffers(
  offers: readonly BusinessOffer[] = [],
): UnifiedMarketplaceItem[] {
  return offers
    .filter((offer) => offer.publicationState === "published")
    .map((offer) => {
      const organizationName =
        offer.organization?.displayName ?? "Marketplace organization";
      const categorySlug = offer.categorySlugs[0] ?? offer.kind;
      const categoryLabel = humanizeSlug(categorySlug);
      const price = offerPrice(offer.price);
      const availability: UnifiedMarketplaceAvailability =
        offer.availabilityState === "active" && offer.kind === "product"
          ? "live"
          : "enquiry";
      const organizationHref = offer.organization?.slug
        ? `/companies/${offer.organization.slug}`
        : undefined;
      const disclosure = offer.organization
        ? "Published FarmerBook business offer. Confirm current availability, terms, fulfilment and payment with the organization."
        : "Published FarmerBook business offer. Seller organization details are unavailable in this result; use the offer page to confirm availability, terms, fulfilment and payment.";

      return {
        id: `offer:${offer.id}`,
        name: offer.title,
        description: offer.description,
        seller: {
          id: offer.organization?.id ?? offer.organizationId,
          name: organizationName,
          kind: "organization" as const,
          ...(offer.organization?.slug
            ? { slug: offer.organization.slug }
            : {}),
          ...(organizationHref ? { href: organizationHref } : {}),
        },
        sellerName: organizationName,
        category: categoryLabel,
        categorySlug,
        source: "live_offer" as const,
        availability,
        href: `/offers/${offer.id}`,
        external: false,
        image: null,
        imageAlt: "",
        price,
        priceLabel: price.label,
        searchText: searchText(
          offer.title,
          offer.description,
          offer.terms,
          offer.kind,
          offer.categorySlugs,
          offer.serviceAreas.flatMap((area) =>
            [area.district, area.state].filter(
              (value): value is string => Boolean(value),
            ),
          ),
          organizationName,
          offer.organization?.slug,
          price.label,
        ),
        disclosure,
        sourceUrls: offer.organization?.websiteUrl
          ? [offer.organization.websiteUrl]
          : [],
      } satisfies UnifiedMarketplaceItem;
    });
}

export function buildUnifiedMarketplaceCatalog(
  input: UnifiedMarketplaceCatalogInput,
): UnifiedMarketplaceItem[];
export function buildUnifiedMarketplaceCatalog(
  produceListings: readonly ProduceListing[],
  businessOffers?: readonly BusinessOffer[],
): UnifiedMarketplaceItem[];
export function buildUnifiedMarketplaceCatalog(
  inputOrListings: UnifiedMarketplaceCatalogInput | readonly ProduceListing[],
  optionalBusinessOffers: readonly BusinessOffer[] = [],
): UnifiedMarketplaceItem[] {
  const isInputObject = (
    value: UnifiedMarketplaceCatalogInput | readonly ProduceListing[],
  ): value is UnifiedMarketplaceCatalogInput => "produceListings" in value;
  const produceListings = isInputObject(inputOrListings)
    ? inputOrListings.produceListings
    : inputOrListings;
  const businessOffers = isInputObject(inputOrListings)
    ? (inputOrListings.businessOffers ?? [])
    : optionalBusinessOffers;

  return [
    ...adaptProduceListings(produceListings),
    ...adaptAvaniPublicStorefrontCatalog(),
    ...adaptVistarakuProducts(),
    ...adaptFeaturedFarmerReportedProducts(),
    ...adaptBusinessOffers(businessOffers),
  ];
}
