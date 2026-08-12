import type { Metadata } from "next";
import { PolicyLayout } from "@/components/policy-layout";
import { getServerTranslations } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> { const { t } = await getServerTranslations("legal"); return { title: t("privacyTitle") }; }

export default async function PrivacyPage() {
  const { t } = await getServerTranslations("legal");
  return (
    <PolicyLayout
      eyebrow={t("privacyEyebrow")}
      title={t("privacyTitle")}
      updated={t("updatedAugust9")}
    >
      <p className="placeholder-note">{t("privacyGate")}</p>
      <h2>{t("privacyCollectTitle")}</h2><p>{t("privacyCollectBody")}</p>
      <h2>{t("privacyUseTitle")}</h2><p>{t("privacyUseBody")}</p>
      <h2>{t("privacyIntroTitle")}</h2><p>{t("privacyIntroBody1")}</p><p>{t("privacyIntroBody2")}</p>
      <h2>{t("privacyRetentionTitle")}</h2><p>{t("privacyRetentionBody1")}</p><p>{t("privacyRetentionBody2")}</p><p>{t("privacyRetentionBody3")}</p>
      <h2>{t("privacyVisibilityTitle")}</h2><p>{t("privacyVisibilityBody")}</p>
      <h2>{t("privacyDeletionTitle")}</h2><p>{t("privacyDeletionBody")}</p>
    </PolicyLayout>
  );
}
