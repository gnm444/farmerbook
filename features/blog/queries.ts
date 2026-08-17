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
  try {
    const agent = await blogWritingAgentStub();
    return agent ? await agent.listPublished() : [];
  } catch {
    return [];
  }
}

export async function loadBlogPublications(): Promise<BlogPublication[]> {
  const managed = await managedPublications();
  const publications = new Map<string, BlogPublication>();
  for (const publication of [...STATIC_BLOG_PUBLICATIONS, ...managed]) {
    publications.set(publication.slug, publication);
  }
  return [...publications.values()].sort(
    (left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt),
  );
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
      translationSource: "reviewed_original",
      translationModel: null,
    };
  }
  if (locale === "en-IN") {
    return {
      ...publication,
      content: publication.english,
      locale,
      translationSource: "reviewed_original",
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

export async function loadLocalizedBlogPublications(requestedLocale: unknown) {
  const publications = (await loadBlogPublications()).slice(0, 12);
  return Promise.all(
    publications.map((publication) =>
      localizeBlogPublication(publication, requestedLocale)),
  );
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
