import type { ProduceListing } from "@/lib/types";

export type ListingImageAsset = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

export const listingImages = {
  "tomato-crates": {
    src: "/images/marketplace/tomato-crates.webp",
    alt: "Freshly harvested tomatoes in reusable crates beside a Maharashtra field",
    width: 1448,
    height: 1086,
  },
  "grape-vines": {
    src: "/images/marketplace/grape-vines.webp",
    alt: "Green grape bunches and harvest baskets in a Nashik vineyard",
    width: 1448,
    height: 1086,
  },
  "onion-sacks": {
    src: "/images/marketplace/onion-sacks.webp",
    alt: "Maharashtra red onions beside ventilated market sacks",
    width: 1448,
    height: 1086,
  },
  "okra-basket": {
    src: "/images/marketplace/okra-basket.webp",
    alt: "Fresh okra in a woven harvest basket beside healthy plants",
    width: 1448,
    height: 1086,
  },
} as const satisfies Record<ProduceListing["imageVariant"], ListingImageAsset>;

export function getListingImage(
  variant: ProduceListing["imageVariant"] | string | null | undefined,
): ListingImageAsset {
  if (variant && variant in listingImages) {
    return listingImages[variant as ProduceListing["imageVariant"]];
  }

  return listingImages["tomato-crates"];
}
