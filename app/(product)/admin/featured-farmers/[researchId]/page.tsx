import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/features/auth/require-admin";
import { FeaturedFarmerEditorialWorkspace } from "@/features/featured-farmers/editorial-workspace";
import { loadFeaturedFarmerWorkspace } from "@/features/featured-farmers/queries";

export const metadata: Metadata = { title: "Featured Farmer story desk" };

export default async function FeaturedFarmerWorkspacePage({
  params,
}: {
  params: Promise<{ researchId: string }>;
}) {
  await requireAdmin();
  const { researchId } = await params;
  const result = await loadFeaturedFarmerWorkspace(researchId);
  if (!result.available || !result.workspace) notFound();
  return (
    <div className="product-page featured-workspace-page">
      <FeaturedFarmerEditorialWorkspace workspace={result.workspace} />
    </div>
  );
}
