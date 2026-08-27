import type { Metadata } from "next";
import Link from "next/link";
import { ProductHeader } from "@/components/product-header";
import { requireAdmin } from "@/features/auth/require-admin";
import { FeaturedFarmerAccountLinkAdmin } from "@/features/featured-farmers/account-link-admin";
import { loadFeaturedFarmerPublications } from "@/features/featured-farmers/queries";

export const metadata: Metadata = { title: "Featured Farmer account links" };

export default async function FeaturedFarmerAccountLinksPage() {
  await requireAdmin();
  const publications = await loadFeaturedFarmerPublications(100);
  return (
    <div className="product-page">
      <ProductHeader
        eyebrow="Administrator · account ownership"
        title="Featured Farmer account links"
        description="Connect a curated editorial profile to one confirmed FarmerBook account. This is reversible and does not grant verification or certification."
        action={<Link className="button button--secondary" href="/admin/featured-farmers">Back to newsroom</Link>}
      />
      <FeaturedFarmerAccountLinkAdmin publications={publications.map((publication) => ({
        slug: publication.slug,
        fullName: publication.snapshot.fullName,
        district: publication.snapshot.district,
        state: publication.snapshot.state,
      }))} />
    </div>
  );
}
