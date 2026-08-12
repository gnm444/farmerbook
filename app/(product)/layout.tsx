import { AppShell } from "@/components/app-shell";
import { loadCurrentProfile } from "@/features/profiles/queries";
import { isDemoMode } from "@/lib/env";
import { isFeatureEnabled } from "@/lib/feature-flags";

export default async function ProductLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await loadCurrentProfile();
  return (
    <AppShell
      currentUser={currentUser}
      demo={isDemoMode()}
      extendedLocalesEnabled={isFeatureEnabled("ENABLE_EXTENDED_LOCALES")}
      incSourcingEnabled={
        isFeatureEnabled("ENABLE_AGRI_BUSINESSES") &&
        isFeatureEnabled("ENABLE_INC_SOURCING")
      }
    >
      {children}
    </AppShell>
  );
}
