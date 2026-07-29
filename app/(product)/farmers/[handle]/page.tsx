import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProfileView } from "@/features/profiles/profile-view";
import {
  loadCurrentProfile,
  loadProfileByHandle,
} from "@/features/profiles/queries";
import { loadPostsByAuthor } from "@/features/posts/queries";

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
  const [profile, currentUser] = await Promise.all([
    loadProfileByHandle(handle),
    loadCurrentProfile(),
  ]);
  if (!profile) notFound();
  const profilePosts = await loadPostsByAuthor(profile.id);

  return (
    <div className="product-page">
      <ProfileView
        profile={profile}
        profilePosts={profilePosts}
        isOwnProfile={profile.id === currentUser.id}
      />
    </div>
  );
}
