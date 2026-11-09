import type { Metadata } from "next";
import Link from "next/link";
import { BookOpenText, Clock3 } from "lucide-react";
import { PublicFooter } from "@/components/public-footer";
import { PublicHeader } from "@/components/public-header";
import {
  BLOG_TOPICS,
  ORGANIC_INTELLIGENCE_COLLECTION,
  blogIndexHref,
  blogTopics,
  isBlogCollection,
  isBlogTopic,
  type BlogCollection,
  type BlogTopic,
} from "@/features/blog/discovery";
import {
  blogTopicLabel,
  blogUi,
  translationNotice,
} from "@/features/blog/presentation";
import { loadBlogIndex } from "@/features/blog/queries";
import { formatDate, getServerI18n } from "@/lib/i18n";

type BlogSearchParams = Promise<{
  topic?: string | string[];
  collection?: string | string[];
  page?: string | string[];
}>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseFilters(params: Awaited<BlogSearchParams>): {
  topic?: BlogTopic;
  collection?: BlogCollection;
  page: number;
} {
  const topic = first(params.topic);
  const collection = first(params.collection);
  const page = first(params.page);
  return {
    topic: isBlogTopic(topic) ? topic : undefined,
    collection: isBlogCollection(collection) ? collection : undefined,
    page: page && /^[1-9]\d*$/.test(page) && Number.isSafeInteger(Number(page))
      ? Number(page)
      : 1,
  };
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: BlogSearchParams;
}): Promise<Metadata> {
  const [{ locale }, params] = await Promise.all([getServerI18n(), searchParams]);
  const ui = blogUi(locale);
  const filters = parseFilters(params);
  const title = filters.collection ? ui.organicIntelligenceTitle : ui.collectionTitle;
  const description = filters.collection
    ? ui.organicIntelligenceLede
    : ui.collectionLede;
  const canonical = blogIndexHref(filters);
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      title: title + " | FarmerBook",
      description,
      url: canonical,
      siteName: "FarmerBook",
    },
  };
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: BlogSearchParams;
}) {
  const [{ locale }, params] = await Promise.all([getServerI18n(), searchParams]);
  const filters = parseFilters(params);
  const index = await loadBlogIndex(locale, filters);
  const ui = blogUi(locale);
  const title = filters.collection ? ui.organicIntelligenceTitle : ui.collectionTitle;
  const lede = filters.collection
    ? ui.organicIntelligenceLede
    : ui.collectionLede;
  const topicHref = (topic?: BlogTopic) => blogIndexHref({
    collection: filters.collection,
    topic,
  });
  const pageHref = (page: number) => blogIndexHref({
    collection: filters.collection,
    topic: filters.topic,
    page,
  });

  return (
    <>
      <PublicHeader />
      <main className="blog-index-page">
        <section className="blog-index-hero">
          <div className="container">
            <p className="eyebrow">{ui.collectionEyebrow}</p>
            <h1>{title}</h1>
            <p>{lede}</p>
            <nav className="blog-index-hero__collections" aria-label={ui.collectionNavigation}>
              <Link href="/blog" aria-current={!filters.collection ? "page" : undefined}>
                {ui.allArticles}
              </Link>
              {index.collectionCount > 0 || filters.collection === ORGANIC_INTELLIGENCE_COLLECTION ? (
                <Link
                  href={blogIndexHref({ collection: ORGANIC_INTELLIGENCE_COLLECTION })}
                  aria-current={filters.collection === ORGANIC_INTELLIGENCE_COLLECTION ? "page" : undefined}
                >
                  {ui.organicIntelligenceTitle} ({index.collectionCount})
                </Link>
              ) : null}
            </nav>
            <nav className="blog-index-hero__topics" aria-label={ui.topicNavigation}>
              <Link href={topicHref()} aria-current={!filters.topic ? "page" : undefined}>
                {ui.allTopics} ({index.collectionTotal})
              </Link>
              {BLOG_TOPICS.filter((topic) => index.topicCounts[topic] > 0).map((topic) => (
                <Link
                  key={topic}
                  href={topicHref(topic)}
                  aria-current={filters.topic === topic ? "page" : undefined}
                >
                  {blogTopicLabel(topic, locale)} ({index.topicCounts[topic]})
                </Link>
              ))}
            </nav>
          </div>
        </section>
        <section className="container blog-index-collection" aria-label="FarmerBook blog articles">
          {index.publications.length ? (
            <>
              <div className="blog-card-grid">
                {index.publications.map((publication) => (
                  <article className="blog-card" key={publication.slug}>
                    <div className="blog-card__meta">
                      <span>{blogTopicLabel(blogTopics(publication)[0], locale)}</span>
                      <span>{formatDate(publication.publishedAt, locale)}</span>
                    </div>
                    <h2><Link href={"/blog/" + publication.slug}>{publication.content.title}</Link></h2>
                    <p>{publication.content.excerpt}</p>
                    <div className="blog-card__translation">
                      {translationNotice(
                        publication.translationSource,
                        locale,
                        publication.sourceProvenance,
                      )}
                    </div>
                    <div className="blog-card__footer">
                      <span><Clock3 size={15} aria-hidden="true" /> {publication.readingMinutes} {ui.minutes}</span>
                      <Link href={"/blog/" + publication.slug}>{ui.readArticle} →</Link>
                    </div>
                  </article>
                ))}
              </div>
              {index.pageCount > 1 ? (
                <nav className="blog-index-pagination" aria-label={ui.page}>
                  {index.page > 1 ? <Link href={pageHref(index.page - 1)}>{ui.previousPage}</Link> : <span />}
                  <span>{ui.page} {index.page} / {index.pageCount}</span>
                  {index.page < index.pageCount
                    ? <Link href={pageHref(index.page + 1)}>{ui.nextPage}</Link>
                    : <span />}
                </nav>
              ) : null}
            </>
          ) : (
            <div className="empty-state">
              <BookOpenText aria-hidden="true" />
              <h2>{ui.noMatches}</h2>
            </div>
          )}
        </section>
      </main>
      <PublicFooter />
    </>
  );
}
