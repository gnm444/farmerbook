import { z } from "zod";
import { SUPPORTED_LOCALES } from "@/lib/i18n/locales";

export const blogSectionSchema = z.object({
  heading: z.string().trim().min(2).max(180),
  paragraphs: z.array(z.string().trim().min(2).max(2_400)).min(1).max(6),
  bullets: z.array(z.string().trim().min(2).max(600)).max(8).default([]),
});

export const localizedBlogContentSchema = z.object({
  title: z.string().trim().min(8).max(220),
  excerpt: z.string().trim().min(20).max(500),
  dek: z.string().trim().min(20).max(900),
  sections: z.array(blogSectionSchema).min(2).max(10),
  conclusion: z.string().trim().min(20).max(2_000),
  safetyNote: z.string().trim().min(20).max(1_000),
});

export const blogSourceSchema = z.object({
  title: z.string().trim().min(2).max(240),
  publisher: z.string().trim().min(2).max(160),
  url: z.url().refine((url) => url.startsWith("https://"), "HTTPS is required"),
});

export const blogPublicationSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120),
  category: z.enum([
    "natural_farming",
    "food_safety",
    "farm_to_table",
    // Retained for already-published managed drafts from earlier releases.
    "regular_farming",
    "farm_tools",
  ]),
  author: z.string().trim().min(2).max(120),
  publishedAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  readingMinutes: z.number().int().min(1).max(30),
  editorialNote: z.string().trim().min(20).max(1_000),
  sources: z.array(blogSourceSchema).min(1).max(12),
  english: localizedBlogContentSchema,
  telugu: localizedBlogContentSchema.optional(),
});

export const blogTranslationRequestSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120),
  locale: z.enum(SUPPORTED_LOCALES),
  contentFingerprint: z.string().regex(/^[0-9a-f]{64}$/),
  sourceContent: localizedBlogContentSchema,
});

export const blogDraftReviewSchema = z.object({
  id: z.string().uuid(),
  decision: z.enum(["publish", "reject"]),
  reviewerId: z.string().trim().min(2).max(120),
});

export type BlogSection = z.infer<typeof blogSectionSchema>;
export type LocalizedBlogContent = z.infer<typeof localizedBlogContentSchema>;
export type BlogSource = z.infer<typeof blogSourceSchema>;
export type BlogPublication = z.infer<typeof blogPublicationSchema>;

export type BlogTranslationResult = {
  content: LocalizedBlogContent;
  source: "reviewed_original" | "ai_assisted_translation" | "english_fallback";
  model: string | null;
};

export type BlogAgentDraft = {
  id: string;
  weekKey: string;
  status: "awaiting_review" | "published" | "rejected";
  topic: string;
  content: BlogPublication;
  model: string;
  createdAt: string;
  reviewedAt: string | null;
  reviewerId: string | null;
};

export type BlogWritingAgentStatus = {
  monthKey: string;
  draftsThisMonth: number;
  translationsThisMonth: number;
  estimatedAiSpendMicros: number;
  monthlyBudgetUsd: number;
  model: string;
  scheduleId: string | null;
  nextScheduledRunAt: string | null;
  lastDraftAt: string | null;
  lastFailureCode: string | null;
};
