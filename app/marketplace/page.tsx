import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Leaf, Store } from "lucide-react";
import { PublicFooter } from "@/components/public-footer";
import { PublicHeader } from "@/components/public-header";
import { MarketBrowser } from "@/features/marketplace/market-browser";
import { loadPublicListings } from "@/features/marketplace/queries";
import { formatNumber, getServerTranslations } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Fresh produce marketplace",
  description:
    "Discover active agriculture sellers, compare current harvest lots and send a direct buyer enquiry.",
};

export default async function MarketplacePage() {
  const [listings, i18n] = await Promise.all([
    loadPublicListings(),
    getServerTranslations("market"),
  ]);
  const { locale, t } = i18n;
  const districtCount = new Set(
    listings.map((listing) => listing.seller?.district).filter(Boolean),
  ).size;

  return (
    <>
      <PublicHeader />
      <main className="marketplace-page">
        <section className="marketplace-hero">
          <div className="container marketplace-hero__grid">
            <div>
              <span className="badge badge--amber">
                <Leaf size={14} aria-hidden="true" />
                {t("directTrustedFarms")}
              </span>
              <h1>{t("heroTitle")}</h1>
              <p>{t("heroBody")}</p>
              <div className="hero-actions">
                <a className="button" href="#available-produce">
                  {t("browseProduce")}
                </a>
                <Link className="button button--secondary" href="/signup">
                  {t("listHarvest")}
                </Link>
              </div>
              <div className="marketplace-hero__stats">
                <span>{t("liveLots", { count: formatNumber(listings.length, locale) })}</span>
                <span>{t("sourcingDistricts", { count: formatNumber(districtCount, locale) })}</span>
                <span><strong>{t("direct")}</strong> {t("farmerEnquiries")}</span>
              </div>
            </div>
            <div className="marketplace-hero__visual">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="marketplace-hero__image"
                src="/images/marketplace/produce-market-hero.webp"
                alt={t("heroImageAlt")}
                width={1586}
                height={992}
                loading="eager"
                decoding="async"
              />
              <div className="marketplace-visual__card">
                <span className="marketplace-visual__icon"><Store size={22} aria-hidden="true" /></span>
                <div>
                  <small>{t("illustrativeEnquiry")}</small>
                  <strong>{t("recurringTomatoes")}</strong>
                  <span>{t("exampleActivity")}</span>
                </div>
                <ArrowRight size={18} aria-hidden="true" />
              </div>
            </div>
          </div>
        </section>

        <section className="marketplace-content" id="available-produce">
          <div className="container">
            <div className="section-heading marketplace-heading">
              <p className="eyebrow">{t("harvestMarketplace")}</p>
              <h2>{t("availableNetwork")}</h2>
              <p>{t("networkHelp")}</p>
            </div>
            <MarketBrowser listings={listings} />
          </div>
        </section>
      </main>
      <PublicFooter />
    </>
  );
}
