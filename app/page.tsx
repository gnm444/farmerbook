/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import {
  BadgeIndianRupee,
  Building2,
  Check,
  ContactRound,
  MapPinned,
  MessageCircleMore,
  PackageSearch,
  ShieldCheck,
  ShoppingBasket,
  Sprout,
  Warehouse,
} from "lucide-react";
import { PublicFooter } from "@/components/public-footer";
import { PublicHeader } from "@/components/public-header";
import { UnifiedMarketplace } from "@/features/marketplace/unified-marketplace";
import { loadUnifiedMarketplaceCatalog } from "@/features/marketplace/unified-catalog-loader";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { getServerI18n } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();
  return { title: t("home.metadataTitle") };
}

export default async function LandingPage() {
  const [{ t }, marketplaceItems] = await Promise.all([
    getServerI18n(),
    loadUnifiedMarketplaceCatalog(),
  ]);
  const companiesEnabled = isFeatureEnabled("ENABLE_AGRI_BUSINESSES");

  return (
    <>
      <PublicHeader />
      <main>
        <section className="hero">
          <div className="container hero-grid">
            <div className="hero-copy">
              <span className="badge hero-badge">
                <Sprout size={15} aria-hidden="true" />
                {t("home.buyerHeroBadge")}
              </span>
              <h1>{t("home.buyerHeroTitle")}</h1>
              <p>{t("home.buyerHeroBody")}</p>
              <div className="hero-actions">
                <Link className="button" href="/marketplace">
                  {t("home.shopDirectly")}
                </Link>
                <Link className="button button--secondary" href="/featured-farmers">
                  {t("home.meetFarmers")}
                </Link>
              </div>
              <div className="hero-note">
                <span>
                  <Check size={15} aria-hidden="true" /> {t("home.profilesPages")}
                </span>
                <span>
                  <Check size={15} aria-hidden="true" /> {t("home.produceServices")}
                </span>
                <span>
                  <Check size={15} aria-hidden="true" /> {t("home.noCommission")}
                </span>
              </div>
            </div>

            <div className="farm-hero-visual">
              <img
                className="farm-hero-image"
                src="/images/home/farmer-customer-field-hero.png"
                alt={t("home.buyerHeroImageAlt")}
                width={1672}
                height={941}
                loading="eager"
                fetchPriority="high"
                decoding="async"
              />
              <div className="farm-hero-caption">
                <span>{t("home.buyerHeroCaptionEyebrow")}</span>
                <strong>{t("home.buyerHeroCaptionTitle")}</strong>
                <small>{t("home.buyerHeroCaptionBody")}</small>
              </div>
              <div className="farm-hero-seal" aria-hidden="true">
                <Sprout size={20} />
                <span>{t("home.farmToMarket")}</span>
              </div>
              <div className="farm-hero-tags" aria-label={t("home.buyerProductTags")}>
                <span>{t("home.milk")}</span>
                <span>{t("home.vegetables")}</span>
                <span>{t("home.fruits")}</span>
                <span>{t("home.staplesAndOils")}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="section buyer-paths" aria-labelledby="buyer-paths-heading">
          <div className="container">
            <div className="section-heading buyer-paths__heading">
              <div>
                <p className="eyebrow">{t("home.buyerPathsEyebrow")}</p>
                <h2 id="buyer-paths-heading">{t("home.buyerPathsTitle")}</h2>
              </div>
              <p>{t("home.buyerPathsBody")}</p>
            </div>
            <div className="buyer-paths__grid">
              <article className="buyer-path-card">
                <img src="/images/marketplace/produce-market-hero.webp" alt="Farmers and customers selecting fresh produce together" width={1586} height={992} loading="lazy" decoding="async" />
                <div>
                  <ShoppingBasket size={22} aria-hidden="true" />
                  <h3>{t("home.buyDirectTitle")}</h3>
                  <p>{t("home.buyDirectBody")}</p>
                  <Link href="/marketplace">{t("home.browseNaturalProducts")} →</Link>
                </div>
              </article>
              <article className="buyer-path-card">
                <img src="/images/home/farmer-network-hero.webp" alt="Farmer standing among vegetable rows and ready produce" width={1586} height={992} loading="lazy" decoding="async" />
                <div>
                  <ContactRound size={22} aria-hidden="true" />
                  <h3>{t("home.meetFarmersTitle")}</h3>
                  <p>{t("home.meetFarmersBody")}</p>
                  <Link href="/featured-farmers">{t("home.meetFarmers")} →</Link>
                </div>
              </article>
              <article className="buyer-path-card">
                <img src="/images/featured-farmers/kuna-ramam-working-field.jpg" alt="Farmer working in a field during a farm visit" width={2976} height={1676} loading="lazy" decoding="async" />
                <div>
                  <MapPinned size={22} aria-hidden="true" />
                  <h3>{t("home.visitFieldsTitle")}</h3>
                  <p>{t("home.visitFieldsBody")}</p>
                  <Link href="/farm-visits">{t("home.requestFarmVisit")} →</Link>
                </div>
              </article>
            </div>
          </div>
        </section>

        <UnifiedMarketplace
          items={marketplaceItems}
          labels={{
            eyebrow: t("home.marketplaceHubEyebrow"),
            title: t("home.marketplaceHubTitle"),
            description: t("home.marketplaceHubBody"),
            searchLabel: t("home.marketplaceSearchLabel"),
            searchPlaceholder: t("home.marketplaceSearchPlaceholder"),
            categoryLabel: t("home.marketplaceCategoryLabel"),
            allCategories: t("home.marketplaceAllCategories"),
            byProduct: t("home.marketplaceByProduct"),
            bySeller: t("home.marketplaceBySeller"),
            resultCount: t("home.marketplaceResultCount"),
            sellerCount: t("home.marketplaceSellerCount"),
            noResultsTitle: t("home.marketplaceNoResultsTitle"),
            noResultsBody: t("home.marketplaceNoResultsBody"),
            browse: t("home.marketplaceBrowse"),
            orderEnquiry: t("home.marketplaceOrderEnquiry"),
            priceOnRequest: t("home.marketplacePriceOnRequest"),
            externalStore: t("home.marketplaceExternalStore"),
            reportedCatalogue: t("home.marketplaceReportedCatalogue"),
            liveListing: t("home.marketplaceLiveListing"),
            liveOffer: t("home.marketplaceLiveOffer"),
            farmerBookStore: t("home.marketplaceFarmerBookStore"),
            partnerStore: t("home.marketplacePartnerStore"),
            editorialCatalogue: t("home.marketplaceEditorialCatalogue"),
            disclosure: t("home.marketplaceDisclosure"),
          }}
        />

        <section className="trust-strip" aria-label={t("home.principles")}>
          <div className="container trust-grid">
            <div className="trust-item">
              <div className="trust-icon">
                <MapPinned size={22} aria-hidden="true" />
              </div>
              <div>
                <strong>{t("home.discoverable")}</strong>
                <span>{t("home.discoverableHelp")}</span>
              </div>
            </div>
            <div className="trust-item">
              <div className="trust-icon">
                <ShieldCheck size={22} aria-hidden="true" />
              </div>
              <div>
                <strong>{t("home.trustListings")}</strong>
                <span>{t("home.trustListingsHelp")}</span>
              </div>
            </div>
            <div className="trust-item">
              <div className="trust-icon">
                <BadgeIndianRupee size={22} aria-hidden="true" />
              </div>
              <div>
                <strong>{t("home.directRelationships")}</strong>
                <span>{t("home.directRelationshipsHelp")}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="section ecosystem-showcase" aria-labelledby="ecosystem-heading">
          <div className="container">
            <div className="section-heading ecosystem-heading">
              <div>
                <p className="eyebrow">{t("home.everyAgriculture")}</p>
                <h2 id="ecosystem-heading">{t("home.fieldsSpecialist")}</h2>
              </div>
              <p>{t("home.ecosystemBody")}</p>
            </div>
            <div className="ecosystem-gallery">
              <article className="ecosystem-tile ecosystem-tile--wide">
                <img
                  src="/images/deccan/country-chicken-eggs.webp"
                  alt={t("home.poultryAlt")}
                  width={1536}
                  height={1024}
                  loading="lazy"
                  decoding="async"
                />
                <div>
                  <span>{t("home.poultryAllied")}</span>
                  <strong>{t("home.poultryHelp")}</strong>
                </div>
              </article>
              <article className="ecosystem-tile">
                <img
                  src="/images/deccan/farm-dairy.webp"
                  alt={t("home.dairyAlt")}
                  width={1448}
                  height={1086}
                  loading="lazy"
                  decoding="async"
                />
                <div>
                  <span>{t("home.dairyLivestock")}</span>
                  <strong>{t("home.dairyHelp")}</strong>
                </div>
              </article>
              <article className="ecosystem-tile">
                <img
                  src="/images/deccan/seasonal-fruit.webp"
                  alt={t("home.fruitAlt")}
                  width={1448}
                  height={1086}
                  loading="lazy"
                  decoding="async"
                />
                <div>
                  <span>{t("home.horticulture")}</span>
                  <strong>{t("home.horticultureHelp")}</strong>
                </div>
              </article>
              <article className="ecosystem-tile ecosystem-tile--wide">
                <img
                  src="/images/deccan/organic-pickles.webp"
                  alt={t("home.processingAlt")}
                  width={1727}
                  height={911}
                  loading="lazy"
                  decoding="async"
                />
                <div>
                  <span>{t("home.valueAddition")}</span>
                  <strong>{t("home.valueAdditionHelp")}</strong>
                </div>
              </article>
            </div>
            <p className="ecosystem-disclosure">
              {t("home.galleryDisclosure")}
            </p>
          </div>
        </section>

        <section className="section segment-section" id="segments">
          <div className="container">
            <div className="section-heading section-heading--center">
              <p className="eyebrow">
                {companiesEnabled ? t("home.fourWays") : t("home.threeWays")}
              </p>
              <h2>{t("home.trustedMarketplace")}</h2>
              <p>{t("home.rolesBody")}</p>
            </div>
            <div className={`segment-grid${companiesEnabled ? " segment-grid--four" : ""}`}>
              <article className="card segment-card">
                <Sprout size={24} aria-hidden="true" />
                <h3>{t("home.farmers")}</h3>
                <p>{t("home.farmerBody")}</p>
                <Link href="/signup">{t("home.createFarmer")}</Link>
              </article>
              <article className="card segment-card">
                <ShoppingBasket size={24} aria-hidden="true" />
                <h3>{t("home.customers")}</h3>
                <p>{t("home.customerBody")}</p>
                <Link href="/marketplace">{t("home.browseProduce")}</Link>
              </article>
              <article className="card segment-card">
                <Warehouse size={24} aria-hidden="true" />
                <h3>{t("home.wholesalers")}</h3>
                <p>{t("home.wholesalerBody")}</p>
                <Link href="/signup">{t("home.createWholesaler")}</Link>
              </article>
              {companiesEnabled ? (
                <article className="card segment-card">
                  <Building2 size={24} aria-hidden="true" />
                  <h3>{t("home.incs")}</h3>
                  <p>{t("home.incBody")}</p>
                  <Link href="/signup">{t("home.createInc")}</Link>
                </article>
              ) : null}
            </div>
          </div>
        </section>

        <section className="section" id="why">
          <div className="container">
            <div className="section-heading">
              <p className="eyebrow">{t("home.professionalTools")}</p>
              <h2>{t("home.reputationTitle")}</h2>
              <p>{t("home.reputationBody")}</p>
            </div>
            <div className="feature-grid">
              <article className="card feature-card">
                <div className="feature-icon">
                  <ContactRound size={22} aria-hidden="true" />
                </div>
                <h3>{t("home.professionalProfile")}</h3>
                <p>{t("home.professionalProfileHelp")}</p>
              </article>
              <article className="card feature-card">
                <div className="feature-icon">
                  <PackageSearch size={22} aria-hidden="true" />
                </div>
                <h3>{t("home.readyToSell")}</h3>
                <p>{t("home.readyToSellHelp")}</p>
              </article>
              <article className="card feature-card">
                <div className="feature-icon">
                  <MessageCircleMore size={22} aria-hidden="true" />
                </div>
                <h3>{t("home.enquiriesCustomers")}</h3>
                <p>{t("home.enquiriesCustomersHelp")}</p>
              </article>
            </div>
          </div>
        </section>

        <section className="section section--green" id="how">
          <div className="container">
            <div className="section-heading section-heading--center">
              <p className="eyebrow">{t("home.howWorks")}</p>
              <h2>{t("home.profileConversation")}</h2>
              <p>{t("home.howBody")}</p>
            </div>
            <div className="steps-grid">
              <article className="step-card">
                <div className="step-number">1</div>
                <h3>{t("home.createProfile")}</h3>
                <p>{t("home.createProfileHelp")}</p>
              </article>
              <article className="step-card">
                <div className="step-number">2</div>
                <h3>{t("home.publishAvailability")}</h3>
                <p>{t("home.publishAvailabilityHelp")}</p>
              </article>
              <article className="step-card">
                <div className="step-number">3</div>
                <h3>{t("home.buildLoyalty")}</h3>
                <p>{t("home.buildLoyaltyHelp")}</p>
              </article>
            </div>
          </div>
        </section>

        <section className="section founder-note" id="who-we-are" aria-labelledby="founder-note-heading">
          <div className="container founder-note__grid">
            <div className="founder-note__intro">
              <p className="eyebrow">Who we are</p>
              <h2 id="founder-note-heading">We are here to make success more human.</h2>
              <p>
                FarmerBook began with a simple belief: farmers, relationships and the work that keeps people fed deserve more respect, visibility and care.
              </p>
            </div>
            <div className="founder-note__letter">
              <p>
                When I chose not to drink at parties, spoke about natural farming, or said that relationships mattered more than money, I was sometimes treated as though I did not belong. Yet in difficult moments, people helped me without asking what they would get back. Their kindness felt sacred.
              </p>
              <p>
                I came to see that money can bring security and physical comfort, but it is not the whole measure of a good life. Real success also means dignity in work, honest relationships, health, belonging and the ability to leave something sustainable for the next generation.
              </p>
              <p>
                FarmerBook is my way of returning that help to the world: a professional home where farmers can be recognised for their work, connect with one another, build fair opportunities and help renew the values that hold communities together.
              </p>
              <footer>
                <strong>Narasimha Gonapa</strong>
                <span>Founder, FarmerBook</span>
              </footer>
            </div>
          </div>
        </section>

        <section className="cta">
          <div className="container cta-card">
            <div>
              <p className="eyebrow">{t("home.designedIndia")}</p>
              <h2>{t("home.easierTrust")}</h2>
              <p>{t("home.ctaBody")}</p>
            </div>
            <Link className="button" href="/signup">
              {t("home.startReach")}
            </Link>
          </div>
        </section>
      </main>
      <PublicFooter />
    </>
  );
}
