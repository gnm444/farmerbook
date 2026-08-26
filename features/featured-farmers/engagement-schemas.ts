import { z } from "zod";

const singleLine = (minimum: number, maximum: number) =>
  z
    .string()
    .trim()
    .min(minimum)
    .max(maximum)
    .refine(
      (value) => !/[\u0000-\u001f\u007f]/u.test(value),
      "Use plain text without line breaks or control characters.",
    );

const multiline = (minimum: number, maximum: number) =>
  z
    .string()
    .trim()
    .min(minimum)
    .max(maximum)
    .refine(
      (value) => !/[\u0000-\u0009\u000b-\u001f\u007f]/u.test(value),
      "Use plain text without control characters.",
    );

export const featuredFarmerQuestionSchema = z.strictObject({
  slug: z.string().trim().min(3).max(120),
  name: singleLine(2, 120),
  email: z.email("Enter a valid reply email address.").trim().max(254),
  kind: z.enum(["question", "comment"]),
  message: multiline(20, 1500),
  consent: z.literal(true, { error: "Consent is required." }),
  idempotencyKey: z.uuid(),
  turnstileToken: z.string().trim().min(1).max(4096),
  website: z.string().trim().max(0).optional().default(""),
});

export const featuredFarmerRecommendationSchema = z.strictObject({
  slug: z.string().trim().min(3).max(120),
  relationshipContext: singleLine(2, 160),
  body: multiline(50, 1000),
  consent: z.literal(true, { error: "Public-display consent is required." }),
  idempotencyKey: z.uuid(),
});

export const featuredFarmerModerationSchema = z.strictObject({
  recommendationId: z.uuid(),
  nextStatus: z.enum(["approved", "rejected", "hidden"]),
  note: multiline(2, 500),
});

export const questionReservationSchema = z.object({
  code: z.enum([
    "CREATED",
    "IDEMPOTENT_REPLAY",
    "SENDER_RATE_LIMITED",
    "SUBJECT_RATE_LIMITED",
  ]),
  delivery_id: z.uuid().nullable(),
  created_at: z.iso.datetime({ offset: true }),
  notification_state: z.enum(["pending", "sent", "failed", "unknown"]),
});

export const recommendationActionRowSchema = z.object({
  code: z.enum(["CREATED", "UPDATED", "IDEMPOTENT_REPLAY"]),
  recommendation_id: z.uuid(),
  recommendation_status: z.enum([
    "pending",
    "approved",
    "rejected",
    "withdrawn",
    "hidden",
  ]),
  updated_at: z.iso.datetime({ offset: true }),
});

export type FeaturedFarmerQuestionInput = z.infer<
  typeof featuredFarmerQuestionSchema
>;
