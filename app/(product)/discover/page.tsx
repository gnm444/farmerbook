import type { Metadata } from "next";
import { DiscoverClient } from "@/features/network/discover-client";
import { DiscoverHeader } from "@/features/network/discover-header";
import { loadDiscoverProfiles } from "@/features/profiles/queries";
import { getAuthenticatedMessages } from "@/lib/i18n/authenticated-messages";
import { getServerI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getServerI18n({ restoreProfile: true });
  return { title: getAuthenticatedMessages(locale).discover.metadataTitle };
}

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
  const profiles = await loadDiscoverProfiles();

  return (
    <div className="product-page">
      <DiscoverHeader />
      <DiscoverClient
        initialSearch={filters.q}
        initialCrop={filters.crop}
        initialType={filters.type}
        initialDistrict={filters.district}
        profiles={profiles}
      />
    </div>
  );
}
