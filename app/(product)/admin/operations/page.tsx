import type { Metadata } from "next";
import { ProductHeader } from "@/components/product-header";
import { requireAdmin } from "@/features/auth/require-admin";
import { OperationsConsole } from "@/features/customer-operations/operations-console";
import { loadCustomerOperationsDashboard } from "@/features/customer-operations/queries";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { getServerI18n } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Support and social review" };

export default async function CustomerOperationsPage() {
  await requireAdmin();
  const [{ locale }, dashboard] = await Promise.all([
    getServerI18n({ restoreProfile: true }),
    loadCustomerOperationsDashboard(),
  ]);

  return (
    <div className="product-page customer-operations-admin-page">
      <ProductHeader
        eyebrow="Administrator · supervised operations"
        title="Support and social review"
        description="Review every AI-prepared reply and owned-channel social draft. Approval makes social copy ready to copy; FarmerBook does not distribute it from this queue."
      />
      <OperationsConsole
        {...dashboard}
        locale={locale}
        enabled={isFeatureEnabled("ENABLE_SUPPORT_SOCIAL_PILOT")}
      />
    </div>
  );
}
