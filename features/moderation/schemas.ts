import { z } from "zod";

export const reportSchema = z.object({
  targetType: z.enum([
    "profile",
    "post",
    "comment",
    "message",
    "review",
    "organization",
    "business_offer",
    "produce_listing",
    "certification_claim",
  ]),
  targetId: z.string().min(1),
  reason: z.enum(["misinformation", "harassment", "spam", "unsafe", "other"]),
  details: z.string().trim().max(1000).default(""),
});

export const moderationActionSchema = z.object({
  reportId: z.string().min(1),
  action: z.enum([
    "dismiss",
    "hide",
    "restore",
    "suspend",
    "unsuspend",
    "verify",
    "reject",
  ]),
  targetId: z.string().min(1),
  targetType: z.enum([
    "profile",
    "post",
    "comment",
    "message",
    "review",
    "organization",
    "business_offer",
    "produce_listing",
    "certification_claim",
  ]),
  note: z.string().trim().max(1000).default(""),
});

export const userModerationSchema = z.object({
  userId: z.string().min(1),
  action: z.enum(["verify", "reject", "suspend", "restore"]),
  note: z.string().trim().max(1000).default(""),
});
