import { z } from "zod";
import { constantTimeEqual } from "./crypto";
import { outreachEngagementTypes } from "./schemas";

export const EMAIL_CONSENT_TTL_MS = 48 * 60 * 60 * 1_000;
export const EMAIL_UNSUBSCRIBE_TTL_MS = 400 * 24 * 60 * 60 * 1_000;

const consentPayloadSchema = z.object({
  version: z.literal(2),
  action: z.literal("confirm_consent"),
  prospectId: z.uuid(),
  contactCandidateId: z.uuid(),
  engagementType: z.enum(outreachEngagementTypes),
  requestedPurposes: z
    .array(z.enum(["farmerbook_introduction", "onboarding_followup"]))
    .min(1)
    .max(2),
  expiresAt: z.number().int().positive(),
});

const unsubscribePayloadSchema = z.object({
  version: z.literal(1),
  action: z.literal("unsubscribe"),
  outboxId: z.uuid(),
  expiresAt: z.number().int().positive(),
});

export type EmailConsentPayload = z.infer<typeof consentPayloadSchema>;
export type EmailUnsubscribePayload = z.infer<
  typeof unsubscribePayloadSchema
>;

function base64UrlEncode(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(value: string) {
  const padded = value
    .replaceAll("-", "+")
    .replaceAll("_", "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function signature(payload: string, action: string, secret: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`farmerbook-email-${action}:${payload}`),
  );
  return base64UrlEncode(new Uint8Array(signed));
}

async function createToken(
  payloadValue: EmailConsentPayload | EmailUnsubscribePayload,
  secret: string,
) {
  if (secret.length < 32) throw new Error("EMAIL_ACTION_SECRET_REQUIRED");
  const payload = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify(payloadValue)),
  );
  return `${payload}.${await signature(payload, payloadValue.action, secret)}`;
}

async function verifyToken<T>(input: {
  token: string;
  secret: string;
  action: string;
  schema: z.ZodType<T>;
  now?: number;
}) {
  if (input.secret.length < 32 || input.token.length > 1_024) return null;
  const [payload, providedSignature, extra] = input.token.split(".");
  if (!payload || !providedSignature || extra) return null;
  const expected = await signature(payload, input.action, input.secret);
  if (!constantTimeEqual(providedSignature, expected)) return null;
  try {
    const parsed = input.schema.parse(
      JSON.parse(new TextDecoder().decode(base64UrlDecode(payload))),
    ) as T & { expiresAt: number };
    return parsed.expiresAt > (input.now ?? Date.now()) ? parsed : null;
  } catch {
    return null;
  }
}

export function createEmailConsentToken(input: {
  prospectId: string;
  contactCandidateId: string;
  engagementType: (typeof outreachEngagementTypes)[number];
  requestedPurposes: Array<
    "farmerbook_introduction" | "onboarding_followup"
  >;
  expiresAt: number;
  secret: string;
}) {
  return createToken(
    consentPayloadSchema.parse({
      version: 2,
      action: "confirm_consent",
      prospectId: input.prospectId,
      contactCandidateId: input.contactCandidateId,
      engagementType: input.engagementType,
      requestedPurposes: [...new Set(input.requestedPurposes)],
      expiresAt: input.expiresAt,
    }),
    input.secret,
  );
}

export function verifyEmailConsentToken(
  token: string,
  secret: string,
  now?: number,
) {
  return verifyToken({
    token,
    secret,
    action: "confirm_consent",
    schema: consentPayloadSchema,
    now,
  });
}

export function createEmailUnsubscribeToken(input: {
  outboxId: string;
  expiresAt: number;
  secret: string;
}) {
  return createToken(
    unsubscribePayloadSchema.parse({
      version: 1,
      action: "unsubscribe",
      outboxId: input.outboxId,
      expiresAt: input.expiresAt,
    }),
    input.secret,
  );
}

export function verifyEmailUnsubscribeToken(
  token: string,
  secret: string,
  now?: number,
) {
  return verifyToken({
    token,
    secret,
    action: "unsubscribe",
    schema: unsubscribePayloadSchema,
    now,
  });
}
