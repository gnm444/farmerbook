import type { Metadata } from "next";
import { PublicFooter } from "@/components/public-footer";
import { PublicHeader } from "@/components/public-header";
import { PublicFarmerProfile } from "@/features/profiles/public-farmer-profile";
import { getProfile } from "@/lib/demo-data";
import { marketReviews, produceListings } from "@/lib/market-data";
import { getServerI18n } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Example farmer profile",
  description:
    "A fictional example showing how a professional FarmerBook farmer profile looks.",
  robots: { index: false, follow: false },
};

export default async function ExampleFarmerProfilePage() {
  const i18n = await getServerI18n();
  const sourceProfile = getProfile("meera");
  const profile = {
    ...sourceProfile,
    id: "example-farmer",
    handle: "example",
    verified: false,
    socialLinks: {},
  };

  return (
    <>
      <PublicHeader />
      <PublicFarmerProfile
        profile={profile}
        listings={produceListings.filter(
          (listing) => listing.sellerId === sourceProfile.id,
        )}
        reviews={marketReviews.filter(
          (review) => review.sellerId === sourceProfile.id,
        )}
        locale={i18n.locale}
        messages={i18n.messages}
        isExample
      />
      <PublicFooter />
    </>
  );
}
