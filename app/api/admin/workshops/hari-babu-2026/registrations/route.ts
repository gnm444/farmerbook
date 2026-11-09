import { NextResponse } from "next/server";
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

export async function GET(request: Request) {
  if (!isFeatureEnabled("ENABLE_HARI_BABU_WORKSHOP")) {
    return jsonResponse({ error: "Workshop registrations are unavailable." }, 404);
  }
  if (isDemoMode()
    || !process.env.NEXT_PUBLIC_SUPABASE_URL
    || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return jsonResponse({ error: "Organizer access is unavailable." }, 503);
  }

  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user || user.app_metadata?.role !== "admin") {
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
