import {
  DEFAULT_LOCALE,
  normalizeLocale,
  type SupportedLocale,
} from "@/lib/i18n/locales";
import type {
  BlogPublication,
  BlogTranslationResult,
  LocalizedBlogContent,
} from "./contracts";
import {
  BLOG_TOPICS,
  blogCollection,
  blogTopics,
  type BlogCollection,
  type BlogTopic,
} from "./discovery";
import {
  STATIC_BLOG_PUBLICATIONS,
  staticBlogPublication,
} from "./published";
import { blogWritingAgentStub } from "./runtime";

export type LocalizedBlogPublication = BlogPublication & {
  content: LocalizedBlogContent;
  locale: SupportedLocale;
  translationSource: BlogTranslationResult["source"];
  translationModel: string | null;
};

async function fingerprint(content: LocalizedBlogContent) {
  const bytes = new TextEncoder().encode(JSON.stringify(content));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

async function managedPublications() {
  const now = Date.now();
  if (managedPublicationCache && managedPublicationCache.expiresAt > now) {
    return managedPublicationCache.publications;
  }
  try {
    const agent = await blogWritingAgentStub();
    const publications = agent ? await agent.listPublished() : [];
    managedPublicationCache = {
      publications,
      expiresAt: now + 60_000,
    };
    return publications;
  } catch {
    return [];
  }
}

// Published managed articles are public and identical for every visitor. A
// short isolate-local cache avoids a Durable Object read on every public blog
// request, which keeps the Free-plan Worker CPU budget available for SSR.
let managedPublicationCache: {
  publications: BlogPublication[];
  expiresAt: number;
} | null = null;

export function mergeBlogPublications(
  staticPublications: readonly BlogPublication[],
  managed: readonly BlogPublication[],
): BlogPublication[] {
  const publications = new Map<string, BlogPublication>();
  // Detail lookup already gives static articles precedence. Keep the index and
  // sitemap consistent if an older managed draft happens to share a slug.
  for (const publication of [...managed, ...staticPublications]) {
    publications.set(publication.slug, publication);
  }
  return [...publications.values()].sort(
    (left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt),
  );
}

export async function loadBlogPublications(): Promise<BlogPublication[]> {
  return mergeBlogPublications(STATIC_BLOG_PUBLICATIONS, await managedPublications());
}

async function loadPublication(slug: string) {
  const staticPublication = staticBlogPublication(slug);
  if (staticPublication) return staticPublication;
  return (await managedPublications()).find((article) => article.slug === slug) ?? null;
}

export async function localizeBlogPublication(
  publication: BlogPublication,
  requestedLocale: unknown,
): Promise<LocalizedBlogPublication> {
  const locale = normalizeLocale(requestedLocale) ?? DEFAULT_LOCALE;
  if (locale === "te-IN" && publication.telugu) {
    return {
      ...publication,
      content: publication.telugu,
      locale,
      translationSource: publication.sourceProvenance === "private_author_post"
        ? "ai_assisted_editorial_adaptation"
        : "reviewed_original",
      translationModel: null,
    };
  }
  if (locale === "en-IN") {
    return {
      ...publication,
      content: publication.english,
      locale,
      translationSource: publication.sourceProvenance === "private_author_post"
        ? "ai_assisted_editorial_adaptation"
        : "reviewed_original",
      translationModel: null,
    };
  }
  try {
    const agent = await blogWritingAgentStub();
    if (agent) {
      const translation = await agent.translatePublishedArticle({
        slug: publication.slug,
        locale,
        contentFingerprint: await fingerprint(publication.english),
        sourceContent: publication.english,
      });
      return {
        ...publication,
        content: translation.content,
        locale,
        translationSource: translation.source,
        translationModel: translation.model,
      };
    }
  } catch {
    // The reviewed English version is the fail-safe public fallback.
  }
  return {
    ...publication,
    content: publication.english,
    locale,
    translationSource: "english_fallback",
    translationModel: null,
  };
}

export const BLOG_INDEX_PAGE_SIZE = 12;

export function selectBlogIndex(
  all: BlogPublication[],
  filters: { topic?: BlogTopic; collection?: BlogCollection; page?: number } = {},
) {
  const inCollection = filters.collection
    ? all.filter((publication) => blogCollection(publication) === filters.collection)
    : all;
  const topicCounts = Object.fromEntries(BLOG_TOPICS.map((topic) => [
    topic,
    inCollection.filter((publication) => blogTopics(publication).includes(topic)).length,
  ])) as Record<BlogTopic, number>;
  const filtered = filters.topic
    ? inCollection.filter((publication) => blogTopics(publication).includes(filters.topic!))
    : inCollection;
  const sorted = [...filtered].sort(
    (left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt),
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / BLOG_INDEX_PAGE_SIZE));
  const requestedPage = Number.isSafeInteger(filters.page) && (filters.page ?? 0) > 0
    ? filters.page!
    : 1;
  const page = Math.min(requestedPage, pageCount);
  const selected = sorted.slice(
    (page - 1) * BLOG_INDEX_PAGE_SIZE,
    page * BLOG_INDEX_PAGE_SIZE,
  );
  return {
    publications: selected,
    page,
    pageCount,
    total: filtered.length,
    collectionTotal: inCollection.length,
    collectionCount: all.filter((publication) =>
      blogCollection(publication) === "organic-intelligence").length,
    topicCounts,
  };
}

export async function loadBlogIndex(
  requestedLocale: unknown,
  filters: { topic?: BlogTopic; collection?: BlogCollection; page?: number } = {},
) {
  const selected = selectBlogIndex(await loadBlogPublications(), filters);
  return {
    ...selected,
    publications: await Promise.all(selected.publications.map((publication) =>
      localizeBlogPublication(publication, requestedLocale))),
  };
}

export async function loadLocalizedBlogPublication(
  slug: string,
  requestedLocale: unknown,
) {
  const publication = await loadPublication(slug);
  return publication
    ? localizeBlogPublication(publication, requestedLocale)
    : null;
}
