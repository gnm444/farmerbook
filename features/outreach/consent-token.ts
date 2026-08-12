import { z } from "zod";
import { constantTimeEqual } from "./crypto";

const TOKEN_TTL_MS = 30 * 60 * 1_000;
const tokenPayloadSchema = z.object({ nonce: z.uuid(), expiresAt: z.number().int() });

function base64UrlEncode(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function base64UrlDecode(value: string) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function signature(payload: string, secret: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return base64UrlEncode(new Uint8Array(signed));
}

export async function createConsentToken(
  secret: string,
  now = Date.now(),
) {
  if (secret.length < 32) throw new Error("CONSENT_SIGNING_SECRET_REQUIRED");
  const payload = base64UrlEncode(
    new TextEncoder().encode(
      JSON.stringify({ nonce: crypto.randomUUID(), expiresAt: now + TOKEN_TTL_MS }),
    ),
  );
  return `${payload}.${await signature(payload, secret)}`;
}

export async function verifyConsentToken(
  token: string,
  secret: string,
  now = Date.now(),
) {
  if (secret.length < 32 || token.length > 512) return null;
  const [payload, providedSignature, extra] = token.split(".");
  if (!payload || !providedSignature || extra) return null;
  const expected = await signature(payload, secret);
  if (!constantTimeEqual(providedSignature, expected)) return null;
  try {
    const parsed = tokenPayloadSchema.parse(
      JSON.parse(new TextDecoder().decode(base64UrlDecode(payload))),
    );
    return parsed.expiresAt > now ? parsed : null;
  } catch {
    return null;
  }
}
