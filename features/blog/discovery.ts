import {
  BLOG_TOPICS,
  ORGANIC_INTELLIGENCE_COLLECTION,
  type BlogCollection,
  type BlogPublication,
  type BlogTopic,
} from "./contracts";
export { BLOG_TOPICS, ORGANIC_INTELLIGENCE_COLLECTION } from "./contracts";
export type { BlogCollection, BlogTopic } from "./contracts";

// Presentation metadata stays outside BlogPublication. Existing publication
// JSON and its verification fingerprint must not change when navigation grows.
// Imported articles carry their own collection and topic metadata. The satire
// was already public and has two author-post sources in the same collection.
const articleDiscovery: Record<string, {
  topics: readonly BlogTopic[];
  collection?: BlogCollection;
}> = {
  "money-is-a-mirror-organic-farming-character": { topics: ["work", "life"] },
  "wealth-we-accumulate-health-we-abandon": { topics: ["life", "philosophy"] },
  "a-sacred-journey-through-the-five-elements": { topics: ["philosophy", "life"] },
  "natural-farmer-real-patriot-satire": {
    topics: ["farming", "philosophy"],
    collection: ORGANIC_INTELLIGENCE_COLLECTION,
  },
};

export function isBlogTopic(value: unknown): value is BlogTopic {
  return typeof value === "string"
    && BLOG_TOPICS.some((topic) => topic === value);
}

export function isBlogCollection(value: unknown): value is BlogCollection {
  return value === ORGANIC_INTELLIGENCE_COLLECTION;
}

export function blogTopics(publication: BlogPublication): readonly BlogTopic[] {
  if (publication.topics?.length) return publication.topics;
  const configured = articleDiscovery[publication.slug]?.topics;
  if (configured) return configured;
  return publication.category === "food_safety" || publication.category === "farm_to_table"
    ? ["food"]
    : ["farming"];
}

export function blogCollection(publication: BlogPublication): BlogCollection | null {
  return publication.collection ?? articleDiscovery[publication.slug]?.collection ?? null;
}

export function blogIndexHref(filters: {
  topic?: BlogTopic;
  collection?: BlogCollection;
  page?: number;
} = {}): string {
  const params = new URLSearchParams();
  if (filters.collection) params.set("collection", filters.collection);
  if (filters.topic) params.set("topic", filters.topic);
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));
  const query = params.toString();
  return query ? "/blog?" + query : "/blog";
}
