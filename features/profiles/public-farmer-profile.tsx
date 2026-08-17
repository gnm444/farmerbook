import Link from "next/link";
import {
  BadgeCheck,
  CalendarDays,
  ChevronRight,
  ExternalLink,
  Handshake,
  Leaf,
  MapPin,
  MessageCircle,
  PackageSearch,
  ShieldCheck,
  Sprout,
  Star,
  Store,
  Users,
} from "lucide-react";
import { Avatar, VerifiedBadge } from "@/components/ui";
import { ListingImage } from "@/features/marketplace/listing-image";
import type {
  FarmerProfile,
  MarketReview,
  ProduceListing,
} from "@/lib/types";
import {
  DEFAULT_LOCALE,
  createTranslator,
  englishMessages,
  formatCurrency,
  formatList,
  formatNumber,
  type InterpolationValues,
  type MessageName,
  type Messages,
  type SupportedLocale,
} from "@/lib/i18n";
import { ShareProfileButton } from "./share-profile-button";
import { OrganicCertificationLabel } from "./organic-certification";

type PublicProfileTranslator = (
  name: MessageName<"publicProfile">,
  values?: InterpolationValues,
) => string;

function readableMethod(
  method: FarmerProfile["farmingMethod"],
  t: PublicProfileTranslator,
) {
  if (!method) return t("independent");
  return t(
    ({
      organic: "methodOrganic",
      natural: "methodNatural",
      conventional: "methodConventional",
      mixed: "methodMixed",
    } as const)[method],
  );
}

function cropList(
  crops: string[],
  locale: SupportedLocale,
  t: PublicProfileTranslator,
) {
  if (!crops.length) return t("seasonalProduce");
  return formatList(crops.slice(0, 3), locale);
}

function professionalHeadline(
  profile: FarmerProfile,
  locale: SupportedLocale,
  t: PublicProfileTranslator,
) {
  return t("headline", {
    method: readableMethod(profile.farmingMethod, t),
    crops: cropList(profile.crops, locale, t),
    district: profile.district,
  });
}

function networkLabel(
  profile: FarmerProfile,
  locale: SupportedLocale,
  t: PublicProfileTranslator,
) {
  if (!profile.followers && !profile.following) return t("newProfile");
  return t("networkCount", {
    followers: formatNumber(profile.followers, locale),
    following: formatNumber(profile.following, locale),
  });
}

