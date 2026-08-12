import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/features/auth/require-user";
import { OrganizationDashboard } from "@/features/organizations/organization-dashboard";
import { loadOrganizationsForMember } from "@/features/organizations/queries";
import { loadOffersForMemberOrganizations } from "@/features/offers/queries";
import { IncSourcingWorkspace } from "@/features/inc-sourcing/workspace";
import { loadIncSourcingRequestsForOrganizations, loadIncVerificationRequests } from "@/features/inc-sourcing/queries";
import { isFeatureEnabled } from "@/lib/feature-flags";

export const metadata: Metadata = { title: "Inc workspace" };

export default async function CompanyDashboardPage() {
  if (!isFeatureEnabled("ENABLE_AGRI_BUSINESSES")) redirect("/feed");
  const user = await requireUser();
  const organizations = await loadOrganizationsForMember(user.id);
  const offersEnabled = isFeatureEnabled("ENABLE_BUSINESS_OFFERS");
  const incSourcingEnabled = isFeatureEnabled("ENABLE_INC_SOURCING");
  const [offers, sourcingRequests, verificationRequests] = await Promise.all([
    offersEnabled ? loadOffersForMemberOrganizations(organizations) : Promise.resolve([]),
    incSourcingEnabled ? loadIncSourcingRequestsForOrganizations(organizations) : Promise.resolve([]),
    incSourcingEnabled ? loadIncVerificationRequests(organizations.map((organization) => organization.id)) : Promise.resolve([]),
  ]);

  return (
    <div className="product-page product-page--wide">
      <OrganizationDashboard
        accountRole={user.profile.accountRole}
        organizations={organizations}
        offers={offers}
        offersEnabled={offersEnabled}
      />
      {incSourcingEnabled && organizations.length ? (
        <IncSourcingWorkspace
          organizations={organizations}
          requests={sourcingRequests}
          verificationRequests={verificationRequests}
        />
      ) : null}
    </div>
  );
}
