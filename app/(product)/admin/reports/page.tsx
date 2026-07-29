import type { Metadata } from "next";
import { ProductHeader } from "@/components/product-header";
import { requireAdmin } from "@/features/auth/require-admin";
import { ReportQueue } from "@/features/moderation/report-queue";

export const metadata: Metadata = { title: "Moderation reports" };

export default async function AdminReportsPage() {
  await requireAdmin();

  return (
    <div className="product-page">
      <ProductHeader
        eyebrow="Administrator"
        title="Safety report queue"
        description="Review context, make a proportionate decision and leave an audit record."
      />
      <ReportQueue />
    </div>
  );
}
