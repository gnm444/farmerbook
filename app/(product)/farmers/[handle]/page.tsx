import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProfileView } from "@/features/profiles/profile-view";
import {
  loadCurrentProfile,
  loadProfileByHandle,
} from "@/features/profiles/queries";
import { loadPostsByAuthor } from "@/features/posts/queries";
import { loadPublicListings } from "@/features/marketplace/queries";
import { loadReviewsForSeller } from "@/features/reviews/queries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  return { title: `@${handle}` };
}

export default async function FarmerProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const [profile, currentUser, listings] = await Promise.all([
    loadProfileByHandle(handle),
    loadCurrentProfile(),
    loadPublicListings(),
  ]);
  if (!profile) notFound();
  const [profilePosts, reviews] = await Promise.all([
    loadPostsByAuthor(profile.id),
    loadReviewsForSeller(profile.id),
  ]);

  return (
    <div className="product-page">
      <ProfileView
        profile={profile}
        profilePosts={profilePosts}
        profileListings={listings.filter((listing) => listing.sellerId === profile.id)}
        reviews={reviews}
        isOwnProfile={profile.id === currentUser.id}
      />
    </div>
  );
}
