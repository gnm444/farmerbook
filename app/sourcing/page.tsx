import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Factory, ShieldCheck } from "lucide-react";
import { PublicFooter } from "@/components/public-footer";
import { PublicHeader } from "@/components/public-header";
import { IncSourcingRequestCard } from "@/features/inc-sourcing/request-card";
import { loadPublicIncSourcingRequests } from "@/features/inc-sourcing/queries";
import { isDemoMode } from "@/lib/env";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { getServerTranslations } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslations("incSourcing");
  return { title: t("metadataTitle"), description: t("description") };
}

export default async function IncSourcingPage() {
  if (!isFeatureEnabled("ENABLE_AGRI_BUSINESSES") || !isFeatureEnabled("ENABLE_INC_SOURCING")) notFound();
  const [{ t }, requests] = await Promise.all([
    getServerTranslations("incSourcing"),
    loadPublicIncSourcingRequests(),
  ]);
  return (
    <>
      <PublicHeader />
      <main className="marketplace-page">
        <section className="marketplace-hero inc-sourcing-hero">
          <div className="container marketplace-hero__grid">
            <div>
              <span className="badge badge--amber"><Factory size={15} aria-hidden="true" /> {t("eyebrow")}</span>
              <h1>{t("title")}</h1>
              <p>{t("description")}</p>
              {isDemoMode() ? <p className="notice notice--info">{t("fictionalDisclosure")}</p> : null}
            </div>
            <div className="card inc-sourcing-trust-panel">
              <ShieldCheck size={42} aria-hidden="true" />
              <h2>{t("verifiedInc")}</h2>
              <p>{t("verificationMeaning")}</p>
            </div>
          </div>
        </section>
        <section className="marketplace-content">
          <div className="container">
            {requests.length ? (
              <div className="market-grid">{requests.map((request) => <IncSourcingRequestCard key={request.id} request={request} />)}</div>
            ) : (
              <div className="empty-state"><Factory className="empty-state__icon" aria-hidden="true" /><h2>{t("emptyTitle")}</h2><p>{t("emptyBody")}</p></div>
            )}
          </div>
        </section>
      </main>
      <PublicFooter />
    </>
  );
}
