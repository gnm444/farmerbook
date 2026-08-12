import type { Metadata } from "next";
import Link from "next/link";
import { Eye, ShieldCheck } from "lucide-react";
import { PublicFooter } from "@/components/public-footer";
import { PublicHeader } from "@/components/public-header";
import { DemoBanner } from "@/components/ui";
import { MarketBrowser } from "@/features/marketplace/market-browser";
import { produceListings } from "@/lib/market-data";
import { getServerI18n } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Marketplace demonstration",
  description:
    "A read-only FarmerBook marketplace demonstration using fictional sample data.",
  robots: { index: false, follow: false },
};

export default async function MarketplaceDemoPage() {
  const { t } = await getServerI18n();
  return (
    <>
      <DemoBanner label={t("common.demoBanner")} />
      <PublicHeader />
      <main className="marketplace-page">
        <section className="marketplace-content">
          <div className="container">
            <div className="section-heading marketplace-heading">
              <p className="eyebrow">{t("market.demoEyebrow")}</p>
              <h1>{t("market.demoHeading")}</h1>
              <p>{t("market.demoBody")}</p>
              <div className="market-proof" aria-label={t("market.demoSafeguards")}>
                <div>
                  <Eye size={22} aria-hidden="true" />
                  <span>
                    <strong>{t("market.browseOnly")}</strong>
                    {t("market.browseOnlyHelp")}
                  </span>
                </div>
                <div>
                  <ShieldCheck size={22} aria-hidden="true" />
                  <span>
                    <strong>{t("market.fictionalRecords")}</strong>
                    {t("market.fictionalRecordsHelp")}
                  </span>
                </div>
              </div>
              <Link className="button button--secondary" href="/marketplace">
                {t("market.openLive")}
              </Link>
            </div>
            <MarketBrowser
              listings={produceListings}
              historyPath="/marketplace/demo"
              readOnly
            />
          </div>
        </section>
      </main>
      <PublicFooter />
    </>
  );
}
