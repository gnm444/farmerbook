import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductHeader } from "@/components/product-header";
import { requireAdmin } from "@/features/auth/require-admin";
import { WorkshopAdminRoster } from "@/features/workshops/workshop-admin-roster";
import { HARI_BABU_WORKSHOP_PATH } from "@/features/workshops/workshop-copy";
import { isFeatureEnabled } from "@/lib/feature-flags";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hari Babu workshop registrations",
  robots: { index: false, follow: false },
};

export default async function AdminWorkshopsPage() {
  if (!isFeatureEnabled("ENABLE_HARI_BABU_WORKSHOP")) notFound();
  const admin = await requireAdmin();
  if (admin.demo) notFound();

  return (
    <div className="product-page">
      <ProductHeader
        eyebrow="Administrator · private workshop roster"
        title="Hari Babu workshop registrations"
        description="Review registrations and the farming topics people submitted for the 23 December 2026 workshop. These contact details are private and used only for workshop coordination."
        action={<div className="report-actions">
          <Link className="button button--secondary" href={HARI_BABU_WORKSHOP_PATH}>View public workshop page</Link>
          <Link className="button button--secondary" href="/admin/operations">Admin operations</Link>
        </div>}
      />
      <WorkshopAdminRoster />
    </div>
  );
}
