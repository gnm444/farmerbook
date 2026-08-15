import Link from "next/link";
import { Brand } from "@/components/ui";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { getServerTranslations } from "@/lib/i18n";

export async function PublicFooter() {
  const { t } = await getServerTranslations("navigation");
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
  const companiesEnabled = isFeatureEnabled("ENABLE_AGRI_BUSINESSES");
  const outreachEnabled = isFeatureEnabled("ENABLE_OUTREACH_AGENT");
  return (
    <footer className="public-footer">
      <div className="container footer-main">
        <div className="footer-story">
          <Brand inverse />
          <p>{t("footerStory")}</p>
          <span>{t("footerTagline")}</span>
        </div>
        <nav className="footer-column" aria-label={t("explore")}>
          <strong>{t("explore")}</strong>
          <Link href="/marketplace">{t("marketplace")}</Link>
          <Link href="/featured-farmers">{t("featuredFarmers")}</Link>
          {companiesEnabled ? <Link href="/companies">{t("companiesOffers")}</Link> : null}
          <Link href="/#segments">{t("whoFor")}</Link>
          <Link href="/signup">{t("join")}</Link>
          {outreachEnabled ? <Link href="/join">{t("requestIntroduction")}</Link> : null}
        </nav>
        <nav className="footer-column" aria-label={t("trustSupport")}>
          <strong>{t("trustSupport")}</strong>
          <Link href="/community-rules">{t("communityRules")}</Link>
          <Link href="/privacy">{t("privacy")}</Link>
          <Link href="/terms">{t("terms")}</Link>
          {supportEmail ? (
            <a href={`mailto:${supportEmail}`}>{t("supportPrivacy")}</a>
          ) : (
            <Link href="/data-deletion">{t("accountData")}</Link>
          )}
        </nav>
      </div>
      <div className="container footer-bottom">
        <span>© 2026 FarmerBook</span>
        <span>{t("footerMotto")}</span>
      </div>
    </footer>
  );
}
