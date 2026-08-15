import type { Metadata } from "next";
import { BookOpenText } from "lucide-react";
import { PublicFooter } from "@/components/public-footer";
import { PublicHeader } from "@/components/public-header";
import { featuredFarmerPublicMessages } from "@/features/featured-farmers/public-messages";
import { FeaturedFarmerCard } from "@/features/featured-farmers/public-profile";
import { loadFeaturedFarmerPublications } from "@/features/featured-farmers/queries";
import { getServerI18n } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getServerI18n();
  const messages = featuredFarmerPublicMessages(locale);
  return {
    title: messages.collectionTitle,
    description: messages.collectionBody,
    alternates: { canonical: "/featured-farmers" },
    openGraph: {
      type: "website",
      title: `${messages.collectionTitle} | FarmerBook`,
      description: messages.collectionBody,
      url: "/featured-farmers",
      siteName: "FarmerBook",
    },
  };
}

export default async function FeaturedFarmersPage() {
  const [{ locale }, publications] = await Promise.all([
    getServerI18n(),
    loadFeaturedFarmerPublications(),
  ]);
  const messages = featuredFarmerPublicMessages(locale);
  return (
    <>
      <PublicHeader />
      <main className="featured-public">
        <section className="featured-public__masthead">
          <div className="container">
            <p className="eyebrow">{messages.collectionEyebrow}</p>
            <h1>{messages.collectionTitle}</h1>
            <p>{messages.collectionBody}</p>
            <div className="featured-public__line" />
          </div>
        </section>
        <section className="container featured-public__collection">
          {publications.length ? (
            <div className="featured-public__grid">
              {publications.map((publication) => (
                <FeaturedFarmerCard
                  key={publication.publication_id}
                  publication={publication}
                  locale={locale}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state featured-public__empty">
              <BookOpenText aria-hidden="true" />
              <h2>{messages.noStories}</h2>
              <p>{messages.noStoriesBody}</p>
            </div>
          )}
        </section>
      </main>
      <PublicFooter />
    </>
  );
}
