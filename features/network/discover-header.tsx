"use client";

import { ProductHeader } from "@/components/product-header";
import { useAuthenticatedMessages } from "@/components/locale-provider";

export function DiscoverHeader() {
  const { discover } = useAuthenticatedMessages();

  return (
    <ProductHeader
      eyebrow={discover.eyebrow}
      title={discover.title}
      description={discover.description}
    />
  );
}
