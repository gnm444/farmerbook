import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarRange,
  Eye,
  ExternalLink,
  MapPin,
  PackageCheck,
  ShieldCheck,
  Star,
  Store,
  Truck,
} from "lucide-react";
import { PublicFooter } from "@/components/public-footer";
import { PublicHeader } from "@/components/public-header";
import { Avatar, VerifiedBadge } from "@/components/ui";
import { ProduceInquiryGate } from "@/features/marketplace/inquiry-gate";
import { ReportTargetButton } from "@/features/moderation/report-target-button";
import { ListingCard } from "@/features/marketplace/listing-card";
import { ListingImage } from "@/features/marketplace/listing-image";
import { ReviewList } from "@/features/reviews/review-list";
import { loadReviewsForListing } from "@/features/reviews/queries";
import {
  loadListingById,
  loadPublicListings,
} from "@/features/marketplace/queries";
import { formatCurrency, formatDate, formatList, formatNumber, getServerTranslations } from "@/lib/i18n";
import type { AccountRole, FarmingMethod } from "@/lib/types";

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

function marketDate(value: string, locale: string) {
  return /^\d{4}-\d{2}-\d{2}/.test(value)
    ? formatDate(value, locale, { dateStyle: "medium" })
    : value;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ listingId: string }>;
}): Promise<Metadata> {
  const { listingId } = await params;
  const [listing, { t }] = await Promise.all([
    loadListingById(listingId),
    getServerTranslations("market"),
  ]);
  if (!listing) return { title: t("listingMetadataFallback") };
  return {
    title: listing.title,
    description: t("listingMetadataDescription", {
      quantity: listing.quantity,
      unit: listing.unit,
      variety: listing.variety,
      crop: listing.crop,
      district: listing.seller?.district ?? t("activeSeller"),
    }),
  };
}

