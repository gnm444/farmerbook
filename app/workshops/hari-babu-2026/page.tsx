/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowDown, ArrowUpRight, CalendarDays, MapPin, MessageCircle, Sprout } from "lucide-react";
import { PublicFooter } from "@/components/public-footer";
import { PublicHeader } from "@/components/public-header";
import { WorkshopRegistrationForm } from "@/features/workshops/workshop-registration-form";
import { isWorkshopRegistrationClosed } from "@/features/workshops/registration-contracts";
import {
  getWorkshopCopy,
  HARI_BABU_WORKSHOP_PATH,
  HARI_BABU_WORKSHOP_POSTERS,
} from "@/features/workshops/workshop-copy";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { getServerI18n } from "@/lib/i18n";
import styles from "./workshop.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getServerI18n({ restoreProfile: false });
  const { copy } = getWorkshopCopy(locale);
  return {
    title: copy.metadataTitle,
    description: copy.metadataDescription,
    alternates: { canonical: HARI_BABU_WORKSHOP_PATH },
    openGraph: {
      type: "website",
      title: `${copy.metadataTitle} | FarmerBook`,
      description: copy.metadataDescription,
      url: HARI_BABU_WORKSHOP_PATH,
      siteName: "FarmerBook",
      images: [HARI_BABU_WORKSHOP_POSTERS[getWorkshopCopy(locale).locale]],
    },
  };
}

export default async function HariBabuWorkshopPage() {
  if (!isFeatureEnabled("ENABLE_HARI_BABU_WORKSHOP")) notFound();

  const { locale } = await getServerI18n({ restoreProfile: false });
  const { locale: workshopLocale, copy, usesEnglishFallback } = getWorkshopCopy(locale);
  const poster = HARI_BABU_WORKSHOP_POSTERS[workshopLocale];
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
  const registrationClosed = isWorkshopRegistrationClosed();

  return (
    <>
      <PublicHeader />
      <main className={styles.page} lang={workshopLocale}>
        <section className={styles.hero} aria-labelledby="workshop-title">
          <div className={`container ${styles.heroGrid}`}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}><Sprout size={18} aria-hidden="true" />{copy.eyebrow}</p>
              <h1 id="workshop-title">{copy.title}</h1>
              <p className={styles.heroLead}>{copy.intro}</p>
              <p className={styles.association}>{copy.association}</p>
              {usesEnglishFallback ? <p className={styles.fallback}>{copy.fallbackNotice}</p> : null}

              <div className={styles.heroActions}>
                {registrationClosed
                  ? <span className={styles.closedAction}>{copy.closedAction}</span>
                  : <a className="button" href="#register">{copy.interestAction}<ArrowDown size={17} aria-hidden="true" /></a>}
                <Link className="button button--secondary" href="/featured-farmers/sukhavasi-hari-babu-natural-farming">
                  {copy.profileAction}<ArrowUpRight size={17} aria-hidden="true" />
                </Link>
              </div>

              <dl className={styles.details}>
                <div>
                  <CalendarDays size={22} aria-hidden="true" />
                  <dt>{copy.dateLabel}</dt>
                  <dd>{copy.dateValue}</dd>
                </div>
                <div>
                  <CalendarDays size={22} aria-hidden="true" />
                  <dt>{copy.timeLabel}</dt>
                  <dd>{copy.timeValue}</dd>
                </div>
                <div>
                  <MapPin size={22} aria-hidden="true" />
                  <dt>{copy.placeLabel}</dt>
                  <dd>{copy.placeValue}</dd>
                </div>
              </dl>
            </div>

            <figure className={styles.posterCard}>
              <img
                className={styles.poster}
                src={poster}
                alt={copy.posterAlt}
                width={1122}
                height={1402}
                fetchPriority="high"
              />
              <figcaption>
                <span><strong>{copy.posterTitle}</strong><small>{copy.posterBody}</small></span>
                <a className={styles.posterDownload} href={poster} download>
                  {copy.downloadPoster}<ArrowDown size={16} aria-hidden="true" />
                </a>
              </figcaption>
            </figure>
          </div>
        </section>

        <section className={styles.purpose} aria-labelledby="workshop-purpose-title">
          <div className="container">
            <div className={styles.sectionHeading}>
              <p className={styles.eyebrow}>{copy.purposeEyebrow}</p>
              <h2 id="workshop-purpose-title">{copy.purposeTitle}</h2>
              <p>{copy.purposeIntro}</p>
            </div>
            <div className={styles.purposeGrid}>
              <article><span>01</span><h3>{copy.challengeTitle}</h3><p>{copy.challengeBody}</p></article>
              <article><span>02</span><h3>{copy.solutionTitle}</h3><p>{copy.solutionBody}</p></article>
              <article><span>03</span><h3>{copy.actionTitle}</h3><p>{copy.actionBody}</p></article>
            </div>
          </div>
        </section>

        <section className={styles.registerSection} id="register" aria-labelledby="workshop-register-title">
          <div className={`container ${styles.registerGrid}`}>
            <div className={styles.registerCard}>
              <p className={styles.eyebrow}><MessageCircle size={18} aria-hidden="true" />{copy.registrationEyebrow}</p>
              <h2 id="workshop-register-title">{registrationClosed ? copy.closedTitle : copy.registrationTitle}</h2>
              <p className={styles.registerIntro}>{registrationClosed ? copy.closedBody : copy.registrationIntro}</p>
              {registrationClosed ? null : (
                <WorkshopRegistrationForm
                  copy={copy}
                  turnstileSiteKey={turnstileSiteKey}
                />
              )}
              <div className={styles.deletionHelp}>
                <p>{copy.privacy}</p>
                <p>{copy.earlyDeletion}{" "}<Link href="/data-deletion">{copy.deletionRequestLink}</Link>{" "}{copy.orEmail}{" "}<a href="mailto:ceo@farmerbook.in">ceo@farmerbook.in</a>.</p>
              </div>
            </div>
            <aside className={styles.qrCard}>
              <div>
                <p className={styles.eyebrow}>{copy.association}</p>
                <h3>{copy.qrTitle}</h3>
                <p>{copy.qrBody}</p>
              </div>
              <img
                src="/images/workshops/hari-babu-2026/registration-qr.png"
                alt={copy.qrAlt}
                width={602}
                height={602}
                loading="lazy"
              />
            </aside>
          </div>
        </section>
      </main>
      <PublicFooter />
    </>
  );
}
