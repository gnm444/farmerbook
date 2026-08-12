"use client";

import Link from "next/link";
import { BadgeCheck, CalendarDays, MapPin, PackageCheck } from "lucide-react";
import { useLocale, useTranslations } from "@/components/locale-provider";
import { formatCurrency, formatDate, formatNumber } from "@/lib/i18n/format";
import type { IncSourcingRequest, IncVerificationClaimType } from "./types";

const claimKeys = {
  organization_registration: "claimOrganization",
  authorized_representative: "claimRepresentative",
  gst_registration: "claimGst",
  official_domain: "claimDomain",
  facility_registration: "claimFacility",
  industry_licence: "claimLicence",
  bank_account_name: "claimBank",
} as const satisfies Record<IncVerificationClaimType, string>;

const cadenceKeys = {
  one_time: "cadenceOneTime",
  weekly: "cadenceWeekly",
  monthly: "cadenceMonthly",
  seasonal: "cadenceSeasonal",
  ongoing: "cadenceOngoing",
} as const;

export function IncSourcingRequestCard({
  request,
  detail = false,
}: {
  request: IncSourcingRequest;
  detail?: boolean;
}) {
  const locale = useLocale();
  const t = useTranslations("incSourcing");
  const quantity = request.quantityMaximum == null
    ? t("quantityMinimum", {
        minimum: formatNumber(request.quantityMinimum, locale),
        unit: request.quantityUnit,
      })
    : t("quantityRange", {
        minimum: formatNumber(request.quantityMinimum, locale),
        maximum: formatNumber(request.quantityMaximum, locale),
        unit: request.quantityUnit,
      });
  const price = request.price.model === "quote"
    ? t("priceQuote")
    : request.price.model === "target"
      ? t("priceTarget", {
          price: formatCurrency(request.price.amount, locale),
          unit: request.price.unit,
        })
      : t("priceRange", {
          minimum: formatCurrency(request.price.minimum, locale),
          maximum: formatCurrency(request.price.maximum, locale),
          unit: request.price.unit,
        });

  return (
    <article className={`card inc-sourcing-card${detail ? " inc-sourcing-card--detail" : ""}`}>
      <div className="inc-sourcing-card__header">
        <div>
          <p className="eyebrow">{request.organization?.displayName ?? t("verifiedInc")}</p>
          <h2 dir="auto">{request.productName}</h2>
          {request.varietyOrGrade ? <p dir="auto">{request.varietyOrGrade}</p> : null}
        </div>
        <span className="badge badge--green">
          <BadgeCheck size={15} aria-hidden="true" /> {t("verifiedInc")}
        </span>
      </div>

      <dl className="inc-sourcing-facts">
        <div><dt><PackageCheck size={16} aria-hidden="true" /> {t("quantity")}</dt><dd>{quantity}</dd></div>
        <div><dt>{t("cadence")}</dt><dd>{t(cadenceKeys[request.cadence])}</dd></div>
        <div><dt><MapPin size={16} aria-hidden="true" /> {t("destination")}</dt><dd>{[request.destinationDistrict, request.destinationState].filter(Boolean).join(", ")}</dd></div>
        <div><dt><CalendarDays size={16} aria-hidden="true" /> {t("needBy")}</dt><dd>{formatDate(request.needBy, locale)}</dd></div>
        <div><dt>{t("closes")}</dt><dd>{formatDate(request.closesOn, locale)}</dd></div>
        <div><dt>{t("priceQuote")}</dt><dd>{price}</dd></div>
      </dl>

      <div className="inc-verification-claims" aria-label={t("verifiedInc")}>
        {request.verificationClaims.map((claim) => (
          <span className="chip" key={claim.id} title={claim.scope || undefined}>
            <BadgeCheck size={14} aria-hidden="true" />
            {t(claimKeys[claim.claimType])}
          </span>
        ))}
      </div>

      {detail ? (
        <div className="inc-sourcing-detail-copy">
          <h3>{t("quality")}</h3>
          <p dir="auto">{request.qualityRequirements || "—"}</p>
          <h3>{t("paymentTerms")}</h3>
          <p dir="auto">{request.paymentTerms || "—"}</p>
          {request.requiredLicenceScope ? (
            <p className="notice notice--info">{t("licenceRequired", { scope: request.requiredLicenceScope })}</p>
          ) : null}
          <p className="muted">{t("verificationMeaning")}</p>
        </div>
      ) : (
        <Link className="button button--secondary" href={`/sourcing/${request.id}`}>
          {t("viewRequest")}
        </Link>
      )}
    </article>
  );
}
