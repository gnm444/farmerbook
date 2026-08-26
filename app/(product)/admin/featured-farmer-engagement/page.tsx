import type { Metadata } from "next";
import Link from "next/link";
import { ProductHeader } from "@/components/product-header";
import { requireAdmin } from "@/features/auth/require-admin";
import { FeaturedFarmerEngagementAdmin } from "@/features/featured-farmers/engagement-admin";
import { loadFeaturedFarmerRecommendationQueue } from "@/features/featured-farmers/engagement-queries";

export const metadata: Metadata = { title: "Featured Farmer recommendations" };

export default async function FeaturedFarmerEngagementAdminPage() {
  await requireAdmin();
  const recommendations = await loadFeaturedFarmerRecommendationQueue();
  return (
    <div className="product-page">
      <ProductHeader
        eyebrow="Administrator · editorial engagement"
        title="Featured Farmer recommendations"
        description="Review self-declared Customer recommendations before they appear on an editorial profile. Approval checks publication safety; it does not verify a FarmerBook purchase."
        action={
          <Link className="button button--secondary" href="/admin/featured-farmers">
            Featured Farmer newsroom
          </Link>
        }
      />
      <div className="featured-editorial-notice">
        Customer relationships are self-declared. Never add a verified-purchase
        label unless the marketplace transaction-review rules independently pass.
      </div>
      <FeaturedFarmerEngagementAdmin recommendations={recommendations} />
    </div>
  );
}
