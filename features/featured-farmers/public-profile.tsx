/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  Camera,
  ExternalLink,
  Users,
  Video,
} from "lucide-react";
import type { SupportedLocale } from "@/lib/i18n/locales";
import { featuredFarmerPublicMessages } from "./public-messages";
import type { FeaturedFarmerPublication } from "./queries";

const socialIcons = {
  youtube: Video,
  instagram: Camera,
  facebook: Users,
  linkedin: BriefcaseBusiness,
};

function formatDate(value: string, locale: SupportedLocale) {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function SourceCitations({
  sourceUrls,
  sources,
  sourceNumber,
  label,
}: {
  sourceUrls: string[];
  sources: FeaturedFarmerPublication["snapshot"]["sources"];
  sourceNumber: Map<string, number>;
  label: string;
}) {
  return (
    <div className="featured-story__citations" aria-label="Citations">
      {[...new Set(sourceUrls)].map((url) => {
        const source = sources.find((item) => item.url === url);
        return source ? (
          <a
            key={url}
            href={url}
            target="_blank"
            rel="noreferrer"
            aria-label={`${label} ${sourceNumber.get(url)}: ${source.title}`}
          >
            [{sourceNumber.get(url)}]
          </a>
        ) : null;
      })}
    </div>
  );
}

export function FeaturedFarmerCard({
  publication,
  locale,
}: {
  publication: FeaturedFarmerPublication;
  locale: SupportedLocale;
}) {
  const m = featuredFarmerPublicMessages(locale);
  const { snapshot } = publication;
  return (
    <article className="featured-public-card">
      <Link
        href={`/featured-farmers/${publication.slug}`}
        className={`featured-public-card__visual${
          snapshot.media ? "" : " featured-public-card__visual--no-photo"
        }`}
        aria-label={`${m.readStory}: ${snapshot.fullName}`}
      >
        {snapshot.media ? (
          <img
            src={snapshot.media.assetUrl}
            alt={snapshot.media.altText}
            width={960}
            height={620}
          />
        ) : (
          <span className="featured-public-card__no-photo" aria-hidden="true">
            <strong>
              {snapshot.fullName
                .split(/\s+/)
                .map((part) => part[0])
                .join("")
                .slice(0, 2)}
            </strong>
            <small>{m.photoPending}</small>
          </span>
        )}
        <span className="featured-public-card__category">
          {snapshot.categorySlugs[0]?.replaceAll("-", " ") ?? "farming"}
        </span>
      </Link>
      <div className="featured-public-card__body">
        <p className="eyebrow">
          {[snapshot.district, snapshot.state].filter(Boolean).join(", ") ||
            "India"}
        </p>
        <h2>
          <Link href={`/featured-farmers/${publication.slug}`}>
            {snapshot.fullName}
          </Link>
        </h2>
        <h3>{snapshot.headline}</h3>
        <p>{snapshot.deck}</p>
        <div className="featured-public-card__footer">
          <span>
            {snapshot.socialLinks.length
              ? `${snapshot.socialLinks.length} social ${
                  snapshot.socialLinks.length === 1 ? "account" : "accounts"
                }`
              : m.archivalRecord}
          </span>
          <Link href={`/featured-farmers/${publication.slug}`}>
            {m.readStory} <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}

export function FeaturedFarmerStory({
  publication,
  locale,
}: {
  publication: FeaturedFarmerPublication;
  locale: SupportedLocale;
}) {
  const m = featuredFarmerPublicMessages(locale);
  const { snapshot } = publication;
  const sourceNumber = new Map(
    snapshot.sources.map((source, index) => [source.url, index + 1]),
  );
  const claims = new Map(snapshot.claims.map((claim) => [claim.key, claim]));
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;

  return (
    <article className="featured-story">
      <header className="featured-story__hero">
        <div className="featured-story__hero-copy">
          <Link href="/featured-farmers" className="featured-story__back">
            ← {m.collectionTitle}
          </Link>
          <p className="eyebrow">
            {[snapshot.district, snapshot.state]
              .filter(Boolean)
              .join(" · ") || "India"}
          </p>
          <h1>{snapshot.fullName}</h1>
          <h2>{snapshot.headline}</h2>
          <p>{snapshot.deck}</p>
          <div className="featured-story__dates">
            <span>{m.editorialByline}</span>
            <span>
              {snapshot.sources.length} {m.reviewedSources}
            </span>
            <span>
              {m.published} {formatDate(publication.published_at, locale)}
            </span>
            <span>
              {m.lastChecked} {formatDate(publication.fact_checked_at, locale)}
            </span>
          </div>
        </div>
        <figure
          className={`featured-story__portrait${
            snapshot.media || snapshot.sourceHostedPreview
              ? ""
              : " featured-story__portrait--fallback"
          }`}
        >
          {snapshot.media ? (
            <img
              src={snapshot.media.assetUrl}
              alt={snapshot.media.altText}
              width={1200}
              height={900}
            />
          ) : snapshot.sourceHostedPreview ? (
            <a
              className="featured-story__portrait-source"
              href={snapshot.sourceHostedPreview.sourceUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={`Watch the source documentary: ${snapshot.fullName}`}
            >
              <img
                src={snapshot.sourceHostedPreview.assetUrl}
                alt={snapshot.sourceHostedPreview.altText}
                width={1280}
                height={720}
                referrerPolicy="no-referrer"
              />
            </a>
          ) : (
            <div
              className="featured-story__portrait-empty"
              role="img"
              aria-label={m.photoPending}
            >
              <span>Documentary profile</span>
              <strong>
                {snapshot.fullName
                  .split(/\s+/)
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)}
              </strong>
              <small>Original photograph only</small>
            </div>
          )}
          <figcaption>
            {snapshot.media ? (
              snapshot.media.credit
            ) : snapshot.sourceHostedPreview ? (
              <>
                Source-hosted preview · {" "}
                <a
                  href={snapshot.sourceHostedPreview.creditUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {snapshot.sourceHostedPreview.credit}
                </a>
              </>
            ) : (
              m.photoPending
            )}
          </figcaption>
        </figure>
      </header>

      <div className="featured-story__disclosure">
        <span className="featured-story__shield" aria-hidden="true">
          FB
        </span>
        <p>{m.disclosure}</p>
      </div>

      <nav className="featured-story__contents" aria-label="In this article">
        <strong>In this article</strong>
        <div>
          <a href="#why-featured">Why he matters</a>
          {snapshot.sections.map((section, index) => (
            <a href={`#story-${index + 1}`} key={`${section.kind}:${index}`}>
              {section.heading}
            </a>
          ))}
          {snapshot.milestones?.length ? (
            <a href="#milestones">Milestones</a>
          ) : null}
          {snapshot.questions?.length ? (
            <a href="#questions">Questions answered</a>
          ) : null}
        </div>
      </nav>

      <div className="featured-story__layout">
        <div className="featured-story__main">
          <section className="featured-story__why" id="why-featured">
            <p className="eyebrow">{m.whyFeatured}</p>
            <p>{snapshot.whyFeatured}</p>
          </section>

          {snapshot.sections.map((section, sectionIndex) => {
            const sectionClaims = section.claimKeys.flatMap((key) => {
              const claim = claims.get(key);
              return claim ? [claim] : [];
            });
            const citations = [
              ...new Set(
                sectionClaims.flatMap((claim) =>
                  claim.sources.map((source) => source.url),
                ),
              ),
            ];
            return (
              <section
                className="featured-story__section"
                key={`${section.kind}:${sectionIndex}`}
                id={`story-${sectionIndex + 1}`}
              >
                <span>{String(sectionIndex + 1).padStart(2, "0")}</span>
                <div>
                  <p className="eyebrow">{section.kind}</p>
                  <h2>{section.heading}</h2>
                  <p>{section.body}</p>
                  {citations.length ? (
                    <SourceCitations
                      sourceUrls={citations}
                      sources={snapshot.sources}
                      sourceNumber={sourceNumber}
                      label={m.source}
                    />
                  ) : null}
                </div>
              </section>
            );
          })}

          {snapshot.milestones?.length ? (
            <section className="featured-story__milestones" id="milestones">
              <p className="eyebrow">Life and work</p>
              <h2>L. Narayana Reddy: key milestones</h2>
              <ol>
                {snapshot.milestones.map((milestone) => (
                  <li key={`${milestone.year}:${milestone.title}`}>
                    <time>{milestone.year}</time>
                    <div>
                      <h3>{milestone.title}</h3>
                      <p>{milestone.description}</p>
                      <SourceCitations
                        sourceUrls={milestone.sourceUrls}
                        sources={snapshot.sources}
                        sourceNumber={sourceNumber}
                        label={m.source}
                      />
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          {snapshot.questions?.length ? (
            <section className="featured-story__questions" id="questions">
              <p className="eyebrow">Quick answers</p>
              <h2>Questions about L. Narayana Reddy</h2>
              <div>
                {snapshot.questions.map((item) => (
                  <article key={item.question}>
                    <h3>{item.question}</h3>
                    <p>{item.answer}</p>
                    <SourceCitations
                      sourceUrls={item.sourceUrls}
                      sources={snapshot.sources}
                      sourceNumber={sourceNumber}
                      label={m.source}
                    />
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {snapshot.coverage.length ? (
            <section className="featured-story__coverage">
              <p className="eyebrow">{m.coverage}</p>
              <div>
                {snapshot.coverage.map((item) => (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    key={item.url}
                  >
                    <span>{item.sourceType}</span>
                    <strong>{item.title}</strong>
                    <small>{item.publisher}</small>
                    <ExternalLink size={16} aria-hidden="true" />
                  </a>
                ))}
              </div>
            </section>
          ) : null}

          <section className="featured-story__sources">
            <p className="eyebrow">{m.sources}</p>
            <ol>
              {snapshot.sources.map((source) => (
                <li key={source.url}>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <strong>{source.title}</strong>
                    <span>
                      {source.publisher}
                      {source.publishedAt ? ` · ${source.publishedAt}` : ""}
                    </span>
                    <ExternalLink size={14} aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="featured-story__aside">
          <section>
            <p className="eyebrow">{m.focus}</p>
            <div className="tag-row">
              {snapshot.categorySlugs.map((slug) => (
                <span className="tag" key={slug}>
                  {slug.replaceAll("-", " ")}
                </span>
              ))}
            </div>
          </section>
          {snapshot.claims.some((claim) => claim.displayValue) ? (
            <section>
              <p className="eyebrow">{m.atGlance}</p>
              <div className="featured-story__stats">
                {snapshot.claims
                  .filter((claim) => claim.displayValue)
                  .map((claim) => (
                    <div key={claim.key}>
                      <span>{claim.displayLabel}</span>
                      <strong>{claim.displayValue}</strong>
                      <small>{claim.displayContext}</small>
                    </div>
                  ))}
              </div>
            </section>
          ) : null}
          {snapshot.socialLinks.length ? (
            <section>
              <p className="eyebrow">{m.connect}</p>
              <div className="featured-story__social">
                {snapshot.socialLinks.map((social) => {
                  const Icon = socialIcons[social.platform];
                  return (
                    <a
                      href={social.url}
                      target="_blank"
                      rel="noreferrer"
                      key={social.platform}
                    >
                      <Icon size={18} aria-hidden="true" />
                      <span>{social.platform}</span>
                      <ExternalLink size={13} aria-hidden="true" />
                    </a>
                  );
                })}
              </div>
            </section>
          ) : null}
          <section className="featured-story__limitations">
            <p className="eyebrow">{m.limitations}</p>
            <ul>
              {snapshot.limitations.map((limitation) => (
                <li key={limitation}>{limitation}</li>
              ))}
            </ul>
          </section>
          {supportEmail ? (
            <a
              className="button button--secondary"
              href={`mailto:${supportEmail}?subject=${encodeURIComponent(
                `Correction request: ${snapshot.fullName}`,
              )}`}
            >
              {m.correction}
            </a>
          ) : (
            <Link className="button button--secondary" href="/data-deletion">
              {m.correction}
            </Link>
          )}
        </aside>
      </div>
    </article>
  );
}
