import { z } from "zod";

export const ownedSocialChannelSchema = z.enum(["facebook", "instagram"]);

export const verifiedArticleEnvelopeSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120),
  title: z.string().trim().min(8).max(220),
  excerpt: z.string().trim().min(20).max(500),
  canonicalUrl: z.url().refine((value) => {
    const url = new URL(value);
    return url.protocol === "https:"
      && (url.hostname === "farmerbook.in" || url.hostname === "www.farmerbook.in");
  }, "Only canonical FarmerBook HTTPS URLs are allowed"),
  contentSha256: z.string().regex(/^[0-9a-f]{64}$/),
  runKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  locale: z.literal("en-IN"),
  campaignCode: z.string().regex(/^[a-z0-9_]{3,48}$/),
});

export const socialChannelControlSchema = z.object({
  channel: ownedSocialChannelSchema,
  paused: z.boolean(),
  operatorId: z.string().trim().min(2).max(120),
  reason: z.string().trim().min(10).max(500),
});

export const ownedSocialConnectorRequestSchema = z.object({
  attemptId: z.string().uuid(),
  providerIdempotencyKey: z.string().regex(/^[a-z0-9:_-]{20,240}$/),
  channel: ownedSocialChannelSchema,
  text: z.string().trim().min(20).max(2_000),
  canonicalUrl: z.url(),
  mediaUrl: z.url().optional(),
});

export const ownedSocialConnectorResponseSchema = z.object({
  code: z.enum(["VERIFIED", "FAILED", "UNKNOWN"]),
  providerReceiptId: z.string().trim().min(1).max(500).optional(),
  failureCode: z.string().regex(/^[A-Z0-9_]{2,80}$/).optional(),
}).superRefine((value, context) => {
  if (value.code === "VERIFIED" && !value.providerReceiptId) {
    context.addIssue({
      code: "custom",
      path: ["providerReceiptId"],
      message: "Verified provider results require a receipt",
    });
  }
});

export type OwnedSocialChannel = z.infer<typeof ownedSocialChannelSchema>;
export type VerifiedArticleEnvelope = z.infer<typeof verifiedArticleEnvelopeSchema>;

export type OwnedSocialPublisherStatus = {
  globallyEnabled: boolean;
  connectorConfigured: boolean;
  channels: Record<OwnedSocialChannel, {
    configured: boolean;
    paused: boolean;
    verifiedThisMonth: number;
    lastCode: string | null;
  }>;
};
