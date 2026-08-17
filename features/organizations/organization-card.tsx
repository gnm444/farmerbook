"use client";

import Link from "next/link";
import { BadgeCheck, Building2, MapPin } from "lucide-react";
import { useTranslations } from "@/components/locale-provider";
import { agricultureCompanySectorBySlug } from "@/lib/agriculture/company-sectors";
import { type OrganizationSummary } from "./types";
import { EcoFriendlyClaimNotice } from "./eco-friendly-claim-notice";

const typeMessageNames = {
  manufacturer_brand: "typeManufacturerBrand", dealer_distributor: "typeDealerDistributor",
  retailer: "typeRetailer", wholesaler_trader: "typeWholesalerTrader",
  processor_exporter: "typeProcessorExporter", fpo_cooperative: "typeFpoCooperative",
  custom_hiring_rental_centre: "typeRentalCentre", logistics_warehouse: "typeLogisticsWarehouse",
  finance_insurance: "typeFinanceInsurance", advisory_training_research: "typeAdvisoryResearch",
  ngo: "typeNgo", government_support_body: "typeGovernmentSupport",
} as const;

export function OrganizationCard({
  organization,
}: {
  organization: OrganizationSummary;
}) {
  const t = useTranslations("companies");
  const sectors = organization.sectorSlugs
    .map((slug) => agricultureCompanySectorBySlug(slug)?.name ?? slug)
    .slice(0, 3);

  return (
    <article className="card">
      <div>
        <span className="badge">
          <Building2 size={14} aria-hidden="true" />
          {t(typeMessageNames[organization.organizationType])}
        </span>
        {organization.verificationState === "verified" ? (
          <span className="badge badge--green">
            <BadgeCheck size={14} aria-hidden="true" />
            {t("verified")}
          </span>
        ) : (
          <span className="badge">{t("selfDeclared")}</span>
        )}
      </div>
      <h2 dir="auto">
        <Link href={`/companies/${organization.slug}`}>
          {organization.displayName}
        </Link>
      </h2>
      <p>
        <MapPin size={15} aria-hidden="true" /> {organization.district ? `${organization.district}, ` : ""}
        {organization.state}
      </p>
      <p dir="auto">{organization.description}</p>
      {sectors.length ? (
        <p>
          <strong>{t("sectors")}:</strong> {sectors.join(" · ")}
        </p>
      ) : null}
      <EcoFriendlyClaimNotice sectorSlugs={organization.sectorSlugs} />
      <Link className="button button--secondary" href={`/companies/${organization.slug}`}>
        {t("viewProfile")}
      </Link>
    </article>
  );
}
