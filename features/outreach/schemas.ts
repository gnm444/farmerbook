import { z } from "zod";
import { AGRICULTURE_CATEGORIES } from "@/lib/agriculture/categories";
import { isIndiaStateOrUnionTerritory } from "@/lib/india/regions";
import { SUPPORTED_LOCALES } from "@/lib/i18n/locales";
import {
  outreachChannels,
  outreachRoles,
  outreachStatuses,
} from "./types";

export const OUTREACH_CONSENT_POLICY_VERSION = "2026-08-09.1";
export const OUTREACH_MAX_SOURCE_TEXT = 8_000;
export const OUTREACH_MAX_SCREENSHOT_DATA_URL = 3_000_000;

const categorySlugs = new Set<string>(
  AGRICULTURE_CATEGORIES.map((category) => category.slug),
);

const boundedText = (minimum: number, maximum: number) =>
  z
    .string()
    .trim()
    .min(minimum)
    .max(maximum)
    .refine((value) => !/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(value), {
      message: "Control characters are not allowed.",
    });

export const sourceUrlSchema = z
  .url()
  .max(2_048)
  .refine((value) => {
    const protocol = new URL(value).protocol;
    return protocol === "https:" || protocol === "http:";
  }, "Use an HTTP or HTTPS link.");

export const outreachSourceInputSchema = z
  .object({
    sourceUrl: sourceUrlSchema,
    businessName: boundedText(2, 120).optional(),
    description: boundedText(2, OUTREACH_MAX_SOURCE_TEXT).optional(),
    screenshotDataUrl: z
      .string()
      .max(OUTREACH_MAX_SCREENSHOT_DATA_URL)
      .refine(
        (value) => /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value),
        "Upload a PNG, JPEG or WebP screenshot.",
      )
      .optional(),
    sourcePermissionConfirmed: z.literal(true),
    idempotencyKey: z.uuid(),
  })
  .strict();

export const outreachAnalysisSchema = z
  .object({
    suggestedRole: z.enum(outreachRoles),
    categorySlugs: z
      .array(z.string())
      .max(8)
      .transform((values) => [...new Set(values)])
      .refine(
        (values) => values.every((value) => categorySlugs.has(value)),
        "The analysis returned an unknown agriculture category.",
      ),
    preferredLocale: z.enum(SUPPORTED_LOCALES),
    rationale: boundedText(2, 600),
    introductionDraft: boundedText(20, 1_500),
  })
  .strict();

export const outreachTransitionSchema = z
  .object({
    prospectId: z.uuid(),
    expectedRevision: z.number().int().nonnegative(),
    nextStatus: z.enum(outreachStatuses),
    note: boundedText(2, 500).optional(),
    idempotencyKey: z.uuid(),
  })
  .strict();

const consentLeadShape = {
  role: z.enum(outreachRoles.filter((role) => role !== "unknown")),
  fullName: boundedText(2, 100),
  businessName: boundedText(2, 120).optional(),
  state: z.string().refine(isIndiaStateOrUnionTerritory, "Select an Indian state or union territory."),
  district: boundedText(2, 100),
  preferredLocale: z.enum(SUPPORTED_LOCALES),
  preferredChannel: z.enum(outreachChannels),
  email: z.email().max(254).optional(),
  phone: z
    .string()
    .trim()
    .regex(/^\+91[6-9]\d{9}$/, "Use an Indian mobile number in +91 format.")
    .optional(),
  introductionConsent: z.literal(true),
  followupConsent: z.boolean().default(false),
  consentPolicyVersion: z.literal(OUTREACH_CONSENT_POLICY_VERSION),
  campaignCode: z.string().trim().regex(/^[a-z0-9][a-z0-9_-]{0,63}$/).optional(),
} as const;

function validateConsentContact(
  value: { preferredChannel: string; email?: string; phone?: string },
  context: z.RefinementCtx,
) {
  if (value.preferredChannel === "email" && !value.email) {
    context.addIssue({ code: "custom", path: ["email"], message: "Email is required for email consent." });
  }
  if (value.preferredChannel !== "email" && !value.phone) {
    context.addIssue({ code: "custom", path: ["phone"], message: "A verified mobile number is required for this channel." });
  }
}

export const consentLeadSchema = z
  .object({
    ...consentLeadShape,
    consentNonce: z
      .string()
      .max(512)
      .regex(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/),
    turnstileToken: z.string().min(1).max(2_048),
  })
  .strict()
  .superRefine(validateConsentContact);

export const verifiedConsentLeadSchema = z
  .object(consentLeadShape)
  .strict()
  .superRefine(validateConsentContact);

export const googleLeadWebhookSchema = z
  .object({
    google_key: z.string().min(16).max(512),
    lead_id: z.string().min(1).max(200),
    campaign_id: z.string().min(1).max(100),
    form_id: z.string().min(1).max(100),
    user_column_data: z
      .array(
        z.object({
          column_id: z.string().min(1).max(100),
          string_value: z.string().max(1_000).optional(),
        }),
      )
      .max(30),
    api_version: z.string().max(50).optional(),
    is_test: z.boolean().optional(),
  })
  .passthrough();

export type ConsentLeadInput = z.infer<typeof consentLeadSchema>;
export type OutreachSourceInput = z.infer<typeof outreachSourceInputSchema>;
