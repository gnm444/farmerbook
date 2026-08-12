"use client";

import Link from "next/link";
import {
  Bookmark,
  CalendarRange,
  MapPin,
  PackageCheck,
  Star,
  Truck,
} from "lucide-react";
import { Avatar, VerifiedBadge } from "@/components/ui";
import type { AccountRole, FarmingMethod, ProduceListing } from "@/lib/types";
import { ListingImage } from "./listing-image";
import { useLocale, useTranslations } from "@/components/locale-provider";
import {
  formatCurrency,
  formatDate,
  formatList,
  formatNumber,
} from "@/lib/i18n/format";

const roleKeys = {
  farmer: "farmer",
  customer: "customer",
  wholesaler: "wholesaler",
  agri_business: "inc",
} as const satisfies Record<AccountRole, "farmer" | "customer" | "wholesaler" | "inc">;

const methodKeys = {
  organic: "organic",
  natural: "natural",
  conventional: "conventional",
  mixed: "mixed",
} as const satisfies Record<FarmingMethod, "organic" | "natural" | "conventional" | "mixed">;

export function ListingCard({
  listing,
  saved = false,
  onSave,
  hrefPrefix = "/marketplace",
  readOnly = false,
}: {
  listing: ProduceListing;
  saved?: boolean;
  onSave?: (listingId: string) => void;
  hrefPrefix?: string;
  readOnly?: boolean;
}) {
  const locale = useLocale();
  const t = useTranslations("market");
  const seller = listing.seller;
  const displayDate = (value: string) => /^\d{4}-\d{2}-\d{2}/.test(value)
    ? formatDate(value, locale, { dateStyle: "medium" })
    : value;
  const deliveryLabel = (option: string) => {
    if (option === "Farm pickup") return t("farmPickup");
    if (option === "Collection centre") return t("collectionCentre");
    if (option === "Transport arranged") return t("transportArranged");
    return option;
  };

  return (
    <article className="card market-card">
      <div className="market-card__image">
        <ListingImage
          className="listing-photo market-card__photo"
          variant={listing.imageVariant}
        />
        {readOnly ? (
          <span className="market-card__image-link" aria-hidden="true">
            <span className="market-card__availability">{t("sampleListing")}</span>
          </span>
        ) : (
          <Link
            className="market-card__image-link"
            href={`${hrefPrefix}/${listing.id}`}
            aria-label={t("viewListing", { title: listing.title })}
          >
            <span className="market-card__availability">{t("availableNow")}</span>
          </Link>
        )}
        {onSave ? (
          <button
            className="market-save"
            type="button"
            aria-label={saved ? t("unsaveListing", { title: listing.title }) : t("saveListing", { title: listing.title })}
            aria-pressed={saved}
            onClick={(event) => {
              event.preventDefault();
              onSave(listing.id);
            }}
          >
            <Bookmark size={18} fill={saved ? "currentColor" : "none"} aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <div className="market-card__body">
        <div className="market-card__price">
          <strong>{formatCurrency(listing.price, locale, "INR", { maximumFractionDigits: 0 })}</strong>
          <span>{t("perUnit", { unit: listing.priceUnit })}</span>
        </div>
        {readOnly ? (
          <span className="market-card__title" dir="auto">{listing.title}</span>
        ) : (
          <Link className="market-card__title" href={`${hrefPrefix}/${listing.id}`} dir="auto">
            {listing.title}
          </Link>
        )}
        <p className="market-card__variety" dir="auto">
          {listing.variety} · {listing.grade}
        </p>

        <div className="market-card__facts">
          <span>
            <PackageCheck size={15} aria-hidden="true" />
            {t("quantityAvailable", { quantity: formatNumber(listing.quantity, locale), unit: listing.unit })}
          </span>
          <span>
            <CalendarRange size={15} aria-hidden="true" />
            <span dir="auto">{displayDate(listing.harvestStart)} – {displayDate(listing.harvestEnd)}</span>
          </span>
          <span>
            <Truck size={15} aria-hidden="true" />
            <span dir="auto">{formatList(listing.deliveryOptions.map(deliveryLabel), locale)}</span>
          </span>
        </div>

        {seller ? (
          <div className="market-card__farmer">
            <Avatar
              initials={seller.initials}
              imageUrl={seller.avatarUrl}
              role={seller.accountRole}
              size="small"
            />
            <div>
              <strong>
                {seller.fullName}{" "}
                {seller.verified ? <VerifiedBadge label={t("verifiedSupplier")} /> : null}
              </strong>
              <span>
                <MapPin size={12} aria-hidden="true" />
                {seller.district}, {seller.state}
              </span>
              <span>
                {t(roleKeys[seller.accountRole])}
                {seller.farmingMethod
                  ? ` · ${t("farmingLabel", { method: t(methodKeys[seller.farmingMethod]) })}`
                  : ""}
              </span>
              {listing.reviewSummary.count ? (
                <span className="rating-inline">
                  <Star size={12} fill="currentColor" aria-hidden="true" />
                  {t("reviewCount", {
                    rating: formatNumber(listing.reviewSummary.average, locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
                    count: formatNumber(listing.reviewSummary.count, locale),
                  })}
                </span>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}