export default async function MarketplaceListingPage({
  params,
}: {
  params: Promise<{ listingId: string }>;
}) {
  const { listingId } = await params;
  const [listing, allListings, reviews, { t, locale }] = await Promise.all([
    loadListingById(listingId),
    loadPublicListings(),
    loadReviewsForListing(listingId),
    getServerTranslations("market"),
  ]);
  if (!listing) notFound();
  const seller = listing.seller;
  const related = allListings
    .filter((item) => item.id !== listing.id && item.crop === listing.crop)
    .slice(0, 3);
  const deliveryLabel = (option: string) => {
    if (option === "Farm pickup") return t("farmPickup");
    if (option === "Collection centre") return t("collectionCentre");
    if (option === "Transport arranged") return t("transportArranged");
    return option;
  };

  return (
    <>
      <PublicHeader />
      <main className="listing-page">
        <div className="container">
          <Link className="back-link" href="/marketplace">
            <ArrowLeft size={16} aria-hidden="true" />
            {t("backToMarketplace")}
          </Link>

          <div className="listing-detail-grid">
            <section className="listing-detail">
              <div className="listing-detail__image">
                <ListingImage
                  className="listing-photo listing-detail__photo"
                  variant={listing.imageVariant}
                  loading="eager"
                />
                <span className="market-card__availability">{t("availableNow")}</span>
                <span className="listing-detail__views">
                  <Eye size={15} aria-hidden="true" />
                  {t("views", { count: formatNumber(listing.viewCount, locale) })}
                </span>
              </div>

              <div className="listing-detail__heading">
                <div>
                  <div className="listing-detail__tags">
                    <span className="badge badge--green" dir="auto">{listing.crop}</span>
                    {listing.certifications.map((item) => (
                      <span className="badge" key={item}>
                        <BadgeCheck size={13} aria-hidden="true" /> {t("sellerDeclared", { claim: item })}
                      </span>
                    ))}
                  </div>
                  <h1 dir="auto">{listing.title}</h1>
                  <p dir="auto">{listing.variety} · {listing.grade}</p>
                </div>
                <div className="listing-detail__price">
                  <strong>{formatCurrency(listing.price, locale, "INR", { maximumFractionDigits: 0 })}</strong>
                  <span>{t("perUnit", { unit: listing.priceUnit })}</span>
                </div>
              </div>

              <section className="listing-facts-grid" aria-label={t("supplyDetails")}>
                <div>
                  <PackageCheck size={20} aria-hidden="true" />
                  <span><strong>{formatNumber(listing.quantity, locale)} {listing.unit}</strong>{t("available")}</span>
                </div>
                <div>
                  <Store size={20} aria-hidden="true" />
                  <span><strong>{formatNumber(listing.minOrder, locale)} {listing.priceUnit}</strong>{t("minimumOrder")}</span>
                </div>
                <div>
                  <CalendarRange size={20} aria-hidden="true" />
                  <span><strong dir="auto">{marketDate(listing.harvestStart, locale)} – {marketDate(listing.harvestEnd, locale)}</strong>{t("harvestWindow")}</span>
                </div>
                <div>
                  <Truck size={20} aria-hidden="true" />
                  <span><strong dir="auto">{deliveryLabel(listing.deliveryOptions[0])}</strong>{listing.deliveryRadiusKm ? t("withinDistance", { distance: formatNumber(listing.deliveryRadiusKm, locale) }) : t("askForOptions")}</span>
                </div>
              </section>

              <section className="card listing-description">
                <h2>{t("aboutHarvest")}</h2>
                <p dir="auto">{listing.description}</p>
                <div className="listing-description__rows">
                  <span><strong>{t("availableUntil")}</strong><span dir="auto">{marketDate(listing.availableUntil, locale)}</span></span>
                  <span><strong>{t("delivery")}</strong><span dir="auto">{formatList(listing.deliveryOptions.map(deliveryLabel), locale)}</span></span>
                  <span><strong>{t("quality")}</strong><span dir="auto">{listing.grade}</span></span>
                </div>
              </section>

              {seller ? (
                <section className="card seller-card">
                  <div className="seller-card__head">
                    <Avatar initials={seller.initials} imageUrl={seller.avatarUrl} role={seller.accountRole} size="large" />
                    <div>
                      <p className="eyebrow">{t("yourSeller")}</p>
                      <h2>
                        {seller.fullName}{" "}
                        {seller.verified ? <VerifiedBadge label={t("verifiedSupplier")} /> : null}
                      </h2>
                      <p>
                        {t(roleKeys[seller.accountRole])}
                        {seller.farmingMethod
                          ? ` · ${t("farmingLabel", { method: t(methodKeys[seller.farmingMethod]) })}`
                          : ""}{" "}
                        · @{seller.handle}
                      </p>
                    </div>
                  </div>
                  <p dir="auto">{seller.bio}</p>
                  <div className="seller-card__proof">
                    <span><MapPin size={15} aria-hidden="true" />{seller.district}, {seller.state}</span>
                    {seller.experienceYears != null ? (
                      <span><ShieldCheck size={15} aria-hidden="true" />{t("yearsExperience", { count: formatNumber(seller.experienceYears, locale) })}</span>
                    ) : null}
                    {listing.reviewSummary.count ? (
                      <span>
                        <Star size={15} fill="currentColor" aria-hidden="true" />
                        {t("reviewsSummary", {
                          rating: formatNumber(listing.reviewSummary.average, locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
                          count: formatNumber(listing.reviewSummary.count, locale),
                        })}
                      </span>
                    ) : null}
                  </div>
                  <div className="social-link-row">
                    {Object.entries(seller.socialLinks).map(([network, url]) =>
                      url ? (
                        <a
                          href={url}
                          key={network}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink size={14} aria-hidden="true" />
                          {network}
                        </a>
                      ) : null,
                    )}
                  </div>
                  <Link className="button button--secondary" href={`/store/${seller.handle}`}>
                    {t("viewStorefront")}
                  </Link>
                  <ReportTargetButton
                    targetType="produce_listing"
                    targetId={listing.id}
                    label={t("listing")}
                  />
                </section>
              ) : null}
              <ReviewList reviews={reviews} title={t("reviewsForProduce")} />
            </section>

            <aside className="card inquiry-card">
              <p className="eyebrow">{t("contactSeller")}</p>
              <h2>{t("askAboutLot")}</h2>
              <p>{t("privateInboxIntro", { seller: seller?.fullName ?? t("theSeller") })}</p>
              <ProduceInquiryGate
                listingId={listing.id}
                sellerName={seller?.fullName ?? t("theSeller")}
              />
            </aside>
          </div>

          {related.length ? (
            <section className="related-market">
              <div className="section-heading">
                <p className="eyebrow">{t("moreOptions")}</p>
                <h2>{t("similarProduce")}</h2>
              </div>
              <div className="market-grid">
                {related.map((item) => <ListingCard key={item.id} listing={item} />)}
              </div>
            </section>
          ) : null}
        </div>
      </main>
      <PublicFooter />
    </>
  );
}
