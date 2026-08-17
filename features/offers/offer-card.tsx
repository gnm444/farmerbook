"use client";

import Link from "next/link";
import { BadgeCheck, CalendarRange, MapPin, Package } from "lucide-react";
import { agricultureCompanySectorBySlug } from "@/lib/agriculture/company-sectors";
import { useLocale, useTranslations } from "@/components/locale-provider";
import { formatDate } from "@/lib/i18n/format";
import type { MessageName } from "@/lib/i18n/messages";
import { type BusinessOffer, type OfferKind } from "./types";
import { formatOfferPrice } from "./format";
import { EcoFriendlyClaimNotice } from "@/features/organizations/eco-friendly-claim-notice";

const kindMessageNames = { product: "kindProduct", service: "kindService", rental: "kindRental", promotion: "kindPromotion", finance: "kindFinance", insurance: "kindInsurance", advisory: "kindAdvisory", training: "kindTraining", support: "kindSupport" } as const satisfies Record<OfferKind, MessageName<"offers">>;
export function OfferCard({
  offer,
  publiclyAccessible = true,
}: {
  offer: BusinessOffer;
  publiclyAccessible?: boolean;
}) {
  const locale = useLocale();
  const t = useTranslations("offers");
  const category = offer.categorySlugs[0];
  const categoryLabel = category
    ? agricultureCompanySectorBySlug(category)?.name ?? category
    : null;

  return (
    <article className="card">
      <div>
        <span className="badge">
          <Package size={14} aria-hidden="true" /> {t(kindMessageNames[offer.kind])}
        </span>
        {offer.requiresModerationReview ? (
          <span className={offer.moderationState === "approved" ? "badge badge--green" : "badge badge--amber"}>
            <BadgeCheck size={14} aria-hidden="true" />
            {offer.moderationState === "approved" ? t("publicationReviewed") : t("reviewPending")}
          </span>
        ) : null}
      </div>
      <h2 dir="auto">
        {publiclyAccessible ? (
          <Link href={`/offers/${offer.id}`}>{offer.title}</Link>
        ) : (
          offer.title
        )}
      </h2>
      <p><strong>{formatOfferPrice(offer.price, locale, t)}</strong></p>
      {offer.organization ? (
        <p>
          {t("by")} <Link href={`/companies/${offer.organization.slug}`}>{offer.organization.displayName}</Link>
          {` · ${offer.organization.verificationState === "verified" ? t("verifiedInc") : t("selfDeclaredInc")}`}
        </p>
      ) : null}
      <p dir="auto">{offer.description}</p>
      {categoryLabel ? <p><strong>{t("category")}:</strong> {categoryLabel}</p> : null}
      <EcoFriendlyClaimNotice sectorSlugs={offer.categorySlugs} />
      <p>
        <CalendarRange size={15} aria-hidden="true" /> {t("validRange", { from: formatDate(offer.validFrom, locale), until: formatDate(offer.validUntil, locale) })}
      </p>
      {offer.serviceAreas[0] ? (
        <p>
          <MapPin size={15} aria-hidden="true" /> {offer.serviceAreas[0].district ? `${offer.serviceAreas[0].district}, ` : ""}
          {offer.serviceAreas[0].state}
        </p>
      ) : null}
      {publiclyAccessible ? (
        <Link className="button button--secondary" href={`/offers/${offer.id}`}>
          {t("viewOffer")}
        </Link>
      ) : (
        <p className="muted">
          {t("unavailablePublic", { state: offer.publicationState })}
        </p>
      )}
    </article>
  );
}
