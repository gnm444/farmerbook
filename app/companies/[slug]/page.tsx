import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BadgeCheck, ExternalLink, MapPin, PackageSearch } from "lucide-react";
import { notFound } from "next/navigation";
import { PublicFooter } from "@/components/public-footer";
import { PublicHeader } from "@/components/public-header";
import { loadPublicOrganizationBySlug } from "@/features/organizations/queries";
import { OfferCard } from "@/features/offers/offer-card";
import { loadPublicOffers } from "@/features/offers/queries";
import { agricultureCompanySectorBySlug } from "@/lib/agriculture/company-sectors";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { ReportTargetButton } from "@/features/moderation/report-target-button";
import { formatNumber, getServerTranslations } from "@/lib/i18n";

const typeMessageNames = {
  manufacturer_brand: "typeManufacturerBrand", dealer_distributor: "typeDealerDistributor",
  retailer: "typeRetailer", wholesaler_trader: "typeWholesalerTrader",
  processor_exporter: "typeProcessorExporter", fpo_cooperative: "typeFpoCooperative",
  custom_hiring_rental_centre: "typeRentalCentre", logistics_warehouse: "typeLogisticsWarehouse",
  finance_insurance: "typeFinanceInsurance", advisory_training_research: "typeAdvisoryResearch",
  ngo: "typeNgo", government_support_body: "typeGovernmentSupport",
} as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  if (!isFeatureEnabled("ENABLE_AGRI_BUSINESSES")) return { title: "Inc" };
  const { slug } = await params;
  const organization = await loadPublicOrganizationBySlug(slug);
  return organization
    ? { title: organization.displayName, description: organization.description }
    : { title: "Inc" };
}

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  if (!isFeatureEnabled("ENABLE_AGRI_BUSINESSES")) notFound();
  const { slug } = await params;
  const organization = await loadPublicOrganizationBySlug(slug);
  if (!organization) notFound();
  const [{ t, locale }, offers] = await Promise.all([
    getServerTranslations("companies"),
    isFeatureEnabled("ENABLE_BUSINESS_OFFERS")
      ? loadPublicOffers({ organizationId: organization.id })
      : Promise.resolve([]),
  ]);

  return (
    <>
      <PublicHeader />
      <main>
        <div className="container">
          <Link className="back-link" href="/companies">
            <ArrowLeft size={16} aria-hidden="true" /> {t("back")}
          </Link>
          <section className="card">
            <div>
              <span className="badge">{t(typeMessageNames[organization.organizationType])}</span>
              {organization.verificationState === "verified" ? (
                <span className="badge badge--green">
                  <BadgeCheck size={14} aria-hidden="true" /> {t("verified")}
                </span>
              ) : (
                <span className="badge">{t("selfDeclared")}</span>
              )}
            </div>
            <h1 dir="auto">{organization.displayName}</h1>
            <p>
              <MapPin size={16} aria-hidden="true" /> {organization.district ? `${organization.district}, ` : ""}
              {organization.state}
            </p>
            <p dir="auto">{organization.description}</p>
            {organization.websiteUrl ? (
              <a href={organization.websiteUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={15} aria-hidden="true" /> {t("visitWebsite")}
              </a>
            ) : null}
            <ReportTargetButton
              targetType="organization"
              targetId={organization.id}
              label={t("reportLabel")}
            />
            <h2>{t("incSectors")}</h2>
            {organization.sectorSlugs.length ? (
              <ul>
                {organization.sectorSlugs.map((slugValue) => (
                  <li key={slugValue}>{agricultureCompanySectorBySlug(slugValue)?.name ?? slugValue}</li>
                ))}
              </ul>
            ) : <p>{t("noSectors")}</p>}
            <h2>{t("serviceAreas")}</h2>
            {organization.serviceAreas.length ? (
              <ul>
                {organization.serviceAreas.map((area) => (
                  <li key={`${area.state}-${area.district ?? "all"}`}>
                    {area.district ? `${area.district}, ` : ""}{area.state}
                    {area.serviceRadiusKm ? ` · ${t("withinKm", { distance: formatNumber(area.serviceRadiusKm, locale) })}` : ""}
                  </li>
                ))}
              </ul>
            ) : <p>{t("noServiceAreas")}</p>}
          </section>
          <section>
            <div className="section-heading">
              <p className="eyebrow">{t("currentOffers")}</p>
              <h2>{offers.length ? t("activeOffers", { count: formatNumber(offers.length, locale) }) : t("noActiveOffers")}</h2>
            </div>
            {offers.length ? (
              <div className="market-grid">
                {offers.map((offer) => <OfferCard key={offer.id} offer={offer} />)}
              </div>
            ) : (
              <div className="empty-state">
                <PackageSearch className="empty-state__icon" aria-hidden="true" />
                <h2>{t("noOffersFromInc")}</h2>
                <p>{t("moderatedOffersOnly")}</p>
              </div>
            )}
          </section>
        </div>
      </main>
      <PublicFooter />
    </>
  );
}
