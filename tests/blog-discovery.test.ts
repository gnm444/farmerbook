import { describe, expect, it } from "vitest";
import { blogPublicationSchema, type BlogPublication } from "@/features/blog/contracts";
import {
  blogIndexHref,
  blogCollection,
  blogTopics,
  isBlogCollection,
  isBlogTopic,
} from "@/features/blog/discovery";
import {
  foundingBlogPublication,
  STATIC_BLOG_PUBLICATIONS,
} from "@/features/blog/published";
import { moneyCharacterPublication } from "@/features/blog/publications/money-character";
import { blogEditorialNote, translationNotice } from "@/features/blog/presentation";
import {
  localizeBlogPublication,
  mergeBlogPublications,
  selectBlogIndex,
} from "@/features/blog/queries";

describe("blog discovery", () => {
  it("publishes the approved 23 bilingual adaptations with one existing collection essay", () => {
    const all: readonly BlogPublication[] = STATIC_BLOG_PUBLICATIONS;
    const imported = all.filter((article) =>
      article.sourceProvenance === "private_author_post");
    expect(imported).toHaveLength(23);
    expect(new Set(all.map((article) => article.slug)).size)
      .toBe(all.length);
    expect(imported.every((article) => article.telugu
      && article.sources.length === 0
      && article.collection === "organic-intelligence"
      && article.languageStatus?.english === "ai_assisted_adaptation"
      && article.languageStatus?.telugu === "ai_assisted_adaptation"))
      .toBe(true);
    expect(all.filter((article) =>
      blogCollection(article) === "organic-intelligence")).toHaveLength(24);
  });

  it("keeps articles beyond the former twelve-item index limit reachable", () => {
    const articles = Array.from({ length: 13 }, (_, index) => ({
      ...foundingBlogPublication,
      slug: "sample-article-" + index,
      publishedAt: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
    }));
    const first = selectBlogIndex(articles);
    const second = selectBlogIndex(articles, { page: 2 });

    expect(first.pageCount).toBe(2);
    expect(first.publications).toHaveLength(12);
    expect(second.publications.map((article) => article.slug))
      .toEqual(["sample-article-0"]);
  });

  it("uses meaningful topic URLs and preserves old article fingerprints", () => {
    expect(blogTopics(moneyCharacterPublication)).toContain("work");
    expect(blogIndexHref({ topic: "philosophy", page: 2 }))
      .toBe("/blog?topic=philosophy&page=2");
    expect(blogIndexHref({ collection: "organic-intelligence", topic: "life" }))
      .toBe("/blog?collection=organic-intelligence&topic=life");
    expect(isBlogTopic("philosophy")).toBe(true);
    expect(isBlogTopic("unknown")).toBe(false);
    expect(isBlogCollection("organic-intelligence")).toBe(true);
    expect(blogPublicationSchema.parse(moneyCharacterPublication))
      .not.toHaveProperty("sourceProvenance");
  });

  it("keeps index and detail lookup on the static article when slugs collide", () => {
    const managed = {
      ...foundingBlogPublication,
      english: {
        ...foundingBlogPublication.english,
        title: "A conflicting managed title",
      },
    };
    const merged = mergeBlogPublications([foundingBlogPublication], [managed]);
    expect(merged).toHaveLength(1);
    expect(merged[0].english.title).toBe(foundingBlogPublication.english.title);
  });

  it("permits a private author post without a fabricated citation and labels its adaptation", async () => {
    const original = {
      ...moneyCharacterPublication,
      sources: [],
      sourceProvenance: "private_author_post",
    };
    expect(blogPublicationSchema.safeParse(original).success).toBe(true);
    expect(blogPublicationSchema.safeParse({
      ...original,
      sourceProvenance: undefined,
    }).success).toBe(false);
    expect(blogPublicationSchema.safeParse({
      ...original,
      author: "FarmerBook Blog Writing Agent",
    }).success).toBe(false);
    const publication = blogPublicationSchema.parse({
      ...original,
      collection: "organic-intelligence",
      topics: ["life", "philosophy"],
      languageStatus: {
        english: "ai_assisted_adaptation",
        telugu: "ai_assisted_adaptation",
      },
      telugu: moneyCharacterPublication.english,
    });
    expect(blogTopics(publication)).toEqual(["life", "philosophy"]);
    expect(publication.collection).toBe("organic-intelligence");
    const english = await localizeBlogPublication(publication, "en-IN");
    const telugu = await localizeBlogPublication(publication, "te-IN");
    expect(english.translationSource).toBe("ai_assisted_editorial_adaptation");
    expect(telugu.translationSource).toBe("ai_assisted_editorial_adaptation");
    expect(translationNotice(english.translationSource, "en-IN"))
      .toContain("AI-assisted editorial adaptation");
    expect(translationNotice("english_fallback", "hi-IN", "private_author_post"))
      .toContain("AI की सहायता से तैयार संपादकीय लेख");
    expect(blogEditorialNote(publication, "te-IN"))
      .toContain("AI సహాయంతో రూపొందించిన");
  });
});
