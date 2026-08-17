import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BadgeCheck, CalendarRange, MapPin, ShieldAlert } from "lucide-react";
import { notFound } from "next/navigation";
import { PublicFooter } from "@/components/public-footer";
import { PublicHeader } from "@/components/public-header";
import { OfferEnquiryGate } from "@/features/offers/offer-enquiry-gate";
import { formatOfferPrice } from "@/features/offers/format";
import { loadPublicOfferById } from "@/features/offers/queries";
import type { OfferKind } from "@/features/offers/types";
import { agricultureCompanySectorBySlug } from "@/lib/agriculture/company-sectors";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { ReportTargetButton } from "@/features/moderation/report-target-button";
import { formatDate, formatNumber, getServerTranslations, type MessageName } from "@/lib/i18n";
import { EcoFriendlyClaimNotice } from "@/features/organizations/eco-friendly-claim-notice";

const kindMessageNames = { product: "kindProduct", service: "kindService", rental: "kindRental", promotion: "kindPromotion", finance: "kindFinance", insurance: "kindInsurance", advisory: "kindAdvisory", training: "kindTraining", support: "kindSupport" } as const satisfies Record<OfferKind, MessageName<"offers">>;

function offerRoutesEnabled() {
  return (
    isFeatureEnabled("ENABLE_AGRI_BUSINESSES") &&
    isFeatureEnabled("ENABLE_BUSINESS_OFFERS")
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ offerId: string }>;
}): Promise<Metadata> {
  if (!offerRoutesEnabled()) return { title: "Inc offer" };
  const { offerId } = await params;
  const offer = await loadPublicOfferById(offerId);
  return offer
    ? { title: offer.title, description: offer.description }
    : { title: "Inc offer" };
}

export default async function OfferPage({
  params,
}: {
  params: Promise<{ offerId: string }>;
}) {
  if (!offerRoutesEnabled()) notFound();
  const { offerId } = await params;
  const [offer, { t, locale }] = await Promise.all([
    loadPublicOfferById(offerId),
    getServerTranslations("offers"),
  ]);
  if (!offer || !offer.organization) notFound();

  return (
    <>
      <PublicHeader />
      <main>
        <div className="container">
          <Link className="back-link" href={`/companies/${offer.organization.slug}`}>
            <ArrowLeft size={16} aria-hidden="true" /> {t("backTo", { name: offer.organization.displayName })}
          </Link>
          <div className="listing-detail-grid">
            <article className="card">
              <div>
                <span className="badge">{t(kindMessageNames[offer.kind])}</span>
                {offer.requiresModerationReview ? (
                  <span className="badge badge--green">
                    <BadgeCheck size={14} aria-hidden="true" /> {t("publicationReviewed")}
                  </span>
                ) : null}
              </div>
              <h1 dir="auto">{offer.title}</h1>
              <p><strong>{formatOfferPrice(offer.price, locale, t)}</strong></p>
              <p>
                {t("offeredBy")} <Link href={`/companies/${offer.organization.slug}`}>{offer.organization.displayName}</Link>
                {` · ${offer.organization.verificationState === "verified" ? t("verifiedInc") : t("selfDeclaredInc")}`}
              </p>
              <p dir="auto">{offer.description}</p>
              <p>
                <CalendarRange size={16} aria-hidden="true" /> {t("validRange", { from: formatDate(offer.validFrom, locale), until: formatDate(offer.validUntil, locale) })}
              </p>
              <h2>{t("categories")}</h2>
              <ul>
                {offer.categorySlugs.map((slug) => (
                  <li key={slug}>{agricultureCompanySectorBySlug(slug)?.name ?? slug}</li>
                ))}
              </ul>
              <EcoFriendlyClaimNotice sectorSlugs={offer.categorySlugs} />
              <h2>{t("serviceAreas")}</h2>
              <ul>
                {offer.serviceAreas.map((area) => (
                  <li key={`${area.state}-${area.district ?? "all"}`}>
                    <MapPin size={15} aria-hidden="true" /> {area.district ? `${area.district}, ` : ""}{area.state}
                    {area.serviceRadiusKm ? ` · ${t("withinKm", { distance: formatNumber(area.serviceRadiusKm, locale) })}` : ""}
                  </li>
                ))}
              </ul>
              {offer.terms ? (
                <section>
                  <h2>{t("providerTerms")}</h2>
                  <p dir="auto">{offer.terms}</p>
                </section>
              ) : null}
              <ReportTargetButton
                targetType="business_offer"
                targetId={offer.id}
                label={t("reportLabel")}
              />
              {offer.requiresModerationReview ? (
                <aside className="notice">
                  <ShieldAlert size={18} aria-hidden="true" />
                  <strong>{t("reviewScope")}</strong>
                  <p>{t("reviewScopeHelp")}</p>
                </aside>
              ) : null}
            </article>
            <aside>
              <OfferEnquiryGate offerId={offer.id} />
            </aside>
          </div>
        </div>
      </main>
      <PublicFooter />
    </>
  );
}
