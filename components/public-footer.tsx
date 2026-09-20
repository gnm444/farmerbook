import Link from "next/link";
import { WebsiteGreetingAgent } from "@/components/website-greeting-agent";
import { VisitCounter } from "@/components/visit-counter";
import { Brand } from "@/components/ui";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { getServerTranslations } from "@/lib/i18n";
import {
  FARMERBOOK_CONTACT_EMAIL,
  FARMERBOOK_CONTACT_PHONE,
  FARMERBOOK_CONTACT_PHONE_DISPLAY,
} from "@/lib/contact";
import { ecoSupplierFallbackLanguageProps } from "@/lib/i18n/eco-suppliers";

export async function PublicFooter() {
  const { t } = await getServerTranslations("navigation");
  const { t: eco, locale: ecoLocale } = await getServerTranslations("ecoSuppliers");
  const companiesEnabled = isFeatureEnabled("ENABLE_AGRI_BUSINESSES");
  const outreachEnabled = isFeatureEnabled("ENABLE_OUTREACH_AGENT");
  const farmVisitsEnabled = isFeatureEnabled("ENABLE_FARM_VISITS");
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
          <Link href="/blog">{t("blog")}</Link>
          {farmVisitsEnabled ? <Link href="/farm-visits">{t("farmVisits")}</Link> : null}
          {companiesEnabled ? <Link href="/companies">{t("companiesOffers")}</Link> : null}
          <Link href="/eco-products" {...ecoSupplierFallbackLanguageProps(ecoLocale)}>{eco("eyebrow")}</Link>
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
          <strong>Follow FarmerBook</strong>
          <a href="https://www.instagram.com/farmerbook2026/" target="_blank" rel="noreferrer">
            Instagram · @farmerbook2026
          </a>
          <a href="https://www.linkedin.com/company/139364019/" target="_blank" rel="noreferrer">
            LinkedIn · FarmerBook
          </a>
          <a href="https://www.youtube.com/@farmerbookIndia" target="_blank" rel="noreferrer">
            YouTube · @farmerbookIndia
          </a>
        </address>
      </div>
      <div className="container footer-bottom">
        <span>© 2026 FarmerBook. All rights reserved.</span>
        <VisitCounter />
        <span>
          Open source under AGPL-3.0 strong copyleft. Copying or redistribution is allowed only under its licence terms.
        </span>
      </div>
      <WebsiteGreetingAgent />
    </footer>
  );
}
