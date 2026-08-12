"use client";

import type { SupportedLocale } from "@/lib/i18n/locales";
import { localeNeedsNativeReview } from "@/lib/i18n/review-status";
import { useLocale, useTranslations } from "@/components/locale-provider";
import { ConsentJoinForm } from "./consent-join-form";

export function ConsentJoinExperience({
  configured,
  consentNonce,
  turnstileSiteKey,
  locales,
}: {
  configured: boolean;
  consentNonce: string;
  turnstileSiteKey: string;
  locales: readonly SupportedLocale[];
}) {
  const t = useTranslations("outreach");
  const locale = useLocale();
  return (
    <main className="consent-page">
      <section className="consent-hero">
        <div className="container consent-hero__grid">
          <div>
            <p className="eyebrow">{t("heroEyebrow")}</p>
            <h1>{t("heroTitle")}</h1>
            <p className="consent-hero__lede">{t("heroLede")}</p>
            {localeNeedsNativeReview(locale) ? (
              <p className="beta-notice beta-notice--inverse" role="status">
                {t("betaDisclosure")}
              </p>
            ) : null}
            <ul className="consent-promises">
              <li>{t("promiseNoScraping")}</li>
              <li>{t("promiseNoSpam")}</li>
              <li>{t("promiseWithdrawal")}</li>
            </ul>
          </div>
          <div className="consent-hero__image" role="img" aria-label={t("heroImageAlt")} />
        </div>
      </section>
      <section className="container consent-form-wrap">
        {configured ? (
          <ConsentJoinForm
            consentNonce={consentNonce}
            turnstileSiteKey={turnstileSiteKey}
            locales={locales}
          />
        ) : (
          <section className="card consent-unavailable">
            <p className="eyebrow">{t("unavailableEyebrow")}</p>
            <h2>{t("unavailableTitle")}</h2>
            <p>{t("unavailableBody")}</p>
          </section>
        )}
      </section>
    </main>
  );
}
