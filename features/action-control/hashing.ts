import {
  boundedJsonRecordSchema,
  type BoundedJsonValue,
} from "./contracts";

const encoder = new TextEncoder();
const MAX_CANONICAL_DEPTH = 16;
const MAX_CANONICAL_NODES = 2_000;
const MAX_CANONICAL_BYTES = 64 * 1_024;

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

function canonicalizeValue(
  value: BoundedJsonValue,
  depth: number,
  nodeCounter: { count: number },
): string {
  if (depth > MAX_CANONICAL_DEPTH) {
    throw new Error("ACTION_PAYLOAD_TOO_DEEP");
  }
  nodeCounter.count += 1;
  if (nodeCounter.count > MAX_CANONICAL_NODES) {
    throw new Error("ACTION_PAYLOAD_TOO_COMPLEX");
  }
  if (value === null) return "null";
  if (typeof value === "boolean" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER) {
      throw new Error("ACTION_PAYLOAD_NUMBER_INVALID");
    }
    return JSON.stringify(Object.is(value, -0) ? 0 : value);
  }
  if (Array.isArray(value)) {
    return `[${value
      .map((item) => canonicalizeValue(item, depth + 1, nodeCounter))
      .join(",")}]`;
  }
  const entries = Object.entries(value).sort(([left], [right]) =>
    left < right ? -1 : left > right ? 1 : 0,
  );
  return `{${entries
    .map(
      ([key, item]) =>
        `${JSON.stringify(key)}:${canonicalizeValue(
          item,
          depth + 1,
          nodeCounter,
        )}`,
    )
    .join(",")}}`;
}

export function canonicalizeActionPayload(rawPayload: unknown) {
  const payload = boundedJsonRecordSchema.parse(rawPayload);
  const canonical = canonicalizeValue(payload, 0, { count: 0 });
  if (encoder.encode(canonical).byteLength > MAX_CANONICAL_BYTES) {
    throw new Error("ACTION_PAYLOAD_TOO_LARGE");
  }
  return canonical;
}

export async function hashActionPayload(rawPayload: unknown) {
  const canonical = canonicalizeActionPayload(rawPayload);
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(canonical));
  return bytesToHex(new Uint8Array(digest));
}

export async function actionPayloadMatchesHash(
  rawPayload: unknown,
  expectedSha256: string,
) {
  if (!/^[0-9a-f]{64}$/.test(expectedSha256)) return false;
  const actualSha256 = await hashActionPayload(rawPayload);
  if (actualSha256.length !== expectedSha256.length) return false;
  let difference = 0;
  for (let index = 0; index < actualSha256.length; index += 1) {
    difference |=
      actualSha256.charCodeAt(index) ^ expectedSha256.charCodeAt(index);
  }
  return difference === 0;
}
