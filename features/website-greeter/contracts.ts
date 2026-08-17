import { z } from "zod";

export const websiteGreeterRequestSchema = z.object({
  sessionId: z.uuid(),
  message: z.string().trim().min(1).max(300),
  locale: z.string().trim().regex(/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8}){0,2}$/).max(24),
});

export type WebsiteGreeterRequest = z.infer<typeof websiteGreeterRequestSchema>;

export type WebsiteGreeterAction = {
  label: string;
  href: string;
};
export type WebsiteGreeterReply = {
  text: string;
  actions: WebsiteGreeterAction[];
  source: "approved_answer" | "workers_ai" | "handoff";
  remainingSessionReplies: number;
};

export type WebsiteGreeterState = {
  monthKey: string;
  repliesThisMonth: number;
  aiRepliesThisMonth: number;
  estimatedAiSpendMicros: number;
  uniqueSessionsThisMonth: number;
  lastReplyAt: string | null;
};
