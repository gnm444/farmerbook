import { IncSourcingCreateForm } from "./create-form";
import { IncSourcingRequestCard } from "./request-card";
import { IncVerificationForm } from "./verification-form";
import type { IncSourcingRequest } from "./types";
import type { OrganizationForMember } from "@/features/organizations/types";
import { getServerTranslations } from "@/lib/i18n";

type VerificationRequest = {
  id: string;
  organization_id: string;
  status: string;
  requested_claim_types: string[];
  created_at: string;
};

export async function IncSourcingWorkspace({
  organizations,
  requests,
  verificationRequests,
}: {
  organizations: OrganizationForMember[];
  requests: IncSourcingRequest[];
  verificationRequests: VerificationRequest[];
}) {
  const { t } = await getServerTranslations("incSourcing");
  return (
    <section className="inc-sourcing-workspace">
      <div className="section-heading">
        <p className="eyebrow">{t("workspaceTitle")}</p>
        <h2>{t("workspaceTitle")}</h2>
        <p>{t("workspaceHelp")}</p>
      </div>
      <div className="inc-sourcing-workspace__forms">
        <IncVerificationForm organizations={organizations} requests={verificationRequests} />
        <IncSourcingCreateForm organizations={organizations} />
      </div>
      <div className="section-heading"><h2>{t("currentRequests")}</h2></div>
      {requests.length ? <div className="market-grid">{requests.map((request) => <IncSourcingRequestCard key={request.id} request={request} />)}</div> : <div className="empty-state"><h3>{t("noWorkspaceRequests")}</h3></div>}
    </section>
  );
}
