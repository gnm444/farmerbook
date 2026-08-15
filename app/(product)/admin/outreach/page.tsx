import type { Metadata } from "next";
import Link from "next/link";
import { ProductHeader } from "@/components/product-header";
import { requireAdmin } from "@/features/auth/require-admin";
import { OutreachConsole } from "@/features/outreach/outreach-console";
import { loadOutreachDashboard } from "@/features/outreach/queries";
import { braveSearchConfiguration } from "@/features/profile-agent/brave-search";
import { isSupabaseConfigured } from "@/lib/env";
import { isFeatureEnabled } from "@/lib/feature-flags";

export const metadata: Metadata = { title: "Consent-first acquisition" };

export default async function AdminOutreachPage() {
  await requireAdmin();
  const dashboard = await loadOutreachDashboard();
  const enabled =
    isFeatureEnabled("ENABLE_OUTREACH_AGENT") && isSupabaseConfigured();
  const profileAgentEnabled =
    enabled && isFeatureEnabled("ENABLE_PROFILE_RESEARCH_AGENT");
  const nameSearchEnabled =
    profileAgentEnabled && braveSearchConfiguration().configured;

  return (
    <div className="product-page">
      <ProductHeader
        eyebrow="Administrator · consent-first growth"
        title="FarmerBook acquisition agent"
        description="Research public business material, prepare relevant introductions and track onboarding without treating a public contact as permission to message."
        action={
          <div className="report-actions">
            <Link className="button button--secondary" href="/admin/known-farmers">Known Farmer Intake</Link>
            <Link className="button button--secondary" href="/admin/sourced-farmers">Sourced farmer research</Link>
            <Link className="button button--secondary" href="/admin/farmer-database">Private Farmer database</Link>
            <Link className="button button--secondary" href="/admin/agents">Open managed agents</Link>
          </div>
        }
      />
      <OutreachConsole
        {...dashboard}
        enabled={enabled}
        profileAgentEnabled={profileAgentEnabled}
        nameSearchEnabled={nameSearchEnabled}
      />
    </div>
  );
}
