import type { Metadata } from "next";
import Link from "next/link";
import { ProductHeader } from "@/components/product-header";
import { CompanyAgentOperatorGuide } from "@/features/company-agents/operator-guide";
import { requireAdmin } from "@/features/auth/require-admin";

export const metadata: Metadata = { title: "How to operate the AI company" };

export default async function CompanyAgentGuidePage() {
  await requireAdmin();
  return (
    <div className="product-page">
      <ProductHeader
        eyebrow="Administrator · operating guide"
        title="How to use FarmerBook's 15 company Agents"
        description="Review aggregate proposals, make accountable backlog decisions and hand approved work to the correct purpose-limited workflow."
        action={<Link className="button button--secondary" href="/admin/agents">Back to Agent command center</Link>}
      />
      <CompanyAgentOperatorGuide />
    </div>
  );
}
