import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicFooter } from "@/components/public-footer";
import { PublicHeader } from "@/components/public-header";
import { loadPublicIncSourcingRequest } from "@/features/inc-sourcing/queries";
import { IncSourcingRequestCard } from "@/features/inc-sourcing/request-card";
import { IncSourcingResponseForm } from "@/features/inc-sourcing/response-form";
import { isDemoMode } from "@/lib/env";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { getServerTranslations } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ requestId: string }> }): Promise<Metadata> {
  const { requestId } = await params;
  const request = await loadPublicIncSourcingRequest(requestId);
  return request ? { title: request.productName, description: request.qualityRequirements } : {};
}

export default async function IncSourcingDetailPage({ params }: { params: Promise<{ requestId: string }> }) {
  if (!isFeatureEnabled("ENABLE_AGRI_BUSINESSES") || !isFeatureEnabled("ENABLE_INC_SOURCING")) notFound();
  const { requestId } = await params;
  const [request, { t }] = await Promise.all([loadPublicIncSourcingRequest(requestId), getServerTranslations("incSourcing")]);
  if (!request) notFound();
  return (
    <>
      <PublicHeader />
      <main className="container sourcing-detail-page">
        <Link className="text-link" href="/sourcing">← {t("back")}</Link>
        <div className="sourcing-detail-grid">
          <IncSourcingRequestCard request={request} detail />
          <IncSourcingResponseForm sourcingRequestId={request.id} readOnly={isDemoMode()} />
        </div>
      </main>
      <PublicFooter />
    </>
  );
}
