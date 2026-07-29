import type { Metadata } from "next";
import { ProductHeader } from "@/components/product-header";
import { DiscoverClient } from "@/features/network/discover-client";

export const metadata: Metadata = { title: "Discover people" };

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    crop?: string;
    type?: string;
    district?: string;
  }>;
}) {
  const filters = await searchParams;

  return (
    <div className="product-page">
      <ProductHeader
        eyebrow="Grow your network"
        title="Discover people"
        description="Find farmers and agriculture participants by crop, role and location."
      />
      <DiscoverClient
        initialSearch={filters.q}
        initialCrop={filters.crop}
        initialType={filters.type}
        initialDistrict={filters.district}
      />
    </div>
  );
}
