import type { Metadata } from "next";
import { PolicyLayout } from "@/components/policy-layout";
import { getServerTranslations } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> { const { t } = await getServerTranslations("legal"); return { title: t("termsTitle") }; }

export default async function TermsPage() {
  const { t } = await getServerTranslations("legal");
  return (
    <PolicyLayout
      eyebrow={t("termsEyebrow")}
      title={t("termsTitle")}
      updated={t("updatedAugust9")}
    >
      <p className="placeholder-note">{t("termsGate")}</p>
      <h2>{t("termsPurposeTitle")}</h2><p>{t("termsPurposeBody")}</p>
      <h2>{t("termsAdviceTitle")}</h2><p>{t("termsAdviceBody")}</p>
      <h2>{t("termsResponsibilityTitle")}</h2><p>{t("termsResponsibilityBody")}</p>
      <h2>{t("termsModerationTitle")}</h2><p>{t("termsModerationBody")}</p>
      <h2>{t("termsInvitesTitle")}</h2><p>{t("termsInvitesBody")}</p>
    </PolicyLayout>
  );
}
