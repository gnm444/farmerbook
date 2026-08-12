import type { Metadata } from "next";
import { PolicyLayout } from "@/components/policy-layout";
import { getServerTranslations } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> { const { t } = await getServerTranslations("legal"); return { title: t("deletionTitle") }; }

export default async function DataDeletionPage() {
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
  const { t } = await getServerTranslations("legal");
  return (
    <PolicyLayout
      eyebrow={t("deletionEyebrow")}
      title={t("deletionTitle")}
      updated={t("updatedAugust6")}
    >
      <p>{t("deletionIntro")}</p>
      <h2>{t("deletionStepsTitle")}</h2>
      <ol>
        <li>{t("deletionStep1")}</li><li>{t("deletionStep2")}</li><li>{t("deletionStep3")}</li>
      </ol>
      <h2>{t("deletionNextTitle")}</h2><p>{t("deletionNextBody")}</p>
      <h2>{t("deletionReviewTitle")}</h2>
      {supportEmail ? (
        <p><a href={`mailto:${supportEmail}`}>{t("deletionReviewBody", { email: supportEmail })}</a></p>
      ) : (
        <p className="placeholder-note">{t("deletionBlocked")}</p>
      )}
      <h2>{t("deletionWithdrawTitle")}</h2><p>{t("deletionWithdrawBody")}</p>
    </PolicyLayout>
  );
}
