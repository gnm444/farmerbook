import Link from "next/link";
import { WebsiteGreetingAgent } from "@/components/website-greeting-agent";
import { Brand } from "@/components/ui";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { getServerTranslations } from "@/lib/i18n";
import {
  FARMERBOOK_CONTACT_EMAIL,
  FARMERBOOK_CONTACT_PHONE,
  FARMERBOOK_CONTACT_PHONE_DISPLAY,
} from "@/lib/contact";

export async function PublicFooter() {
  const { t } = await getServerTranslations("navigation");
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
          <Link href="/data-deletion">{t("accountData")}</Link>
          <Link href="/license">Open-source licence</Link>
        </nav>
        <address className="footer-column footer-contact" aria-label="Contact FarmerBook">
          <strong>Contact</strong>
          <a href={`mailto:${FARMERBOOK_CONTACT_EMAIL}`}>{FARMERBOOK_CONTACT_EMAIL}</a>
          <a href={`tel:${FARMERBOOK_CONTACT_PHONE}`}>{FARMERBOOK_CONTACT_PHONE_DISPLAY}</a>
          <span>Customer greeting agent available 24/7</span>
        </address>
      </div>
      <div className="container footer-bottom">
        <span>© 2026 FarmerBook. All rights reserved.</span>
        <span>
          Open source under AGPL-3.0 strong copyleft. Copying or redistribution is allowed only under its licence terms.
        </span>
      </div>
      <WebsiteGreetingAgent />
    </footer>
  );
}
