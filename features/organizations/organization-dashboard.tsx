import Link from "next/link";
import { Building2, PackageSearch } from "lucide-react";
import { canManageOrganization } from "@/features/auth/capabilities";
import type { AccountRole } from "@/lib/types";
import { OfferCard } from "@/features/offers/offer-card";
import { OfferCreateForm } from "@/features/offers/offer-create-form";
import { isOfferModerationEligibleForPublic } from "@/features/offers/policies";
import type { BusinessOffer } from "@/features/offers/types";
import { OrganizationCreateForm } from "./organization-create-form";
import { OrganizationPublicationControl } from "./organization-publication-control";
import type { OrganizationForMember } from "./types";
import { formatNumber, getServerTranslations } from "@/lib/i18n";

export async function OrganizationDashboard({
  accountRole,
  organizations,
  offers,
  offersEnabled,
}: {
  accountRole: AccountRole;
  organizations: OrganizationForMember[];
  offers: BusinessOffer[];
  offersEnabled: boolean;
}) {
  const { t, locale } = await getServerTranslations("companies");
  if (!organizations.length) {
    return (
      <div>
        <section className="empty-state">
          <Building2 className="empty-state__icon" aria-hidden="true" />
          <h1>{t("noProfile")}</h1>
          <p>{t("noProfileHelp")}</p>
        </section>
        {accountRole === "agri_business" ? (
          <OrganizationCreateForm />
        ) : (
          <section className="card">
            <h2>{t("creationRequires")}</h2>
            <p>{t("memberInviteHelp")}</p>
          </section>
        )}
      </div>
    );
  }

  return (
    <div>
      <section className="section-heading">
        <p className="eyebrow">{t("workspace")}</p>
        <h1>{t("organizationsOffers")}</h1>
        <p>{t("durableCounts")}</p>
      </section>
      {organizations.map((organization) => {
        const organizationOffers = offers.filter(
          (offer) => offer.organizationId === organization.id,
        );
        return (
          <section className="card" key={organization.id}>
            <p className="eyebrow">{organization.membershipRole.replace("_", " ")}</p>
            <h2 dir="auto">{organization.displayName}</h2>
            <p>
              {t("publication")}: <strong>{organization.publicationState}</strong> · {t("verification")}:{" "}
              <strong>{organization.verificationState}</strong> · {t("offers")}:{" "}
              <strong>{formatNumber(organizationOffers.length, locale)}</strong>
            </p>
            {organization.publicationState === "published" ? (
              <Link className="button button--secondary" href={`/companies/${organization.slug}`}>
                {t("viewPublicPage")}
              </Link>
            ) : (
              <p className="muted">{t("notPublic")}</p>
            )}
            <OrganizationPublicationControl organization={organization} />
            {offersEnabled && canManageOrganization(organization.membershipRole) ? (
              <OfferCreateForm organization={organization} />
            ) : null}
          </section>
        );
      })}
      <section>
        <div className="section-heading">
          <p className="eyebrow">{t("recordedOffers")}</p>
          <h2>{offers.length ? t("offerCount", { count: formatNumber(offers.length, locale) }) : t("noOffersYet")}</h2>
        </div>
        {offers.length ? (
          <div className="market-grid">
            {offers.map((offer) => (
              <OfferCard
                key={offer.id}
                offer={offer}
                publiclyAccessible={
                  offer.publicationState === "published" &&
                  offer.availabilityState === "active" &&
                  isOfferModerationEligibleForPublic(offer)
                }
              />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <PackageSearch className="empty-state__icon" aria-hidden="true" />
            <h2>{t("noRecordedOffers")}</h2>
            <p>{t("offerCreationHelp")}</p>
          </div>
        )}
      </section>
    </div>
  );
}
