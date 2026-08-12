import type { Metadata } from "next";
import Link from "next/link";
import { ProductHeader } from "@/components/product-header";
import { requireAdmin } from "@/features/auth/require-admin";
import { ManagedAgentConsole } from "@/features/managed-agents/managed-agent-console";
import { loadManagedAgentDashboard } from "@/features/managed-agents/queries";

export const metadata: Metadata = { title: "Managed operations agents" };

export default async function ManagedAgentsPage() {
  await requireAdmin();
  const dashboard = await loadManagedAgentDashboard();
  return (
    <div className="product-page">
      <ProductHeader
        eyebrow="Administrator · managed operations"
        title="FarmerBook agent fleet"
        description="Four purpose-limited managed agents handle consented growth, private Farmer profile drafts, verification routing and fleet health without sharing one unrestricted identity."
        action={<Link className="button button--secondary" href="/admin/outreach">Open outreach evidence</Link>}
      />
      <ManagedAgentConsole {...dashboard} />
    </div>
  );
}
