/* eslint-disable @next/next/no-img-element */

import { getListingImage } from "@/lib/listing-images";
import type { ProduceListing } from "@/lib/types";

export function ListingImage({
  variant,
  className,
  loading = "lazy",
}: {
  variant: ProduceListing["imageVariant"] | string;
  className: string;
  loading?: "eager" | "lazy";
}) {
  const image = getListingImage(variant);

  return (
    <img
      className={className}
      src={image.src}
      alt={image.alt}
      width={image.width}
      height={image.height}
      loading={loading}
      decoding="async"
    />
  );
}
