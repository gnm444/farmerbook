import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicFooter } from "@/components/public-footer";
import { PublicHeader } from "@/components/public-header";
import { loadPublicListingsForSeller } from "@/features/marketplace/queries";
import { PublicFarmerProfile } from "@/features/profiles/public-farmer-profile";
import { loadPublicFarmerProfile } from "@/features/profiles/queries";
import { loadReviewsForSeller } from "@/features/reviews/queries";
import { getServerI18n } from "@/lib/i18n";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const profile = await loadPublicFarmerProfile(handle);
  if (!profile) return { title: "Farmer profile" };

  const title = `${profile.fullName} — Farmer profile`;
  const description = `${profile.fullName} is a FarmerBook Farmer in ${profile.district}, ${profile.state}. See their farm story, crops and available produce.`;
  const canonical = `/profile/${profile.handle}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "profile",
      title,
      description,
      url: canonical,
      images: [
        {
          url: "/og-marketplace.png",
          width: 1200,
          height: 630,
          alt: `${profile.fullName}'s FarmerBook profile`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og-marketplace.png"],
    },
  };
}

export default async function PublicFarmerProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const profile = await loadPublicFarmerProfile(handle);
  if (!profile) notFound();

  const [listings, reviews, i18n] = await Promise.all([
    loadPublicListingsForSeller(profile.id),
    loadReviewsForSeller(profile.id),
    getServerI18n(),
  ]);

  return (
    <>
      <PublicHeader />
      <PublicFarmerProfile
        profile={profile}
        listings={listings}
        reviews={reviews}
        locale={i18n.locale}
        messages={i18n.messages}
      />
      <PublicFooter />
    </>
  );
}
