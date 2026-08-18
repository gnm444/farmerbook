import type { Metadata } from "next";
import Link from "next/link";
import { BookOpenText, Clock3, Sprout } from "lucide-react";
import { PublicFooter } from "@/components/public-footer";
import { PublicHeader } from "@/components/public-header";
import {
  blogCategoryLabel,
  blogUi,
  translationNotice,
} from "@/features/blog/presentation";
import { loadLocalizedBlogPublications } from "@/features/blog/queries";
import { formatDate, getServerI18n } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getServerI18n();
  const ui = blogUi(locale);
  return {
    title: ui.collectionTitle,
    description: ui.collectionLede,
    alternates: { canonical: "/blog" },
    openGraph: {
      type: "website",
      title: `${ui.collectionTitle} | FarmerBook`,
      description: ui.collectionLede,
      url: "/blog",
      siteName: "FarmerBook",
    },
  };
}

export default async function BlogPage() {
  const { locale } = await getServerI18n();
  const publications = await loadLocalizedBlogPublications(locale);
  const ui = blogUi(locale);
  return (
    <>
      <PublicHeader />
      <main className="blog-index-page">
        <section className="blog-index-hero">
          <div className="container">
            <p className="eyebrow">{ui.collectionEyebrow}</p>
            <h1>{ui.collectionTitle}</h1>
            <p>{ui.collectionLede}</p>
            <div className="blog-index-hero__topics" aria-label="Blog topics">
              <span><Sprout size={15} aria-hidden="true" /> Natural farming</span>
              <span>Safe food</span>
              <span>Farmer–consumer trust</span>
            </div>
          </div>
        </section>
        <section className="container blog-index-collection" aria-label="FarmerBook blog articles">
          {publications.length ? (
            <div className="blog-card-grid">
              {publications.map((publication) => (
                <article className="blog-card" key={publication.slug}>
                  <div className="blog-card__meta">
                    <span>{blogCategoryLabel(publication.category, locale)}</span>
                    <span>{formatDate(publication.publishedAt, locale)}</span>
                  </div>
                  <h2><Link href={`/blog/${publication.slug}`}>{publication.content.title}</Link></h2>
                  <p>{publication.content.excerpt}</p>
                  <div className="blog-card__translation">{translationNotice(publication.translationSource, locale)}</div>
                  <div className="blog-card__footer">
                    <span><Clock3 size={15} aria-hidden="true" /> {publication.readingMinutes} {ui.minutes}</span>
                    <Link href={`/blog/${publication.slug}`}>{ui.readArticle} →</Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <BookOpenText aria-hidden="true" />
              <h2>Articles are being prepared</h2>
              <p>The managed writing agent keeps drafts private until editorial approval.</p>
            </div>
          )}
        </section>
      </main>
      <PublicFooter />
    </>
  );
}
