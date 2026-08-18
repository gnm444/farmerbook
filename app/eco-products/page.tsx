import type { Metadata } from "next";
import { PublicFooter } from "@/components/public-footer";
import { PublicHeader } from "@/components/public-header";
import { EcoProductApplicationForm } from "@/features/eco-products/eco-product-application-form";
import {
  ecoSupplierFallbackLanguageProps,
  ecoSupplierUsesEnglishFallback,
} from "@/lib/i18n/eco-suppliers";
import { getServerTranslations } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslations("ecoSuppliers");
  return {
    title: t("metadataTitle"),
    description: t("metadataDescription"),
  };
}

export default async function EcoProductsPage() {
  const { t, locale } = await getServerTranslations("ecoSuppliers");
  const fallbackLanguageProps = ecoSupplierFallbackLanguageProps(locale);

  return (
    <>
      <PublicHeader />
      <main>
        <section className="container section">
          <div className="section-heading" {...fallbackLanguageProps}>
            <p className="eyebrow">{t("eyebrow")}</p>
            <h1>{t("title")}</h1>
            <p>{t("intro")}</p>
            {ecoSupplierUsesEnglishFallback(locale) ? (
              <p className="notice">{t("fallbackNotice")}</p>
            ) : null}
          </div>
          <div className="listing-detail-grid">
            <EcoProductApplicationForm />
            <aside className="card" {...fallbackLanguageProps}>
              <p className="eyebrow">{t("nextStepsTitle")}</p>
              <h2>{t("roleHeading")}</h2>
              <p>{t("nextStepsBody")}</p>
              <p>{t("sellerDeclaredDisclosure")}</p>
              <p className="muted">{t("privacyDisclosure")}</p>
            </aside>
          </div>
        </section>
      </main>
      <PublicFooter />
    </>
  );
}