export function PublicFarmerProfile({
  profile,
  listings,
  reviews,
  isExample = false,
  locale = DEFAULT_LOCALE,
  messages = englishMessages,
}: {
  profile: FarmerProfile;
  listings: ProduceListing[];
  reviews: MarketReview[];
  isExample?: boolean;
  locale?: SupportedLocale;
  messages?: Messages;
}) {
  const translate = createTranslator(messages);
  const t: PublicProfileTranslator = (name, values) =>
    translate(`publicProfile.${name}`, values);
  const averageRating = reviews.length
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : 0;
  const primaryListing = listings[0];
  const enquiryHref = isExample
    ? "/marketplace/demo"
    : primaryListing
      ? `/marketplace/${primaryListing.id}`
      : "/marketplace";
  const focusTags = [
    ...(profile.farmingMethod
      ? [t("methodFarming", { method: readableMethod(profile.farmingMethod, t) })]
      : []),
    ...profile.crops,
  ];
  const approvedSocialLinks = Object.entries(profile.socialLinks).filter(
    (entry): entry is [string, string] => typeof entry[1] === "string",
  );

  return (
    <main className="public-farmer-page">
      <div className="container public-farmer-shell">
        {isExample ? (
          <aside className="public-farmer-example-note" role="note">
            <ShieldCheck size={20} aria-hidden="true" />
            <span>
              <strong>{t("exampleTitle")}</strong>
              {t("exampleBody")}
            </span>
          </aside>
        ) : null}
        <section className="card public-farmer-profile-card">
          <div className="public-farmer-cover">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={profile.coverUrl ?? "/images/home/farmer-network-hero.webp"}
              alt={
                profile.coverUrl
                  ? t("customCoverAlt", { name: profile.fullName })
                  : t("defaultCoverAlt")
              }
              width={1600}
              height={500}
            />
            <span className="public-farmer-cover__label">
              <Leaf size={15} aria-hidden="true" /> {t("professionalFarmProfile")}
            </span>
          </div>

          <div className="public-farmer-intro">
            <div className="public-farmer-intro__top">
              <div className="public-farmer-identity">
                <Avatar
                  initials={profile.initials}
                  imageUrl={profile.avatarUrl}
                  role="farmer"
                  size="large"
                />
                <div className="public-farmer-title">
                  <span className="badge badge--amber">
                    <Sprout size={14} aria-hidden="true" /> {t("farmerBadge")}
                  </span>
                  <h1>
                    {profile.fullName}{" "}
                    {profile.verified ? (
                      <VerifiedBadge label={t("verifiedParticipant")} />
                    ) : null}
                  </h1>
                  <p className="public-farmer-headline">
                    {professionalHeadline(profile, locale, t)}
                  </p>
                  <OrganicCertificationLabel profile={profile} />
                  <p className="public-farmer-location">
                    <MapPin size={15} aria-hidden="true" /> {profile.district},{" "}
                    {profile.state} · <a href="#contact">{t("contactLinks")}</a>
                  </p>
                  <p className="public-farmer-network">{networkLabel(profile, locale, t)}</p>
                </div>
              </div>

              <div className="public-farmer-affiliations" aria-label={t("profileHighlights")}>
                <span>
                  <ShieldCheck size={22} aria-hidden="true" />
                  <span>
                    <strong>{profile.verified ? t("verifiedProfile") : t("communityProfile")}</strong>
                    <small>{t("trustStatus")}</small>
                  </span>
                </span>
                <span>
                  <MapPin size={22} aria-hidden="true" />
                  <span>
                    <strong>{t("districtCommunity", { district: profile.district })}</strong>
                    <small>{t("indiaLocation", { state: profile.state })}</small>
                  </span>
                </span>
              </div>
            </div>

            <div className="public-farmer-actions">
              <Link className="button" href="/signup">
                <Handshake size={17} aria-hidden="true" /> {t("connect")}
              </Link>
              <Link className="button button--secondary" href={enquiryHref}>
                <MessageCircle size={17} aria-hidden="true" />
                {primaryListing ? t("sendEnquiry") : t("browseMarketplace")}
              </Link>
              <ShareProfileButton
                handle={profile.handle}
                fullName={profile.fullName}
                className="button button--ghost"
              />
            </div>

            <div className="public-farmer-open-to">
              <div>
                <span className="public-farmer-open-to__icon">
                  <Store size={19} aria-hidden="true" />
                </span>
                <span>
                  <strong>
                    {primaryListing ? t("openBuyerEnquiries") : t("openFarmingConnections")}
                  </strong>
                  <small>
                    {primaryListing
                      ? t("currentLots", {
                          count: formatNumber(listings.length, locale),
                          lots: listings.length === 1 ? t("lot") : t("lots"),
                          crops: cropList(profile.crops, locale, t),
                        })
                      : t("interestedConnections", {
                          crops: cropList(profile.crops, locale, t),
                        })}
                  </small>
                </span>
              </div>
              <a href="#featured">
                {t("viewDetails")} <ChevronRight size={16} aria-hidden="true" />
              </a>
            </div>
          </div>
        </section>

        <div className="public-farmer-layout">
          <div className="public-farmer-main-column">
            <section className="card public-farmer-section" id="about">
              <div className="public-farmer-section__heading">
                <div>
                  <p className="eyebrow">{t("about")}</p>
                  <h2>{t("farmStory")}</h2>
                </div>
              </div>
              <p className="public-farmer-about-copy" dir="auto">{profile.bio}</p>
              <div className="public-farmer-top-skills">
                <strong>{t("topFarmingFocus")}</strong>
                <span dir="auto">{focusTags.slice(0, 4).join(" · ")}</span>
              </div>
            </section>

            <section className="card public-farmer-section" id="featured">
              <div className="public-farmer-section__heading">
                <div>
                  <p className="eyebrow">{t("featured")}</p>
                  <h2>{t("currentHarvest")}</h2>
                  <p>{t("harvestDescription")}</p>
                </div>
                {listings.length ? (
                  <Link href={isExample ? "/marketplace/demo" : `/store/${profile.handle}`}>
                    {t("showAll")} <ChevronRight size={16} aria-hidden="true" />
                  </Link>
                ) : null}
              </div>
              {listings.length ? (
                <div className="public-farmer-featured-grid">
                  {listings.slice(0, 2).map((listing) => (
                    <Link
                      className="public-farmer-featured-card"
                      href={isExample ? "/marketplace/demo" : `/marketplace/${listing.id}`}
                      key={listing.id}
                    >
                      <ListingImage
                        className="public-farmer-featured-card__image"
                        variant={listing.imageVariant}
                      />
                      <span className="public-farmer-featured-card__body">
                        <small>{t("produceListing")}</small>
                        <strong dir="auto">{listing.title}</strong>
                        <span>
                          {t("listingPriceQuantity", {
                            price: formatCurrency(listing.price, locale, "INR", {
                              maximumFractionDigits: 0,
                            }),
                            priceUnit: listing.priceUnit,
                            quantity: formatNumber(listing.quantity, locale),
                            unit: listing.unit,
                          })}
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="public-farmer-inline-empty">
                  <PackageSearch size={26} aria-hidden="true" />
                  <span>
                    <strong>{t("noActiveListings")}</strong>
                    <small>{t("availabilitySoon")}</small>
                  </span>
                </div>
              )}
            </section>

            <section className="card public-farmer-section" id="activity">
              <div className="public-farmer-section__heading">
                <div>
                  <p className="eyebrow">{t("activity")}</p>
                  <h2>{t("publicFarmActivity")}</h2>
                  <p>{t("publicActivityHelp")}</p>
                </div>
              </div>
              <div className="public-farmer-activity-list">
                {listings.slice(0, 2).map((listing) => (
                  <article key={listing.id}>
                    <span className="public-farmer-activity-list__icon">
                      <Store size={18} aria-hidden="true" />
                    </span>
                    <div>
                      <strong dir="auto">{t("publishedListing", { title: listing.title })}</strong>
                      <p>
                        {t("availableForEnquiries", {
                          quantity: formatNumber(listing.quantity, locale),
                          unit: listing.unit,
                        })}
                      </p>
                      <small>{listing.createdLabel}</small>
                    </div>
                  </article>
                ))}
                <article>
                  <span className="public-farmer-activity-list__icon">
                    <Sprout size={18} aria-hidden="true" />
                  </span>
                  <div>
                    <strong>{t("builtProfile")}</strong>
                    <p>{t("sharedIdentity")}</p>
                    <small>{profile.joinedLabel}</small>
                  </div>
                </article>
              </div>
            </section>

            <section className="card public-farmer-section" id="experience">
              <div className="public-farmer-section__heading">
                <div>
                  <p className="eyebrow">{t("experience")}</p>
                  <h2>{t("farmingJourney")}</h2>
                </div>
              </div>
              <div className="public-farmer-experience">
                <span className="public-farmer-experience__mark">
                  <Leaf size={25} aria-hidden="true" />
                </span>
                <div>
                  <h3>{t("methodFarming", { method: readableMethod(profile.farmingMethod, t) })}</h3>
                  <strong dir="auto">{t("independentFarmer", { name: profile.fullName })}</strong>
                  <span>
                    {profile.experienceYears
                      ? t("yearsExperience", {
                          years: formatNumber(profile.experienceYears, locale),
                        })
                      : t("experienceShared")}
                  </span>
                  <span>{profile.district}, {profile.state}, India</span>
                  <p>
                    {t("worksWith", { crops: cropList(profile.crops, locale, t) })}
                  </p>
                </div>
              </div>
            </section>

            <section className="card public-farmer-section" id="skills">
              <div className="public-farmer-section__heading">
                <div>
                  <p className="eyebrow">{t("skillsCategories")}</p>
                  <h2>{t("farmingFocus")}</h2>
                </div>
              </div>
              <div className="public-farmer-skills">
                {focusTags.map((focus) => (
                  <span key={focus}>
                    <BadgeCheck size={17} aria-hidden="true" /> {focus}
                  </span>
                ))}
                <span>
                  <MapPin size={17} aria-hidden="true" /> {t("localSupply", { district: profile.district })}
                </span>
              </div>
            </section>

            <section className="card public-farmer-section public-farmer-reviews">
              <div className="public-farmer-section__heading">
                <div>
                  <p className="eyebrow">{t("recommendations")}</p>
                  <h2>{t("completedReviews")}</h2>
                </div>
                {reviews.length ? (
                  <div className="review-score">
                    <Star size={18} fill="currentColor" aria-hidden="true" />
                    <strong>{averageRating.toFixed(1)}</strong>
                    <span>{t("reviewCount", { count: formatNumber(reviews.length, locale) })}</span>
                  </div>
                ) : null}
              </div>
              {reviews.length ? (
                <div className="review-list">
                  {reviews.slice(0, 4).map((review) => (
                    <article className="review-card" key={review.id}>
                      <div className="review-card__head">
                        <span
                          className="rating-inline"
                          aria-label={t("stars", { rating: review.rating })}
                        >
                          {Array.from({ length: 5 }, (_, index) => (
                            <Star
                              key={index}
                              size={14}
                              fill={index < review.rating ? "currentColor" : "none"}
                              aria-hidden="true"
                            />
                          ))}
                        </span>
                        <span>{review.createdLabel}</span>
                      </div>
                      <p dir="auto">{review.body}</p>
                      <div className="review-card__meta">
                        <span>
                          <BadgeCheck size={14} aria-hidden="true" /> {t("sellerConfirmed")}
                        </span>
                        {review.listingTitle ? <span>{review.listingTitle}</span> : null}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="public-farmer-inline-empty">
                  <Star size={24} aria-hidden="true" />
                  <span>
                    <strong>{t("noReviews")}</strong>
                    <small>{t("recommendationsSoon")}</small>
                  </span>
                </div>
              )}
            </section>
          </div>

          <aside className="public-farmer-aside" aria-label={t("detailsAria")}>
            <section className="card public-farmer-id-card">
              <ShieldCheck size={27} aria-hidden="true" />
              <p className="eyebrow">{t("identityCard")}</p>
              <h2>{t("professionalProfile")}</h2>
              <dl>
                <div><dt>{t("farmerbookId")}</dt><dd>@{profile.handle}</dd></div>
                <div><dt>{t("role")}</dt><dd>{t("farmer")}</dd></div>
                <div><dt>{t("location")}</dt><dd>{profile.district}, {profile.state}</dd></div>
                <div>
                  <dt>{t("profileStatus")}</dt>
                  <dd>
                    {profile.verified ? (
                      <><BadgeCheck size={14} aria-hidden="true" /> {t("verifiedStatus")}</>
                    ) : t("communityStatus")}
                  </dd>
                </div>
              </dl>
              <p className="public-farmer-id-note">
                {t("identityDisclaimer")}
              </p>
            </section>

            <section className="card public-farmer-aside-card">
              <p className="eyebrow">{t("profileHighlights")}</p>
              <h2>{t("atGlance")}</h2>
              <div className="public-farmer-highlight-list">
                <span>
                  <CalendarDays size={20} aria-hidden="true" />
                  <span><strong>{profile.joinedLabel}</strong><small>{t("memberSince")}</small></span>
                </span>
                <span>
                  <Store size={20} aria-hidden="true" />
                  <span><strong>{t("activeLots", { count: formatNumber(listings.length, locale), lots: listings.length === 1 ? t("lot") : t("lots") })}</strong><small>{t("publicProduce")}</small></span>
                </span>
                <span>
                  <Users size={20} aria-hidden="true" />
                  <span><strong>{networkLabel(profile, locale, t)}</strong><small>{t("communityNetwork")}</small></span>
                </span>
                <span>
                  <Star size={20} aria-hidden="true" />
                  <span><strong>{reviews.length ? formatNumber(averageRating, locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : t("newRating")}</strong><small>{t("purchaseReputation")}</small></span>
                </span>
              </div>
            </section>

            <section className="card public-farmer-aside-card" id="contact">
              <p className="eyebrow">{t("contactLinks")}</p>
              <h2>{t("connectSafely")}</h2>
              <p>{t("privateTraceable")}</p>
              <Link className="button button--full" href={enquiryHref}>
                <MessageCircle size={17} aria-hidden="true" />
                {primaryListing ? t("sendEnquiry") : t("browseMarketplace")}
              </Link>
              <div className="social-link-row public-farmer-social-links">
                {approvedSocialLinks.length ? approvedSocialLinks.map(([network, url]) => (
                  <a href={url} key={network} target="_blank" rel="noopener noreferrer">
                    <ExternalLink size={14} aria-hidden="true" /> {network}
                  </a>
                )) : <span className="form-helper">{t("noApprovedSocialLinks")}</span>}
              </div>
            </section>
          </aside>
        </div>

        <section className="public-farmer-cta">
          <div>
            <p className="eyebrow">{t("growConnections")}</p>
            <h2>{t("buildProfile")}</h2>
            <p>{t("buildProfileHelp")}</p>
          </div>
          <Link className="button" href="/signup">{t("joinFarmerBook")}</Link>
        </section>
      </div>
    </main>
  );
}
