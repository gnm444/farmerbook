const ENVELOPE_VERSION = "v1";

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

function configuredSecret(secret = process.env.FARMER_CONTACT_ENCRYPTION_KEY ?? "") {
  if (secret.length < 32) throw new Error("FARMER_CONTACT_ENCRYPTION_KEY_REQUIRED");
  return secret;
}

async function deriveKey(
  secret: string,
  purpose: string,
  usage: "encrypt" | "hash",
) {
  const encoder = new TextEncoder();
  const material = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    "HKDF",
    false,
    ["deriveKey"],
  );
  if (usage === "encrypt") {
    return crypto.subtle.deriveKey(
      {
        name: "HKDF",
        hash: "SHA-256",
        salt: encoder.encode("farmerbook-private-contacts-v1"),
        info: encoder.encode(`encrypt:${purpose}`),
      },
      material,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
  }
  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: encoder.encode("farmerbook-private-contacts-v1"),
      info: encoder.encode(`hash:${purpose}`),
    },
    material,
    { name: "HMAC", hash: "SHA-256", length: 256 },
    false,
    ["sign"],
  );
}

export function privateFarmerContactConfiguration(
  environment: Record<string, string | undefined> = process.env,
) {
  const encryptionKey = environment.FARMER_CONTACT_ENCRYPTION_KEY?.trim() ?? "";
  const ownerId = environment.FARMER_CONTACT_OWNER_ID?.trim() ?? "";
  return {
    encryptionKey,
    ownerId,
    configured:
      encryptionKey.length >= 32 &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(ownerId),
  };
}

export async function encryptPrivateContactValue(
  value: string,
  purpose: "display_name" | "email" | "phone",
  secret = configuredSecret(),
) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const key = await deriveKey(secret, purpose, "encrypt");
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
      additionalData: encoder.encode(`farmerbook:${purpose}:${ENVELOPE_VERSION}`),
    },
    key,
    encoder.encode(value),
  );
  return `${ENVELOPE_VERSION}.${base64UrlEncode(iv)}.${base64UrlEncode(new Uint8Array(ciphertext))}`;
}

export async function decryptPrivateContactValue(
  envelope: string,
  purpose: "display_name" | "email" | "phone",
  secret = configuredSecret(),
) {
  const [version, encodedIv, encodedCiphertext, extra] = envelope.split(".");
  if (version !== ENVELOPE_VERSION || !encodedIv || !encodedCiphertext || extra) {
    throw new Error("PRIVATE_CONTACT_ENVELOPE_INVALID");
  }
  const encoder = new TextEncoder();
  const key = await deriveKey(secret, purpose, "encrypt");
  try {
    const plaintext = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: base64UrlDecode(encodedIv),
        additionalData: encoder.encode(`farmerbook:${purpose}:${ENVELOPE_VERSION}`),
      },
      key,
      base64UrlDecode(encodedCiphertext),
    );
    return new TextDecoder().decode(plaintext);
  } catch {
    throw new Error("PRIVATE_CONTACT_DECRYPTION_FAILED");
  }
}

export async function privateContactValueHash(
  normalizedValue: string,
  purpose: "email" | "phone",
  secret = configuredSecret(),
) {
  const key = await deriveKey(secret, purpose, "hash");
  const signature = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(normalizedValue)),
  );
  return [...signature]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
