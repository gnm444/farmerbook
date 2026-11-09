import { z } from "zod";
import {
  HARI_BABU_WORKSHOP_SLUG,
  storedWorkshopRegistrationSchema,
  type StoredWorkshopRegistration,
} from "./registration-contracts";

const encoder = new TextEncoder();
const NONCE_LIFETIME_MS = 30 * 60 * 1000;
const ENVELOPE_VERSION = "v1";

function base64UrlEncode(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function base64UrlDecode(value: string) {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) throw new Error("INVALID_BASE64URL");
  const padded = value.replaceAll("-", "+").replaceAll("_", "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

function requireSecret(secret: string) {
  if (secret.trim().length < 32) throw new Error("WORKSHOP_REGISTRATION_SECRET_REQUIRED");
  return secret;
}

async function deriveKey(secret: string, purpose: string, kind: "encrypt" | "hmac") {
  const material = await crypto.subtle.importKey(
    "raw", encoder.encode(requireSecret(secret)), "HKDF", false, ["deriveKey"],
  );
  const derivation = {
    name: "HKDF",
    hash: "SHA-256",
    salt: encoder.encode("farmerbook-workshop-registration-v1"),
    info: encoder.encode(`${kind}:${HARI_BABU_WORKSHOP_SLUG}:${purpose}`),
  };
  return kind === "encrypt"
    ? crypto.subtle.deriveKey(
        derivation, material, { name: "AES-GCM", length: 256 }, false,
        ["encrypt", "decrypt"],
      )
    : crypto.subtle.deriveKey(
        derivation, material, { name: "HMAC", hash: "SHA-256", length: 256 },
        false, ["sign"],
      );
}

async function hmac(value: string, purpose: string, secret: string) {
  const key = await deriveKey(secret, purpose, "hmac");
  const signature = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, encoder.encode(value)),
  );
  return base64UrlEncode(signature);
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

const noncePayloadSchema = z.strictObject({
  event: z.literal(HARI_BABU_WORKSHOP_SLUG),
  submissionId: z.uuid(),
  issuedAt: z.number().int(),
  expiresAt: z.number().int(),
});

export async function createWorkshopNonce(
  submissionId: string,
  secret: string,
  now = Date.now(),
) {
  const payload = base64UrlEncode(encoder.encode(JSON.stringify({
    event: HARI_BABU_WORKSHOP_SLUG,
    submissionId,
    issuedAt: now,
    expiresAt: now + NONCE_LIFETIME_MS,
  })));
  return `${payload}.${await hmac(payload, "nonce", secret)}`;
}

export async function verifyWorkshopNonce(
  nonce: string,
  submissionId: string,
  secret: string,
  now = Date.now(),
) {
  if (!nonce || nonce.length > 512) return false;
  const [payload, signature, extra] = nonce.split(".");
  if (!payload || !signature || extra) return false;
  const expected = await hmac(payload, "nonce", secret);
  if (!constantTimeEqual(signature, expected)) return false;
  try {
    const parsed = noncePayloadSchema.parse(
      JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(base64UrlDecode(payload))),
    );
    return parsed.submissionId === submissionId
      && parsed.issuedAt <= now + 5 * 60 * 1000
      && parsed.expiresAt > now
      && parsed.expiresAt - parsed.issuedAt === NONCE_LIFETIME_MS;
  } catch {
    return false;
  }
}

export async function workshopValueHash(value: string, purpose: "phone" | "ip", secret: string) {
  return hmac(value, purpose, secret);
}

export async function encryptWorkshopRegistration(
  registration: StoredWorkshopRegistration,
  secret: string,
) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(secret, "registration", "encrypt");
  const plaintext = encoder.encode(JSON.stringify(
    storedWorkshopRegistrationSchema.parse(registration),
  ));
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
      additionalData: encoder.encode(`farmerbook:${HARI_BABU_WORKSHOP_SLUG}:${ENVELOPE_VERSION}`),
    },
    key,
    plaintext,
  );
  return `${ENVELOPE_VERSION}.${base64UrlEncode(iv)}.${base64UrlEncode(new Uint8Array(ciphertext))}`;
}

export async function decryptWorkshopRegistration(envelope: string, secret: string) {
  const [version, encodedIv, encodedCiphertext, extra] = envelope.split(".");
  if (version !== ENVELOPE_VERSION || !encodedIv || !encodedCiphertext || extra) {
    throw new Error("WORKSHOP_REGISTRATION_ENVELOPE_INVALID");
  }
  try {
    const key = await deriveKey(secret, "registration", "encrypt");
    const plaintext = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: base64UrlDecode(encodedIv),
        additionalData: encoder.encode(`farmerbook:${HARI_BABU_WORKSHOP_SLUG}:${ENVELOPE_VERSION}`),
      },
      key,
      base64UrlDecode(encodedCiphertext),
    );
    return storedWorkshopRegistrationSchema.parse(JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(plaintext),
    ));
  } catch {
    throw new Error("WORKSHOP_REGISTRATION_DECRYPTION_FAILED");
  }
}
