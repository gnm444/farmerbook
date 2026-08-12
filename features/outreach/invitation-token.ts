import { z } from "zod";
import { constantTimeEqual } from "./crypto";

export const OUTREACH_INVITATION_COOKIE = "farmerbook_outreach_invite";
export const OUTREACH_INVITATION_TTL_MS = 14 * 24 * 60 * 60 * 1_000;

const invitationPayloadSchema = z.object({
  version: z.literal(1),
  outboxId: z.uuid(),
  expiresAt: z.number().int().positive(),
});

export type OutreachInvitationPayload = z.infer<
  typeof invitationPayloadSchema
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

async function invitationSignature(payload: string, secret: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`farmerbook-outreach-invitation:${payload}`),
  );
  return base64UrlEncode(new Uint8Array(signature));
}

export async function createOutreachInvitationToken(input: {
  outboxId: string;
  secret: string;
  expiresAt: number;
}) {
  if (input.secret.length < 32) {
    throw new Error("INVITATION_SIGNING_SECRET_REQUIRED");
  }
  const parsed = invitationPayloadSchema.parse({
    version: 1,
    outboxId: input.outboxId,
    expiresAt: input.expiresAt,
  });
  const payload = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify(parsed)),
  );
  return `${payload}.${await invitationSignature(payload, input.secret)}`;
}

export async function verifyOutreachInvitationToken(
  token: string,
  secret: string,
  now = Date.now(),
) {
  if (secret.length < 32 || token.length > 768) return null;
  const [payload, providedSignature, extra] = token.split(".");
  if (!payload || !providedSignature || extra) return null;
  const expectedSignature = await invitationSignature(payload, secret);
  if (!constantTimeEqual(providedSignature, expectedSignature)) return null;
  try {
    const parsed = invitationPayloadSchema.parse(
      JSON.parse(new TextDecoder().decode(base64UrlDecode(payload))),
    );
    return parsed.expiresAt > now ? parsed : null;
  } catch {
    return null;
  }
}
