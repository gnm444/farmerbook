import type { Metadata } from "next";
import { PolicyLayout } from "@/components/policy-layout";
import { workshopPrivacyCopy } from "@/features/workshops/workshop-privacy";
import { getServerTranslations } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> { const { t } = await getServerTranslations("legal"); return { title: t("deletionTitle") }; }

export default async function DataDeletionPage() {
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
  const { t, locale } = await getServerTranslations("legal");
  const workshop = workshopPrivacyCopy(locale);
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
      <section lang={workshop.locale}>
        <h2>{workshop.copy.deletionTitle}</h2>
        <p>{workshop.copy.deletion}</p>
      </section>
    </PolicyLayout>
  );
}
