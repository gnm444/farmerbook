import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductHeader } from "@/components/product-header";
import { requireSourcedFarmerResearchOwner } from "@/features/sourced-farmers/access";
import { loadSourcedFarmerDetail } from "@/features/sourced-farmers/queries";
import { SourcedFarmerDetail } from "@/features/sourced-farmers/sourced-farmer-detail";
import { sourcedFarmerYouTubeConfiguration } from "@/features/sourced-farmers/youtube-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata: Metadata = {
  title: "Private sourced Farmer evidence",
  robots: { index: false, follow: false, nocache: true },
};

export default async function SourcedFarmerDetailPage({
  params,
}: {
  params: Promise<{ profileId: string }>;
}) {
  const access = await requireSourcedFarmerResearchOwner();
  if (!access.ok) notFound();

  const { profileId } = await params;
  const detail = await loadSourcedFarmerDetail(profileId);
  if (!detail) notFound();

  sourcedFarmerYouTubeConfiguration();

  return (
    <div className="product-page sourced-farmer-detail-page">
      <ProductHeader
        eyebrow="Founder administrator · private evidence"
        title="Sourced Farmer evidence review"
        description="Inspect field-level provenance, freshness, review decisions, and redacted audit history for this private research record."
        action={<Link className="button button--secondary" href="/admin/sourced-farmers">Back to sourced research</Link>}
      />
      <SourcedFarmerDetail detail={detail} />
    </div>
  );
}
