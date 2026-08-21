import type { Metadata } from "next";
import Link from "next/link";
import { ProductHeader } from "@/components/product-header";
import { AiBudgetPanel } from "@/features/ai-budget/budget-panel";
import { loadAiFleetBudgetStatus } from "@/features/ai-budget/queries";
import { requireAdmin } from "@/features/auth/require-admin";
import { ManagedAgentConsole } from "@/features/managed-agents/managed-agent-console";
import { loadManagedAgentDashboard } from "@/features/managed-agents/queries";
import { CompanyCommandCenter } from "@/features/company-agents/company-command-center";
import { loadCompanyCommandCenter } from "@/features/company-agents/queries";

export const metadata: Metadata = { title: "Managed operations agents" };

export default async function ManagedAgentsPage() {
  await requireAdmin();
  const [dashboard, aiBudget, company] = await Promise.all([
    loadManagedAgentDashboard(),
    loadAiFleetBudgetStatus(),
    loadCompanyCommandCenter(),
  ]);
  return (
    <div className="product-page">
      <ProductHeader
        eyebrow="Administrator · managed operations"
        title="FarmerBook agent fleet"
        description="Fifteen aggregate-only company roles plan toward the six-month growth objectives, while six purpose-limited workers handle consented operations. Every role has an independent schedule and no unrestricted identity."
        action={<div className="report-actions"><Link className="button button--secondary" href="/admin/agents/guide">How to use the 15 Agents</Link><Link className="button button--secondary" href="/admin/agents/actions">Execution controls</Link><Link className="button button--secondary" href="/admin/blog">Blog Writing Agent</Link><Link className="button button--secondary" href="/admin/operations">Support & social review</Link><Link className="button button--secondary" href="/admin/sourced-farmers">Sourced farmer research</Link><Link className="button button--secondary" href="/admin/farmer-database">Private Farmer database</Link><Link className="button button--secondary" href="/admin/outreach">Open outreach evidence</Link></div>}
      />
      <AiBudgetPanel dashboard={aiBudget} />
      <CompanyCommandCenter {...company} />
      <ManagedAgentConsole {...dashboard} />
    </div>
  );
}
