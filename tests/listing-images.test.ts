import { describe, expect, it } from "vitest";
import { getListingImage, listingImages } from "@/lib/listing-images";
import type { ProduceListing } from "@/lib/types";

const variants: ProduceListing["imageVariant"][] = [
  "tomato-crates",
  "grape-vines",
  "onion-sacks",
  "okra-basket",
];

describe("marketplace listing images", () => {
  it("maps every produce variant to a local WebP image with useful alt text", () => {
    for (const variant of variants) {
      const image = getListingImage(variant);

      expect(image).toEqual(listingImages[variant]);
      expect(image.src).toMatch(/^\/images\/marketplace\/.+\.webp$/);
      expect(image.alt.length).toBeGreaterThan(30);
      expect(image.width).toBeGreaterThan(0);
      expect(image.height).toBeGreaterThan(0);
    }
  });

  it("uses the tomato photograph as a safe fallback for unknown fixture data", () => {
    expect(getListingImage("future-crop")).toEqual(
      listingImages["tomato-crates"],
    );
  });
});
