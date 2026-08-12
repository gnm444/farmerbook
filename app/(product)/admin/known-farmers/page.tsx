import type { Metadata } from "next";
import Link from "next/link";
import { ProductHeader } from "@/components/product-header";
import { requireAdmin } from "@/features/auth/require-admin";
import { KnownFarmerConsole } from "@/features/profile-agent/known-farmer-console";
import { loadKnownFarmerIntakes } from "@/features/profile-agent/known-farmer-queries";

export const metadata: Metadata = { title: "Known Farmer Intake" };

export default async function KnownFarmersPage() {
  await requireAdmin();
  const dashboard = await loadKnownFarmerIntakes();
  return (
    <div className="product-page">
      <ProductHeader
        eyebrow="Administrator · private profile research"
        title="Known Farmer Intake"
        description="Build a cited private draft for a farmer personally known to FarmerBook, with manual source review and at least one confirmed farmer-owned social profile. Nothing here publishes or contacts anyone."
        action={
          <div className="report-actions">
            <Link className="button button--secondary" href="/admin/outreach">Open consent-first outreach</Link>
            <Link className="button button--secondary" href="/admin/agents">Open managed agents</Link>
          </div>
        }
      />
      <KnownFarmerConsole {...dashboard} />
    </div>
  );
}
