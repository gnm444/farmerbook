import { AppShell } from "@/components/app-shell";
import { loadCurrentProfile } from "@/features/profiles/queries";
import { isSupabaseConfigured } from "@/lib/env";

export default async function ProductLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await loadCurrentProfile();
  return (
    <AppShell currentUser={currentUser} demo={!isSupabaseConfigured()}>
      {children}
    </AppShell>
  );
}
