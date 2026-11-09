import { NextResponse } from "next/server";
import { z } from "zod";
import { isDemoMode } from "@/lib/env";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { createClient } from "@/lib/supabase/server";
import { decryptWorkshopRegistration } from "@/features/workshops/registration-crypto";
import { workshopRegistrationRuntime } from "@/features/workshops/registration-runtime";

function jsonResponse(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "cache-control": "private, no-store",
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

async function realAdminAuthorized() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return !error && Boolean(user && user.app_metadata?.role === "admin");
}

function organizerConfigurationReady() {
  return !isDemoMode()
    && Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL)
    && Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}

const deletionSchema = z.strictObject({ submissionId: z.uuid() });

async function readDeletionBody(request: Request) {
  const contentType = request.headers.get("content-type")
    ?.split(";", 1)[0]?.trim().toLowerCase();
  if (contentType !== "application/json") return null;
  if (!request.body) return null;
  const contentLength = request.headers.get("content-length");
  if (contentLength && /^\d+$/u.test(contentLength) && Number(contentLength) > 256) {
    return null;
  }
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > 256) {
        await reader.cancel().catch(() => undefined);
        return null;
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return deletionSchema.safeParse(JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(bytes),
    )).data ?? null;
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}

export async function GET(request: Request) {
  if (!isFeatureEnabled("ENABLE_HARI_BABU_WORKSHOP")) {
    return jsonResponse({ error: "Workshop registrations are unavailable." }, 404);
  }
  if (!organizerConfigurationReady()) {
    return jsonResponse({ error: "Organizer access is unavailable." }, 503);
  }

  try {
    if (!await realAdminAuthorized()) {
      return jsonResponse({ error: "Organizer access is restricted." }, 403);
    }
    const url = new URL(request.url);
    const offsetText = url.searchParams.get("offset") ?? "0";
    const limitText = url.searchParams.get("limit") ?? "50";
    if (!/^\d{1,6}$/u.test(offsetText) || !/^\d{1,3}$/u.test(limitText)) {
      return jsonResponse({ error: "Invalid roster page." }, 400);
    }
    const offset = Number(offsetText);
    const limit = Number(limitText);
    if (offset > 100_000 || limit < 1 || limit > 100) {
      return jsonResponse({ error: "Invalid roster page." }, 400);
    }
    const runtime = await workshopRegistrationRuntime();
    if (!runtime) return jsonResponse({ error: "Organizer access is unavailable." }, 503);

    const { count, rows } = await runtime.agent.list(offset, limit);
    const registrations = await Promise.all(rows.map(async (row) => ({
      submissionId: row.submission_id,
      createdAt: row.created_at,
      consentVersion: row.consent_version,
      ...await decryptWorkshopRegistration(row.encrypted_payload, runtime.secret),
    })));
    return jsonResponse({ count, offset, registrations });
  } catch {
    return jsonResponse({ error: "Organizer access is temporarily unavailable." }, 503);
  }
}

export async function DELETE(request: Request) {
  if (!isFeatureEnabled("ENABLE_HARI_BABU_WORKSHOP")) {
    return jsonResponse({ error: "Workshop registrations are unavailable." }, 404);
  }
  if (!sameOrigin(request)) {
    return jsonResponse({ error: "The request origin could not be verified." }, 403);
  }
  if (!organizerConfigurationReady()) {
    return jsonResponse({ error: "Organizer access is unavailable." }, 503);
  }
  try {
    if (!await realAdminAuthorized()) {
      return jsonResponse({ error: "Organizer access is restricted." }, 403);
    }
    const input = await readDeletionBody(request);
    if (!input) return jsonResponse({ error: "Enter a valid registration ID." }, 400);
    const runtime = await workshopRegistrationRuntime();
    if (!runtime) return jsonResponse({ error: "Organizer access is unavailable." }, 503);
    await runtime.agent.deleteRegistration(input.submissionId);
    // Idempotent response: never disclose whether the ID existed.
    return jsonResponse({ status: "deleted" });
  } catch {
    return jsonResponse({ error: "Organizer access is temporarily unavailable." }, 503);
  }
}
