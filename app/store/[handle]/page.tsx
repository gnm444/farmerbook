import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  BadgeCheck,
  CalendarDays,
  ExternalLink,
  MapPin,
  MessageCircleMore,
  ShieldCheck,
  Sprout,
} from "lucide-react";
import { PublicFooter } from "@/components/public-footer";
import { PublicHeader } from "@/components/public-header";
import { Avatar, VerifiedBadge } from "@/components/ui";
import { ListingCard } from "@/features/marketplace/listing-card";
import { loadStorefront } from "@/features/marketplace/queries";
import { ReviewList } from "@/features/reviews/review-list";
import { loadReviewsForSeller } from "@/features/reviews/queries";
import { formatNumber, getServerTranslations } from "@/lib/i18n";
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const [{ profile }, { t }] = await Promise.all([
    loadStorefront(handle),
    getServerTranslations("market"),
  ]);
  return {
    title: profile ? t("storefrontMetadata", { name: profile.fullName }) : t("sellerStorefront"),
    description: profile
      ? t("storefrontDescription", { name: profile.fullName, district: profile.district, state: profile.state })
      : undefined,
  };
}

export default async function StorefrontPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const [{ profile, listings }, { t, locale }] = await Promise.all([
    loadStorefront(handle),
    getServerTranslations("market"),
  ]);
  if (!profile) notFound();
  const reviews = await loadReviewsForSeller(profile.id);
  const approvedSocialLinks = Object.entries(profile.socialLinks).filter(
    (entry): entry is [string, string] => typeof entry[1] === "string",
  );

  return (
    <>
      <PublicHeader />
      <main className="storefront-page">
        <section className="storefront-cover">
          <div className="container storefront-cover__inner">
            <div className="storefront-identity">
              <Avatar initials={profile.initials} imageUrl={profile.avatarUrl} role={profile.accountRole} size="large" />
              <div>
                <span className="badge badge--amber">
                  <Sprout size={14} aria-hidden="true" /> {t("storefront", { role: t(roleKeys[profile.accountRole]) })}
                </span>
                <h1>
                  {profile.fullName}{" "}
                  {profile.verified ? <VerifiedBadge label={t("verifiedSupplier")} /> : null}
                </h1>
                <p>
                  {t(roleKeys[profile.accountRole])}
                  {profile.farmingMethod ? ` · ${t("farmingLabel", { method: t(methodKeys[profile.farmingMethod]) })}` : ""}
                  {" "}· @{profile.handle}
                </p>
                <div className="storefront-meta">
                  <span><MapPin size={15} aria-hidden="true" /> {profile.district}, {profile.state}</span>
                  {profile.experienceYears != null ? (
                    <span><CalendarDays size={15} aria-hidden="true" /> {t("yearsExperience", { count: formatNumber(profile.experienceYears, locale) })}</span>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="storefront-trust">
              <div><strong>{formatNumber(listings.length, locale)}</strong><span>{t("availableLots")}</span></div>
              {profile.reviewSummary.count ? (
                <div><strong>{formatNumber(profile.reviewSummary.count, locale)}</strong><span>{t("purchaseReviews")}</span></div>
              ) : null}
            </div>
          </div>
        </section>

        <div className="container storefront-content">
          <div className="storefront-about-grid">
            <section className="card storefront-about">
              <p className="eyebrow">{t("aboutSeller")}</p>
              <h2>{t("professionalTrust")}</h2>
              <p dir="auto">{profile.bio}</p>
              <div className="profile-card__crops">
                {profile.crops.map((crop) => <span className="badge badge--green" key={crop}>{crop}</span>)}
              </div>
              <div className="social-link-row">
                {approvedSocialLinks.length ? approvedSocialLinks.map(([network, url]) => (
                  <a
                    href={url}
                    key={network}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink size={14} aria-hidden="true" /> {network}
                  </a>
                )) : profile.accountRole === "farmer" ? (
                  <span className="form-helper">{t("noApprovedSocialLinks")}</span>
                ) : null}
              </div>
            </section>
            <section className="card storefront-promise">
              <ShieldCheck size={24} aria-hidden="true" />
              <div>
                <h2>{t("trustSignals")}</h2>
                <p>{t("trustSignalsHelp")}</p>
              </div>
              <ul>
                <li>
                  <BadgeCheck size={15} aria-hidden="true" />
                  {profile.verified ? t("verifiedParticipant") : t("identityLocation")}
                </li>
                <li><MessageCircleMore size={15} aria-hidden="true" /> {t("privateBuyerEnquiries")}</li>
                <li><Sprout size={15} aria-hidden="true" /> {t("currentCropDetails")}</li>
              </ul>
            </section>
          </div>

          <section className="storefront-listings">
            <div className="section-heading">
              <p className="eyebrow">{t("currentHarvest")}</p>
              <h2>{t("availableProduce")}</h2>
              <p>{t("openLotHelp")}</p>
            </div>
            {listings.length ? (
              <div className="market-grid">
                {listings.map((listing) => <ListingCard key={listing.id} listing={listing} />)}
              </div>
            ) : (
              <section className="card empty-state">
                <div>
                  <Sprout size={28} aria-hidden="true" />
                  <h2>{t("noActiveLots")}</h2>
                  <p>{t("noActiveLotsHelp")}</p>
                </div>
              </section>
            )}
          </section>
          <ReviewList reviews={reviews} />
        </div>
      </main>
      <PublicFooter />
    </>
  );
}
