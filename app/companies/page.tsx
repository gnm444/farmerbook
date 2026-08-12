import type { Metadata } from "next";
import Link from "next/link";
import { Building2 } from "lucide-react";
import { notFound } from "next/navigation";
import { PublicFooter } from "@/components/public-footer";
import { PublicHeader } from "@/components/public-header";
import { OrganizationCard } from "@/features/organizations/organization-card";
import { loadPublicOrganizations } from "@/features/organizations/queries";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { getServerTranslations } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslations("companies");
  return { title: t("title"), description: t("metadataDescription") };
}

export default async function CompaniesPage() {
  if (!isFeatureEnabled("ENABLE_AGRI_BUSINESSES")) notFound();
  const [organizations, { t }] = await Promise.all([
    loadPublicOrganizations(),
    getServerTranslations("companies"),
  ]);

  return (
    <>
      <PublicHeader />
      <main>
        <section className="container">
          <div className="section-heading">
            <p className="eyebrow">{t("ecosystem")}</p>
            <h1>{t("directoryTitle")}</h1>
            <p>{t("directoryBody")}</p>
            <Link className="button" href="/signup">{t("createAccount")}</Link>
          </div>
          {organizations.length ? (
            <div className="market-grid">
              {organizations.map((organization) => (
                <OrganizationCard key={organization.id} organization={organization} />
              ))}
            </div>
          ) : (
            <section className="empty-state">
              <Building2 className="empty-state__icon" aria-hidden="true" />
              <h2>{t("noPublished")}</h2>
              <p>{t("noPublishedHelp")}</p>
            </section>
          )}
        </section>
      </main>
      <PublicFooter />
    </>
  );
}
