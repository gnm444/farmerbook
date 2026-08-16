import type { Metadata } from "next";
import { ProductHeader } from "@/components/product-header";
import { requireUser } from "@/features/auth/require-user";
import { loadMySupportCases } from "@/features/customer-operations/queries";
import { SupportConsole } from "@/features/customer-operations/support-console";
import { isDemoMode, isSupabaseConfigured } from "@/lib/env";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { getServerI18n } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Support" };

export default async function SupportPage() {
  await requireUser();
  const [{ locale }, cases] = await Promise.all([
    getServerI18n({ restoreProfile: true }),
    loadMySupportCases(),
  ]);
  const enabled = isFeatureEnabled("ENABLE_SUPPORT_SOCIAL_PILOT");
  const configured = enabled && isSupabaseConfigured() && !isDemoMode();

  return (
    <div className="product-page customer-operations-support-page">
      <ProductHeader
        eyebrow="Private · supervised support"
        title="FarmerBook support"
        description="Ask a question inside FarmerBook. AI may prepare a draft, but only a human-reviewed reply can appear in your private support history."
      />
      <SupportConsole
        cases={cases}
        locale={locale}
        enabled={enabled}
        configured={configured}
      />
    </div>
  );
}
