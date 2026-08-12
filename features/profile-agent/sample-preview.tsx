"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, ExternalLink, ShieldAlert, Sprout } from "lucide-react";
import { useLocale, useTranslations } from "@/components/locale-provider";
import { formatDate } from "@/lib/i18n/format";
import { agricultureCategoryBySlug } from "@/lib/agriculture/categories";
import type { ManagedFarmerProfileSample } from "./schemas";
import { decideManagedProfileSampleAction } from "./actions";

export function ManagedProfileSamplePreview({
  token,
  sample,
  expiresAt,
}: {
  token: string;
  sample: ManagedFarmerProfileSample;
  expiresAt: string;
}) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("profilePreview");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const socialProfiles = Object.entries(sample.socialLinks).filter(
    (entry): entry is [string, string] => typeof entry[1] === "string",
  );

  function decide(decision: "approve" | "reject") {
    setMessage("");
    startTransition(async () => {
      const result = await decideManagedProfileSampleAction({ token, decision });
      if (!result.ok) {
        setMessage(t("error"));
        return;
      }
      router.push(result.data.continueUrl);
    });
  }

  return (
    <main className="public-farmer-page profile-sample-page">
      <section className="card profile-sample-notice">
        <ShieldAlert aria-hidden="true" />
        <div>
          <p className="eyebrow">{t("privatePreview")}</p>
          <h1>{t("notLiveTitle")}</h1>
          <p>{t("notLiveBody")}</p>
        </div>
      </section>

      <section className="card public-farmer-hero profile-sample-hero">
        <div className="public-farmer-avatar public-farmer-avatar--placeholder">
          <Sprout aria-hidden="true" />
        </div>
        <div className="public-farmer-identity">
          <span className="badge">{t("notVerified")}</span>
          <h2 dir="auto">{sample.fullName}</h2>
          <p className="public-farmer-headline" dir="auto">{sample.headline}</p>
          {sample.district || sample.state ? (
            <p className="muted">
              {[sample.district, sample.state, t("india")].filter(Boolean).join(", ")}
            </p>
          ) : null}
        </div>
      </section>

      <div className="public-farmer-layout">
        <div className="public-farmer-main">
          <section className="card public-farmer-section">
            <p className="eyebrow">{t("about")}</p>
            <h2>{t("draftIntroduction")}</h2>
            <p dir="auto">{sample.bio}</p>
          </section>
          <section className="card public-farmer-section">
            <p className="eyebrow">{t("farmingFocus")}</p>
            <h2>{t("suggestedCategories")}</h2>
            <div className="public-farmer-skills">
              {sample.categorySlugs.length ? (
                sample.categorySlugs.map((slug) => (
                  <span key={slug}>
                    <BadgeCheck size={17} aria-hidden="true" />
                    {agricultureCategoryBySlug(slug)?.name ?? slug}
                  </span>
                ))
              ) : (
                <p className="muted">{t("noCategory")}</p>
              )}
            </div>
          </section>
          {sample.experienceYears !== undefined ||
          sample.farmingMethod ||
          socialProfiles.length ? (
            <section className="card public-farmer-section">
              <p className="eyebrow">{t("details")}</p>
              <h2>{t("draftDetails")}</h2>
              <dl className="profile-sample-details">
                {sample.experienceYears !== undefined ? (
                  <div>
                    <dt>{t("experience")}</dt>
                    <dd>{t("experienceYears", { count: sample.experienceYears })}</dd>
                  </div>
                ) : null}
                {sample.farmingMethod ? (
                  <div>
                    <dt>{t("farmingMethod")}</dt>
                    <dd>{sample.farmingMethod}</dd>
                  </div>
                ) : null}
              </dl>
              {socialProfiles.length ? (
                <div className="profile-sample-socials">
                  <strong>{t("farmerOwnedSocialProfiles")}</strong>
                  <small>{t("socialReviewHelp")}</small>
                  {socialProfiles.map(([platform, url]) => (
                    <a key={platform} href={url} target="_blank" rel="noreferrer">
                      {platform} <ExternalLink size={13} aria-hidden="true" />
                    </a>
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}
          <section className="card public-farmer-section">
            <p className="eyebrow">{t("evidence")}</p>
            <h2>{t("evidenceTitle")}</h2>
            <p className="muted">{t("citationHelp")}</p>
            <ol className="profile-sample-citations">
              {sample.claims.map((claim, index) => (
                <li key={`${claim.field}-${claim.sourceUrl}-${index}`}>
                  <strong>{claim.field.replaceAll(/([A-Z])/g, " $1")}</strong>
                  <span dir="auto">{claim.value}</span>
                  <q dir="auto">{claim.excerpt}</q>
                  <a href={claim.sourceUrl} target="_blank" rel="noreferrer">
                    {t("viewSource")} <ExternalLink size={13} aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ol>
          </section>
        </div>
        <aside className="public-farmer-sidebar">
          <section className="card context-card">
            <h2>{t("limitations")}</h2>
            <ul>
              {sample.limitations.map((limitation) => (
                <li key={limitation} dir="auto">{limitation}</li>
              ))}
            </ul>
          </section>
          <section className="card context-card profile-sample-decision">
            <h2>{t("aboutYou")}</h2>
            <p>{t("decisionHelp")}</p>
            {message ? <p className="form-error" role="alert">{message}</p> : null}
            <button className="button" type="button" disabled={isPending} onClick={() => decide("approve")}>
              {isPending ? t("recording") : t("approve")}
            </button>
            <button className="button button--secondary" type="button" disabled={isPending} onClick={() => decide("reject")}>
              {t("reject")}
            </button>
            <small>{t("expires", { date: formatDate(expiresAt, locale, { dateStyle: "medium", timeStyle: "short" }) })}</small>
          </section>
        </aside>
      </div>
    </main>
  );
}
