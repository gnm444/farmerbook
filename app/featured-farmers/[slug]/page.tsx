import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { PublicFooter } from "@/components/public-footer";
import { PublicHeader } from "@/components/public-header";
import { FeaturedFarmerStory } from "@/features/featured-farmers/public-profile";
import { FeaturedFarmerEngagementSection } from "@/features/featured-farmers/featured-farmer-engagement";
import { loadFeaturedFarmerEngagement } from "@/features/featured-farmers/engagement-queries";
import { loadFeaturedFarmerPublicAccount } from "@/features/featured-farmers/account-link-queries";
import { loadFeaturedFarmerPublication } from "@/features/featured-farmers/queries";
import { getSiteUrl } from "@/lib/env";
import { getServerI18n } from "@/lib/i18n";

const getPublication = cache(loadFeaturedFarmerPublication);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const publication = await getPublication(slug);
  if (!publication) return {};
  const media = publication.snapshot.media;
  const title =
    publication.snapshot.seo?.title ??
    `${publication.snapshot.fullName} — ${publication.snapshot.headline}`;
  const description =
    publication.snapshot.seo?.description ?? publication.snapshot.deck;
  return {
    title: publication.snapshot.seo?.title ? { absolute: title } : title,
    description,
    keywords: publication.snapshot.seo?.keywords,
    alternates: { canonical: `/featured-farmers/${slug}` },
    openGraph: {
      type: "article",
      siteName: "FarmerBook",
      title,
      description,
      url: `/featured-farmers/${slug}`,
      publishedTime: publication.published_at,
      modifiedTime: publication.fact_checked_at,
      images: media
        ? [
            {
              url: media.assetUrl,
              alt: media.altText,
            },
          ]
        : undefined,
    },
    twitter: {
      card: media ? "summary_large_image" : "summary",
      title,
      description,
      images: media ? [media.assetUrl] : undefined,
    },
    robots:
      publication.publication_status === "preview"
        ? { index: false, follow: false }
        : undefined,
  };
}

export default async function FeaturedFarmerStoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [publication, { locale }, engagement, linkedAccount] = await Promise.all([
    getPublication(slug),
    getServerI18n(),
    loadFeaturedFarmerEngagement(slug),
    loadFeaturedFarmerPublicAccount(slug),
  ]);
  if (!publication) notFound();
  const canonicalUrl = new URL(
    `/featured-farmers/${slug}`,
    getSiteUrl(),
  ).toString();
  const personId = `${canonicalUrl}#person`;
  const publisherId = `${getSiteUrl()}#organization`;
  const personMetadata = publication.snapshot.personMetadata;
  const articleText = [
    publication.snapshot.deck,
    publication.snapshot.whyFeatured,
    ...publication.snapshot.sections.map((section) => section.body),
    ...(publication.snapshot.questions?.map((item) => item.answer) ?? []),
  ].join(" ");
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${canonicalUrl}#article`,
        url: canonicalUrl,
        headline: publication.snapshot.headline,
        name: publication.snapshot.seo?.title ?? publication.snapshot.headline,
        description:
          publication.snapshot.seo?.description ?? publication.snapshot.deck,
        datePublished: publication.published_at,
        dateModified: publication.fact_checked_at,
        inLanguage: publication.snapshot.locale,
        mainEntityOfPage: canonicalUrl,
        mainEntity: { "@id": personId },
        about: { "@id": personId },
        articleSection: publication.snapshot.categorySlugs,
        keywords: publication.snapshot.seo?.keywords,
        wordCount: articleText.trim().split(/\s+/).length,
        author: { "@id": publisherId },
        publisher: { "@id": publisherId },
        citation: publication.snapshot.sources.map((source) => source.url),
        correction: new URL("/data-deletion", getSiteUrl()).toString(),
        publishingPrinciples: new URL(
          "/community-rules",
          getSiteUrl(),
        ).toString(),
        image: publication.snapshot.media?.assetUrl
          ? [
              new URL(
                publication.snapshot.media.assetUrl,
                getSiteUrl(),
              ).toString(),
            ]
          : undefined,
      },
      {
        "@type": "Person",
        "@id": personId,
        name: publication.snapshot.fullName,
        alternateName: personMetadata?.alternateNames,
        birthDate: personMetadata?.birthDate,
        deathDate: personMetadata?.deathDate,
        jobTitle: personMetadata?.jobTitles ?? ["Farmer"],
        homeLocation: {
          "@type": "Place",
          name:
            personMetadata?.homeLocation ??
            [publication.snapshot.district, publication.snapshot.state, "India"]
              .filter(Boolean)
              .join(", "),
        },
        knowsAbout:
          personMetadata?.knowsAbout ??
          publication.snapshot.categorySlugs.map((slug) =>
            slug.replaceAll("-", " "),
          ),
        sameAs: publication.snapshot.socialLinks.map((social) => social.url),
        subjectOf: publication.snapshot.coverage.map((item) => item.url),
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
          {
            "@type": "ListItem",
            position: 1,
            name: "FarmerBook",
            item: getSiteUrl(),
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Featured Farmers",
            item: new URL("/featured-farmers", getSiteUrl()).toString(),
          },
          {
            "@type": "ListItem",
            position: 3,
            name: publication.snapshot.fullName,
            item: canonicalUrl,
          },
        ],
      },
    ],
  };
  return (
    <>
      <PublicHeader />
      <main className="featured-story-page">
        <FeaturedFarmerStory publication={publication} locale={locale} linkedAccount={linkedAccount} />
        {engagement && publication.publication_status !== "preview" ? (
          <FeaturedFarmerEngagementSection
            engagement={engagement}
            locale={locale}
          />
        ) : null}
        {publication.publication_status !== "preview" ? (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(jsonLd).replaceAll("<", "\\u003c"),
            }}
          />
        ) : null}
      </main>
      <PublicFooter />
    </>
  );
}
