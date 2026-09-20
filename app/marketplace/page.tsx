import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Leaf, Store } from "lucide-react";
import { PublicFooter } from "@/components/public-footer";
import { PublicHeader } from "@/components/public-header";
import { loadPublicOffers } from "@/features/offers/queries";
import { MarketplaceMatchAgent } from "@/features/marketplace/marketplace-match-agent";
import { loadPublicListings } from "@/features/marketplace/queries";
import { UnifiedMarketplace } from "@/features/marketplace/unified-marketplace";
import { buildUnifiedMarketplaceCatalog } from "@/features/marketplace/unified-catalog";
import { formatNumber, getServerI18n, getServerTranslations } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Fresh produce marketplace",
  description:
    "Discover active agriculture sellers, compare current harvest lots and send a direct buyer enquiry.",
};

export default async function MarketplacePage() {
  const [listings, i18n, { t: homeT }, offers] = await Promise.all([
    loadPublicListings(),
    getServerTranslations("market"),
    getServerI18n(),
    loadPublicOffers({ limit: 50 }).catch(() => []),
  ]);
  const { locale, t } = i18n;
  const marketplaceItems = buildUnifiedMarketplaceCatalog({
    produceListings: listings,
    businessOffers: offers,
  });
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
                <a className="button" href="#unified-marketplace">
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

        <UnifiedMarketplace
          items={marketplaceItems}
          compact
          labels={{
            eyebrow: homeT("home.marketplaceHubEyebrow"),
            title: homeT("home.marketplaceHubTitle"),
            description: homeT("home.marketplaceHubBody"),
            searchLabel: homeT("home.marketplaceSearchLabel"),
            searchPlaceholder: homeT("home.marketplaceSearchPlaceholder"),
            categoryLabel: homeT("home.marketplaceCategoryLabel"),
            allCategories: homeT("home.marketplaceAllCategories"),
            byProduct: homeT("home.marketplaceByProduct"),
            bySeller: homeT("home.marketplaceBySeller"),
            byCategory: homeT("home.marketplaceByCategory"),
            resultCount: homeT("home.marketplaceResultCount"),
            sellerCount: homeT("home.marketplaceSellerCount"),
            categoryCount: homeT("home.marketplaceCategoryCount"),
            noResultsTitle: homeT("home.marketplaceNoResultsTitle"),
            noResultsBody: homeT("home.marketplaceNoResultsBody"),
            browse: homeT("home.marketplaceBrowse"),
            orderEnquiry: homeT("home.marketplaceOrderEnquiry"),
            priceOnRequest: homeT("home.marketplacePriceOnRequest"),
            externalStore: homeT("home.marketplaceExternalStore"),
            reportedCatalogue: homeT("home.marketplaceReportedCatalogue"),
            liveListing: homeT("home.marketplaceLiveListing"),
            liveOffer: homeT("home.marketplaceLiveOffer"),
            farmerBookStore: homeT("home.marketplaceFarmerBookStore"),
            partnerStore: homeT("home.marketplacePartnerStore"),
            editorialCatalogue: homeT("home.marketplaceEditorialCatalogue"),
            disclosure: homeT("home.marketplaceDisclosure"),
          }}
        />

        <section className="marketplace-content" id="available-produce">
          <div className="container">
            <div className="section-heading marketplace-heading">
              <p className="eyebrow">{t("harvestMarketplace")}</p>
              <h2>{t("availableNetwork")}</h2>
              <p>{t("networkHelp")}</p>
            </div>
            <MarketplaceMatchAgent />
          </div>
        </section>
      </main>
      <PublicFooter />
    </>
  );
}
