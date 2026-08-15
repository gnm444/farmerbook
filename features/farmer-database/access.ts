import { requireAdmin } from "@/features/auth/require-admin";
import { isDemoMode, isSupabaseConfigured } from "@/lib/env";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { privateFarmerContactConfiguration } from "./crypto";

export async function requirePrivateFarmerDatabaseOwner() {
  if (!isFeatureEnabled("ENABLE_PRIVATE_FARMER_CONTACTS")) {
    return { ok: false as const, code: "FEATURE_DISABLED" as const };
  }
  const administrator = await requireAdmin();
  if (administrator.demo || isDemoMode() || !isSupabaseConfigured()) {
    return { ok: false as const, code: "NOT_CONFIGURED" as const };
  }
  const configuration = privateFarmerContactConfiguration();
  if (!configuration.configured) {
    return { ok: false as const, code: "NOT_CONFIGURED" as const };
  }
  if (administrator.id !== configuration.ownerId) {
    return { ok: false as const, code: "FORBIDDEN" as const };
  }
  return {
    ok: true as const,
    administrator: { id: administrator.id, demo: false as const },
    configuration,
  };
}
