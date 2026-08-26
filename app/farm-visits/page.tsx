import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarCheck2, MapPinCheck, SearchCheck, UserRoundCheck } from "lucide-react";
import { PublicFooter } from "@/components/public-footer";
import { PublicHeader } from "@/components/public-header";
import { FarmVisitRequestGate } from "@/features/farm-visits/farm-visit-request-gate";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { getServerTranslations } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslations("farmVisits");
  return {
    title: t("metadataTitle"),
    description: t("metadataDescription"),
    alternates: { canonical: "/farm-visits" },
    openGraph: {
      type: "website",
      title: `${t("metadataTitle")} | FarmerBook`,
      description: t("metadataDescription"),
      url: "/farm-visits",
      siteName: "FarmerBook",
    },
  };
}
export default async function FarmVisitsPage() {
  if (!isFeatureEnabled("ENABLE_FARM_VISITS")) notFound();
  const { t, locale } = await getServerTranslations("farmVisits");
  const usesEnglishFallback = locale !== "en-IN" && locale !== "te-IN";
  const fallbackProps = usesEnglishFallback ? { lang: "en-IN", dir: "ltr" as const } : {};
  const steps = [
    [UserRoundCheck, t("step1Title"), t("step1Body")],
    [SearchCheck, t("step2Title"), t("step2Body")],
    [MapPinCheck, t("step3Title"), t("step3Body")],
    [CalendarCheck2, t("step4Title"), t("step4Body")],
  ] as const;

  return (
    <>
      <PublicHeader />
      <main className="farm-visits-page" {...fallbackProps}>
        <section className="farm-visits-hero">
          <div className="container farm-visits-hero__grid">
            <div className="farm-visits-hero__copy">
              <p className="eyebrow">{t("eyebrow")}</p>
              <h1>{t("title")}</h1>
              <p>{t("intro")}</p>
              {usesEnglishFallback ? <p className="notice">{t("fallbackNotice")}</p> : null}
            </div>
            <figure className="farm-visits-video-card">
              <video
                controls
                playsInline
                preload="metadata"
                poster="/farm-visits/organic-farm-visit-poster.webp"
                aria-label={t("videoTitle")}
              >
                <source src="/farm-visits/organic-farm-visit.mp4" type="video/mp4" />
                <p>{t("videoSummary")}</p>
              </video>
              <figcaption>
                <strong>{t("videoTitle")}</strong>
                <span>{t("videoCaption")}</span>
              </figcaption>
            </figure>
          </div>
        </section>

        <section className="container section farm-visits-process">
          <div className="section-heading">
            <h2>{t("howHeading")}</h2>
          </div>
          <div className="farm-visits-steps">
            {steps.map(([Icon, title, body], index) => (
              <article className="farm-visits-step" key={title}>
                <span className="farm-visits-step__number">{index + 1}</span>
                <Icon aria-hidden="true" />
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
          <p className="farm-visits-assurance">{t("assurance")}</p>
        </section>

        <section className="farm-visits-request-section">
          <div className="container farm-visits-request-card">
            <FarmVisitRequestGate />
          </div>
        </section>
      </main>
      <PublicFooter />
    </>
  );
}
