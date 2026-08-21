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
  expectedRevision: z.number().int().min(1),
  reason: z.string().trim().min(10).max(1_000),
  qualityOutcome: z.enum([
    "approved",
    "light_edits",
    "heavy_edits",
    "rejected",
  ]),
}).superRefine((input, context) => {
  if (input.decision === "reject" && input.qualityOutcome !== "rejected") {
    context.addIssue({
      code: "custom",
      path: ["qualityOutcome"],
      message: "Rejected drafts require the rejected quality outcome",
    });
  }
  if (input.decision === "publish" && input.qualityOutcome === "rejected") {
    context.addIssue({
      code: "custom",
      path: ["qualityOutcome"],
      message: "Published drafts require a publication quality outcome",
    });
  }
});

export const blogDraftReplacementSchema = z.object({
  id: z.string().uuid(),
  expectedRevision: z.number().int().min(1),
  editorId: z.string().trim().min(2).max(120),
  publication: blogPublicationSchema,
});

export const blogScheduleControlSchema = z.object({
  operatorId: z.string().trim().min(2).max(120),
  reason: z.string().trim().min(10).max(500),
});

export const blogPublicationVerificationSchema = z.object({
  id: z.string().uuid(),
  verifierId: z.string().trim().min(2).max(120),
  status: z.enum(["verified", "failed"]),
  code: z.string().trim().regex(/^[A-Z0-9_]{2,80}$/),
  expectedContentSha256: z.string().regex(/^[0-9a-f]{64}$/),
});

export const blogPublicationVerificationJobSchema = z.object({
  draftId: z.string().uuid(),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120),
  contentSha256: z.string().regex(/^[0-9a-f]{64}$/),
  title: z.string().trim().min(8).max(220),
  excerpt: z.string().trim().min(20).max(500),
  canonicalUrl: z.url(),
  runKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
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
  runKey: string;
  status: "awaiting_review" | "published" | "rejected";
  topic: string;
  content: BlogPublication;
  model: string;
  sourceManifestVersion: string;
  sourceReviewedAt: string;
  riskClass: "low" | "medium" | "legacy";
  generationStatus: "prepared" | "legacy";
  failureCode: string | null;
  revision: number;
  createdAt: string;
  reviewedAt: string | null;
  reviewerId: string | null;
  reviewReason: string | null;
  qualityOutcome:
    | "approved"
    | "light_edits"
    | "heavy_edits"
    | "rejected"
    | null;
  publicationVerificationStatus: "pending" | "verified" | "failed" | null;
  publicationVerifiedAt: string | null;
  publicationVerificationCode: string | null;
  publicationMode: "manual" | "autonomous";
  publicationPolicyVersion: string | null;
  publicationIdempotencyKey: string | null;
  contentSha256: string | null;
  visibilityStatus: "private" | "provisional" | "public" | "quarantined";
};

export type BlogDailyRunStatus = {
  runKey: string;
  source: "scheduled" | "manual";
  status: "started" | "prepared" | "failed" | "skipped";
  topicKey: string;
  draftId: string | null;
  failureCode: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BlogReviewMetrics = {
  awaitingReview: number;
  published: number;
  rejected: number;
  approved: number;
  lightEdits: number;
  heavyEdits: number;
  oldestAwaitingReviewAt: string | null;
};

export type BlogWritingAgentStatus = {
  monthKey: string;
  draftsThisMonth: number;
  translationsThisMonth: number;
  estimatedAiSpendMicros: number;
  monthlyBudgetUsd: number;
  model: string;
  scheduleId: string | null;
  schedulePaused: boolean;
  scheduleState: "scheduled" | "paused" | "missing";
  scheduleCronUtc: string;
  scheduleTimeZone: "Asia/Kolkata";
  nextScheduledRunAt: string | null;
  currentRunKey: string;
  todayRun: BlogDailyRunStatus | null;
  dailyDraftLimit: number;
  monthlyDraftLimit: number;
  sourceManifestVersion: string;
  oldestSourceReviewedAt: string | null;
  staleSourceCount: number;
  reviewMetrics: BlogReviewMetrics;
  autonomousPublishingEnabled: boolean;
  autonomousPolicyVersion: string;
  autonomousPublishedThisMonth: number;
  provisionalPublications: number;
  quarantinedPublications: number;
  lastDraftAt: string | null;
  lastFailureCode: string | null;
};
