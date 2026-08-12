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
import { isFeatureEnabled } from "@/lib/feature-flags";
import { getServerI18n } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();
  return { title: t("home.metadataTitle") };
}

export default async function LandingPage() {
  const { t } = await getServerI18n();
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
                {t("home.heroBadge")}
              </span>
              <h1>{t("home.heroTitle")}</h1>
              <p>{t("home.heroBody")}</p>
              <div className="hero-actions">
                <Link className="button" href="/signup">
                  {t("home.joinNetwork")}
                </Link>
                <Link className="button button--secondary" href="/marketplace">
                  {t("home.exploreMarketplace")}
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
                src="/images/deccan/farmer-and-poultry.webp"
                alt={t("home.heroImageAlt")}
                width={1804}
                height={872}
                loading="eager"
                fetchPriority="high"
                decoding="async"
              />
              <div className="farm-hero-caption">
                <span>{t("home.oneNetwork")}</span>
                <strong>{t("home.builtAroundIndia")}</strong>
                <small>{t("home.editorialDisclosure")}</small>
              </div>
              <div className="farm-hero-seal" aria-hidden="true">
                <Sprout size={20} />
                <span>{t("home.farmToMarket")}</span>
              </div>
              <div className="farm-hero-tags" aria-label={t("home.supportedAreas")}>
                <span>{t("home.poultry")}</span>
                <span>{t("home.produce")}</span>
                <span>{t("home.dairy")}</span>
                <span>{t("home.services")}</span>
              </div>
            </div>
          </div>
        </section>

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
