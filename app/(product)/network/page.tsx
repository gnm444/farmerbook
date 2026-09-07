import type { Metadata } from "next";
import { NetworkClient } from "@/features/network/network-client";
import { NetworkHeader } from "@/features/network/network-header";
import { loadNetworkProfiles } from "@/features/profiles/queries";
import { getAuthenticatedMessages } from "@/lib/i18n/authenticated-messages";
import { getServerI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getServerI18n({ restoreProfile: true });
  return { title: getAuthenticatedMessages(locale).network.metadataTitle };
}

export default async function NetworkPage() {
  const network = await loadNetworkProfiles();

  return (
    <div className="product-page">
      <NetworkHeader />
      <NetworkClient
        initialFollowing={network.following}
        followers={network.followers}
      />
    </div>
  );
}
