import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { LanguageSelector } from "@/components/language-selector";
import { Brand } from "@/components/ui";
import { getWorkshopCopy, HARI_BABU_WORKSHOP_PATH } from "@/features/workshops/workshop-copy";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { getServerTranslations } from "@/lib/i18n";
import workshopStyles from "@/app/workshops/hari-babu-2026/workshop.module.css";

export async function PublicHeader() {
  const { t, locale } = await getServerTranslations("navigation");
  const companiesEnabled = isFeatureEnabled("ENABLE_AGRI_BUSINESSES");
  const incSourcingEnabled = companiesEnabled && isFeatureEnabled("ENABLE_INC_SOURCING");
  const outreachEnabled = isFeatureEnabled("ENABLE_OUTREACH_AGENT");
  const extendedLocalesEnabled = isFeatureEnabled("ENABLE_EXTENDED_LOCALES");
  const farmVisitsEnabled = isFeatureEnabled("ENABLE_FARM_VISITS");
  const workshopEnabled = isFeatureEnabled("ENABLE_HARI_BABU_WORKSHOP");
  const { copy: workshopCopy, locale: workshopLocale } = getWorkshopCopy(locale);
  return (
    <header className="public-header">
      <nav className={`container public-nav ${workshopEnabled ? workshopStyles.workshopNav : ""}`} aria-label={t("publicNavigation")}>
        <Link href="/" className="brand" aria-label={t("homeAria")}>
          <Brand />
        </Link>
        <div className={`public-links ${workshopEnabled ? workshopStyles.workshopLinks : ""}`}>
          <Link href="/marketplace">{t("marketplace")}</Link>
          <Link href="/featured-farmers">{t("featuredFarmers")}</Link>
          <Link href="/blog">{t("blog")}</Link>
          {workshopEnabled ? <Link className={workshopStyles.workshopPrimaryLink} href={HARI_BABU_WORKSHOP_PATH} lang={workshopLocale}>{workshopCopy.nav}</Link> : null}
          {farmVisitsEnabled ? <Link href="/farm-visits">{t("farmVisits")}</Link> : null}
          {incSourcingEnabled ? <Link href="/sourcing">{t("sourcingNeeds")}</Link> : null}
          {companiesEnabled ? <Link href="/companies">{t("companiesOffers")}</Link> : null}
          <Link href="/#segments">{t("whoFor")}</Link>
          <Link href="/#how">{t("howWorks")}</Link>
          {outreachEnabled ? <Link href="/join">{t("askContact")}</Link> : null}
        </div>
        <div className={`public-actions ${workshopEnabled ? workshopStyles.workshopActions : ""}`}>
          {workshopEnabled ? (
            <Link className={workshopStyles.mobileWorkshop} href={HARI_BABU_WORKSHOP_PATH} lang={workshopLocale} aria-label={workshopCopy.nav}>
              <CalendarDays size={19} aria-hidden="true" /><span>{workshopCopy.nav}</span>
            </Link>
          ) : null}
          <LanguageSelector
            className="language-selector language-selector--compact"
            extendedLocalesEnabled={extendedLocalesEnabled}
          />
          <Link className="button button--ghost" href="/login">
            {t("signIn")}
          </Link>
          <Link className="button" href="/signup">
            {t("join")}
          </Link>
        </div>
      </nav>
    </header>
  );
}
