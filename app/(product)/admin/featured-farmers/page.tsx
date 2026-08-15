import type { Metadata } from "next";
import Link from "next/link";
import { ProductHeader } from "@/components/product-header";
import { requireAdmin } from "@/features/auth/require-admin";
import { FeaturedFarmerNewsroom } from "@/features/featured-farmers/newsroom-console";
import { loadFeaturedFarmerNewsroom } from "@/features/featured-farmers/queries";

export const metadata: Metadata = { title: "Featured Farmer newsroom" };

export default async function FeaturedFarmerNewsroomPage() {
  await requireAdmin();
  const newsroom = await loadFeaturedFarmerNewsroom();
  return (
    <div className="product-page featured-newsroom-page">
      <ProductHeader
        eyebrow="Administrator · public-interest farmer stories"
        title="Featured Farmer newsroom"
        description="Research, fact-check, write, and publish beautiful editorial profiles of farmers whose significant work is supported by public evidence. Every story is cited and carries at least one confirmed farmer-owned social account."
        action={
          <Link className="button button--secondary" href="/featured-farmers">
            View public collection
          </Link>
        }
      />
      <div className="featured-editorial-notice">
        These are FarmerBook editorial profiles—not member accounts, identity
        verification, endorsements, invitations, or sales listings.
      </div>
      <FeaturedFarmerNewsroom {...newsroom} />
    </div>
  );
}
