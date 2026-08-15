import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductHeader } from "@/components/product-header";
import { requirePrivateFarmerDatabaseOwner } from "@/features/farmer-database/access";
import { FarmerDatabaseConsole } from "@/features/farmer-database/farmer-database-console";
import { loadPrivateFarmerDatabase } from "@/features/farmer-database/queries";
import { youtubeDiscoveryConfiguration } from "@/features/farmer-database/youtube-discovery";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Private Farmer database",
  robots: { index: false, follow: false, nocache: true },
};

export default async function PrivateFarmerDatabasePage() {
  const access = await requirePrivateFarmerDatabaseOwner();
  if (!access.ok) notFound();
  const dashboard = await loadPrivateFarmerDatabase();
  return (
    <div className="product-page">
      <ProductHeader
        eyebrow="Founder administrator · private data"
        title="Farmer contact database"
        description="Manage consent-evidenced Farmer contacts and inspect current agriculture channels without turning public YouTube data into an outreach list."
        action={<div className="report-actions"><Link className="button button--secondary" href="/admin/sourced-farmers">Sourced farmer research</Link><Link className="button button--secondary" href="/admin/outreach">Open consented outreach</Link><Link className="button button--secondary" href="/admin/agents">Open managed agents</Link></div>}
      />
      <FarmerDatabaseConsole
        {...dashboard}
        youtubeConfigured={youtubeDiscoveryConfiguration().configured}
      />
    </div>
  );
}
