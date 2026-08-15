import Link from "next/link";
import { LanguageSelector } from "@/components/language-selector";
import { Brand } from "@/components/ui";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { getServerTranslations } from "@/lib/i18n";

export async function PublicHeader() {
  const { t } = await getServerTranslations("navigation");
  const companiesEnabled = isFeatureEnabled("ENABLE_AGRI_BUSINESSES");
  const incSourcingEnabled = companiesEnabled && isFeatureEnabled("ENABLE_INC_SOURCING");
  const outreachEnabled = isFeatureEnabled("ENABLE_OUTREACH_AGENT");
  const extendedLocalesEnabled = isFeatureEnabled("ENABLE_EXTENDED_LOCALES");
  return (
    <header className="public-header">
      <nav className="container public-nav" aria-label={t("publicNavigation")}>
        <Link href="/" className="brand" aria-label={t("homeAria")}>
          <Brand />
        </Link>
        <div className="public-links">
          <Link href="/marketplace">{t("marketplace")}</Link>
          <Link href="/featured-farmers">{t("featuredFarmers")}</Link>
          {incSourcingEnabled ? <Link href="/sourcing">{t("sourcingNeeds")}</Link> : null}
          {companiesEnabled ? <Link href="/companies">{t("companiesOffers")}</Link> : null}
          <Link href="/#segments">{t("whoFor")}</Link>
          <Link href="/#how">{t("howWorks")}</Link>
          {outreachEnabled ? <Link href="/join">{t("askContact")}</Link> : null}
        </div>
        <div className="public-actions">
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
