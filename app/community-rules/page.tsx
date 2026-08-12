import type { Metadata } from "next";
import { PolicyLayout } from "@/components/policy-layout";
import { getServerTranslations } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> { const { t } = await getServerTranslations("legal"); return { title: t("rulesTitle") }; }

export default async function CommunityRulesPage() {
  const { t } = await getServerTranslations("legal");
  return (
    <PolicyLayout
      eyebrow={t("rulesEyebrow")}
      title={t("rulesTitle")}
      updated={t("updatedAugust9")}
    >
      <p className="placeholder-note">{t("rulesGate")}</p>
      <h2>{t("rulesHonestyTitle")}</h2><p>{t("rulesHonestyBody")}</p>
      <h2>{t("rulesRespectTitle")}</h2><p>{t("rulesRespectBody")}</p>
      <h2>{t("rulesPrivacyTitle")}</h2><p>{t("rulesPrivacyBody")}</p>
      <h2>{t("rulesScamsTitle")}</h2><p>{t("rulesScamsBody")}</p>
      <h2>{t("rulesOutreachTitle")}</h2><p>{t("rulesOutreachBody")}</p>
      <h2>{t("rulesToolsTitle")}</h2><p>{t("rulesToolsBody")}</p>
    </PolicyLayout>
  );
}
