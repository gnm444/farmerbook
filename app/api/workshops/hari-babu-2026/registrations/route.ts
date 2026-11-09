import { NextResponse } from "next/server";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { verifyTurnstileToken } from "@/features/outreach/turnstile";
import {
  HARI_BABU_WORKSHOP_CONSENT_VERSION,
  HARI_BABU_WORKSHOP_TURNSTILE_ACTION,
  isWorkshopRegistrationClosed,
  privateRegistrationFromInput,
  workshopRegistrationInputSchema,
} from "@/features/workshops/registration-contracts";
import {
  createWorkshopNonce,
  encryptWorkshopRegistration,
  verifyWorkshopNonce,
  workshopValueHash,
} from "@/features/workshops/registration-crypto";
import {
  workshopRegistrationRuntime,
  workshopTurnstileConfigured,
} from "@/features/workshops/registration-runtime";

const MAX_REQUEST_BYTES = 16_384;

function jsonResponse(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "x-robots-tag": "noindex, nofollow",
    },
  });
}

function sameOrigin(request: Request) {
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = request.headers.get("origin");
  if (!origin) return request.headers.get("sec-fetch-site") === "same-origin";
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

async function boundedJson(request: Request) {
  const contentType = request.headers.get("content-type")
    ?.split(";", 1)[0]?.trim().toLowerCase();
  if (contentType !== "application/json") {
    return { ok: false as const, status: 415, error: "Send JSON to register." };
  }
  const contentLength = request.headers.get("content-length");
  if (contentLength && /^\d+$/u.test(contentLength)
    && Number(contentLength) > MAX_REQUEST_BYTES) {
    return { ok: false as const, status: 413, error: "The registration is too large." };
  }
  if (!request.body) {
    return { ok: false as const, status: 400, error: "The registration is empty." };
  }
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_REQUEST_BYTES) {
        await reader.cancel().catch(() => undefined);
        return { ok: false as const, status: 413, error: "The registration is too large." };
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return {
      ok: true as const,
      body: JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown,
    };
  } catch {
    return { ok: false as const, status: 400, error: "The registration is not valid JSON." };
  } finally {
    reader.releaseLock();
  }
}

export async function GET() {
  if (!isFeatureEnabled("ENABLE_HARI_BABU_WORKSHOP")) {
    return jsonResponse({ error: "Workshop registration is unavailable." }, 404);
  }
  if (isWorkshopRegistrationClosed()) {
    return jsonResponse({ error: "Workshop registration has closed." }, 410);
  }
  if (!workshopTurnstileConfigured()) {
    return jsonResponse({ error: "Registration protection is unavailable." }, 503);
  }
  try {
    const runtime = await workshopRegistrationRuntime();
    if (!runtime) return jsonResponse({ error: "Registration is unavailable." }, 503);
    const submissionId = crypto.randomUUID();
    const nonce = await createWorkshopNonce(submissionId, runtime.secret);
    return jsonResponse({ submissionId, nonce });
  } catch {
    return jsonResponse({ error: "Registration is unavailable." }, 503);
  }
}

export async function POST(request: Request) {
  if (!isFeatureEnabled("ENABLE_HARI_BABU_WORKSHOP")) {
    return jsonResponse({ error: "Workshop registration is unavailable." }, 404);
  }
  if (isWorkshopRegistrationClosed()) {
    return jsonResponse({ error: "Workshop registration has closed." }, 410);
  }
  if (!sameOrigin(request)) {
    return jsonResponse({ error: "The request origin could not be verified." }, 403);
  }
  const body = await boundedJson(request);
  if (!body.ok) return jsonResponse({ error: body.error }, body.status);
  const parsed = workshopRegistrationInputSchema.safeParse(body.body);
  if (!parsed.success) {
    return jsonResponse({ error: parsed.error.issues[0]?.message ?? "Check the registration details." }, 400);
  }
  if (parsed.data.website) return jsonResponse({ status: "registered" }, 201);
  if (!workshopTurnstileConfigured()) {
    return jsonResponse({ error: "Registration protection is unavailable." }, 503);
  }

  try {
    const runtime = await workshopRegistrationRuntime();
    if (!runtime) return jsonResponse({ error: "Registration is unavailable." }, 503);
    if (!await verifyWorkshopNonce(
      parsed.data.nonce, parsed.data.submissionId, runtime.secret,
    )) {
      return jsonResponse({ error: "The registration session expired. Reload the form and try again." }, 403);
    }
    const hostname = new URL(request.url).hostname;
    const remoteIp = request.headers.get("cf-connecting-ip")
      ?? (hostname === "localhost" || hostname === "127.0.0.1" ? "127.0.0.1" : null);
    if (!remoteIp) return jsonResponse({ error: "Registration protection is unavailable." }, 503);
    const verified = await verifyTurnstileToken(parsed.data.turnstileToken, {
      remoteIp,
      expectedHostname: hostname === "localhost" || hostname === "127.0.0.1"
        ? undefined : hostname,
      expectedAction: HARI_BABU_WORKSHOP_TURNSTILE_ACTION,
    });
    if (!verified) {
      return jsonResponse({ error: "Complete the spam-protection check and try again." }, 403);
    }

    const [phoneHash, ipHash, encryptedPayload] = await Promise.all([
      workshopValueHash(parsed.data.phone, "phone", runtime.secret),
      workshopValueHash(remoteIp, "ip", runtime.secret),
      encryptWorkshopRegistration(privateRegistrationFromInput(parsed.data), runtime.secret),
    ]);
    const result = await runtime.agent.register({
      submissionId: parsed.data.submissionId,
      phoneHash,
      ipHash,
      encryptedPayload,
      createdAt: new Date().toISOString(),
      consentVersion: HARI_BABU_WORKSHOP_CONSENT_VERSION,
    });
    if (result.status === "rate_limited") {
      return jsonResponse({ error: "Too many registrations. Please try again later." }, 429);
    }
    if (result.status === "conflict") {
      return jsonResponse({ error: "Reload the form and try again." }, 409);
    }
    if (result.status === "closed") {
      return jsonResponse({ error: "Workshop registration has closed." }, 410);
    }
    // A duplicate and a new registration are indistinguishable to the public.
    // The caller does not learn whether a phone number already exists.
    return jsonResponse({ status: "registered" }, 201);
  } catch {
    return jsonResponse({ error: "Registration is temporarily unavailable." }, 503);
  }
}
