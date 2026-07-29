import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { currentUserId, posts, profiles } from "@/lib/demo-data";
import { ProfileView } from "@/features/profiles/profile-view";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const profile = profiles.find((item) => item.handle === handle);
  return { title: profile?.fullName ?? "Farmer profile" };
}

export default async function FarmerProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const profile = profiles.find((item) => item.handle === handle);
  if (!profile) notFound();

  return (
    <div className="product-page">
      <ProfileView
        profile={profile}
        profilePosts={posts.filter((post) => post.authorId === profile.id)}
        isOwnProfile={profile.id === currentUserId}
      />
    </div>
  );
}
