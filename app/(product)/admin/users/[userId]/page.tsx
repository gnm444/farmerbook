import type { Metadata } from "next";
import { ProductHeader } from "@/components/product-header";
import { requireAdmin } from "@/features/auth/require-admin";
import { UserModeration } from "@/features/moderation/user-moderation";
import { loadProfilesByIds } from "@/features/profiles/queries";
import { notFound } from "next/navigation";

export const metadata: Metadata = { title: "Participant review" };

export default async function AdminUserPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  await requireAdmin();
  const { userId } = await params;
  const [profile] = await loadProfilesByIds([userId]);
  if (!profile) notFound();

  return (
    <div className="product-page">
      <ProductHeader
        eyebrow="Administrator"
        title="Participant review"
        description="Verify a legitimate participant or restrict an account that threatens community safety."
      />
      <UserModeration profile={profile} />
    </div>
  );
}
