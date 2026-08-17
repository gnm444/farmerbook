import type { Metadata } from "next";
import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, BookOpenCheck, Clock3, ExternalLink } from "lucide-react";
import { PublicFooter } from "@/components/public-footer";
import { PublicHeader } from "@/components/public-header";
import {
  blogCategoryLabel,
  blogUi,
  translationNotice,
} from "@/features/blog/presentation";
import { loadLocalizedBlogPublication } from "@/features/blog/queries";
import { getSiteUrl } from "@/lib/env";
import { formatDate, getServerI18n } from "@/lib/i18n";

const getPublication = cache(loadLocalizedBlogPublication);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const [{ slug }, { locale }] = await Promise.all([params, getServerI18n()]);
  const publication = await getPublication(slug, locale);
  if (!publication) return {};
  return {
    title: publication.content.title,
    description: publication.content.excerpt,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      type: "article",
      siteName: "FarmerBook",
      title: publication.content.title,
      description: publication.content.excerpt,
      url: `/blog/${slug}`,
      publishedTime: publication.publishedAt,
      modifiedTime: publication.updatedAt,
    },
    twitter: {
      card: "summary",
      title: publication.content.title,
      description: publication.content.excerpt,
    },
  };
}

export default async function BlogStoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [{ slug }, { locale }] = await Promise.all([params, getServerI18n()]);
  const publication = await getPublication(slug, locale);
  if (!publication) notFound();
  const ui = blogUi(locale);
  const canonicalUrl = new URL(`/blog/${slug}`, getSiteUrl()).toString();
  const publisherId = `${getSiteUrl()}#organization`;
  const articleText = [
    publication.content.dek,
    ...publication.content.sections.flatMap((section) => [
      ...section.paragraphs,
      ...section.bullets,
    ]),
    publication.content.conclusion,
  ].join(" ");
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${canonicalUrl}#article`,
        url: canonicalUrl,
        headline: publication.content.title,
        description: publication.content.excerpt,
        datePublished: publication.publishedAt,
        dateModified: publication.updatedAt,
        inLanguage: publication.locale,
        mainEntityOfPage: canonicalUrl,
        articleSection: blogCategoryLabel(publication.category, locale),
        wordCount: articleText.trim().split(/\s+/).length,
        author: { "@id": publisherId },
        publisher: { "@id": publisherId },
        citation: publication.sources.map((source) => source.url),
        publishingPrinciples: new URL("/community-rules", getSiteUrl()).toString(),
      },
      {
        "@type": "Organization",
        "@id": publisherId,
        name: "FarmerBook",
        url: getSiteUrl(),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "FarmerBook", item: getSiteUrl() },
          { "@type": "ListItem", position: 2, name: "Blog", item: new URL("/blog", getSiteUrl()).toString() },
          { "@type": "ListItem", position: 3, name: publication.content.title, item: canonicalUrl },
        ],
      },
    ],
  };

  return (
    <>
      <PublicHeader />
      <main className="blog-story-page">
        <article className="container blog-story">
          <Link className="blog-story__back" href="/blog"><ArrowLeft size={16} aria-hidden="true" /> {ui.backToBlog}</Link>
          <header className="blog-story__hero">
            <p className="eyebrow">{blogCategoryLabel(publication.category, locale)}</p>
            <h1>{publication.content.title}</h1>
            <p className="blog-story__dek">{publication.content.dek}</p>
            <div className="blog-story__meta">
              <span>{publication.author}</span>
              <span>{formatDate(publication.publishedAt, locale)}</span>
              <span><Clock3 size={15} aria-hidden="true" /> {publication.readingMinutes} {ui.minutes}</span>
            </div>
            <div className={`blog-story__translation blog-story__translation--${publication.translationSource}`}>
              <BookOpenCheck size={17} aria-hidden="true" />
              <span>{translationNotice(publication.translationSource, locale)}</span>
            </div>
          </header>

          <div className="blog-story__layout">
            <div className="blog-story__body">
              {publication.content.sections.map((section, index) => (
                <section key={section.heading} id={`section-${index + 1}`}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <h2>{section.heading}</h2>
                    {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                    {section.bullets.length ? (
                      <ul>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>
                    ) : null}
                  </div>
                </section>
              ))}
              <section className="blog-story__conclusion">
                <span>✓</span>
                <div>
                  <h2>Conclusion / ముగింపు</h2>
                  <p>{publication.content.conclusion}</p>
                </div>
              </section>
              <aside className="blog-story__safety">
                <AlertTriangle aria-hidden="true" />
                <div><strong>{ui.safety}</strong><p>{publication.content.safetyNote}</p></div>
              </aside>
            </div>

            <aside className="blog-story__rail">
              <section>
                <h2>{ui.sources}</h2>
                <ol>
                  {publication.sources.map((source) => (
                    <li key={source.url}>
                      <a href={source.url} target="_blank" rel="noreferrer">
                        <span>{source.title} <ExternalLink size={13} aria-hidden="true" /></span>
                        <small>{source.publisher}</small>
                      </a>
                    </li>
                  ))}
                </ol>
              </section>
              <section>
                <h2>{ui.editorial}</h2>
                <p>{publication.editorialNote}</p>
              </section>
            </aside>
          </div>
        </article>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replaceAll("<", "\\u003c"),
          }}
        />
      </main>
      <PublicFooter />
    </>
  );
}
