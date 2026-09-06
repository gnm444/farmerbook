import { z } from "zod";
import {
  DEFAULT_WEBSITE_GREETER_LOCALE,
  WEBSITE_GREETER_RELEASE_LOCALES,
} from "./locales";

export const websiteGreeterRequestSchema = z.object({
  sessionId: z.uuid(),
  message: z.string().trim().min(1).max(300),
  locale: z.enum(WEBSITE_GREETER_RELEASE_LOCALES)
    .default(DEFAULT_WEBSITE_GREETER_LOCALE),
  contextConsent: z.boolean().default(false),
}).strict();

export type WebsiteGreeterRequest = z.infer<typeof websiteGreeterRequestSchema>;

export const WEBSITE_GREETER_SURFACES = [
  "site_launcher",
  "chat_canary",
] as const;
export type WebsiteGreeterSurface = (typeof WEBSITE_GREETER_SURFACES)[number];

export const websiteGreeterClearRequestSchema = z.object({
  sessionId: z.uuid(),
}).strict();

export type WebsiteGreeterClearRequest = z.infer<
  typeof websiteGreeterClearRequestSchema
>;

export const websiteVisitRequestSchema = z.object({
  sessionId: z.uuid(),
  path: z.string().trim().regex(/^\/[A-Za-z0-9._~:/?#\[\]@!$&'()*+,;=%-]*$/).max(160),
});

export type WebsiteVisitRequest = z.infer<typeof websiteVisitRequestSchema>;

export type WebsiteGreeterAction = {
  label: string;
  href: string;
};
export type WebsiteGreeterReply = {
  text: string;
  actions: WebsiteGreeterAction[];
  source: "approved_answer" | "workers_ai" | "google_agent_engine" | "handoff";
  remainingSessionReplies: number;
  diagnosticCode?: `AI_${string}`;
};

export type WebsiteGreeterState = {
  monthKey: string;
  repliesThisMonth: number;
  aiRepliesThisMonth: number;
  estimatedAiSpendMicros: number;
  uniqueSessionsThisMonth: number;
  lastReplyAt: string | null;
  totalVisits: number;
  visitsThisMonth: number;
};
