import { NextResponse } from "next/server";
import { constantTimeEqual, uuidFromText } from "@/features/outreach/crypto";
import { processOutreachBatch } from "@/features/outreach/processor";
import { createConfiguredOutreachProvider } from "@/features/outreach/providers";
import { evaluateOutreachAutonomyReadiness } from "@/features/outreach/autonomous-readiness";
import { isDemoMode, isSupabaseConfigured } from "@/lib/env";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  if (
    !isFeatureEnabled("ENABLE_OUTREACH_AGENT") ||
    isDemoMode() ||
    !isSupabaseConfigured()
  ) {
    return NextResponse.json({ code: "FEATURE_DISABLED" }, { status: 404 });
  }
  const expected = process.env.OUTREACH_PROCESSOR_SECRET ?? "";
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (expected.length < 32 || !constantTimeEqual(provided, expected)) {
    return NextResponse.json({ code: "FORBIDDEN" }, { status: 403 });
  }
  const provider = createConfiguredOutreachProvider();
  const readiness = evaluateOutreachAutonomyReadiness({
    providerConfigured: provider.configured,
    processor: "dedicated_route",
  });
  if (!readiness.ready) {
    try {
      const supabase = createAdminClient();
      const pauseKey = await uuidFromText(
        `outreach-readiness-stop:${readiness.code}:${new Date().toISOString().slice(0, 13)}`,
      );
      await supabase.rpc("pause_outreach_delivery_automatically", {
        reason_code_input: readiness.code,
        idempotency_key_input: pauseKey,
      });
    } catch {
      // The actionable readiness code remains the source of truth when the
      // missing service credential also prevents recording a database stop.
    }
    return NextResponse.json(
      { code: readiness.code, action: readiness.action },
      { status: 503 },
    );
  }
  const supabase = createAdminClient();
  const cleanup = await supabase.rpc("purge_expired_outreach_research", {
    limit_input: 100,
  });
  if (cleanup.error) {
    return NextResponse.json({ code: "CLEANUP_FAILED" }, { status: 503 });
  }
  const scheduled = await supabase.rpc("schedule_due_outreach_followups", {
    limit_input: 25,
  });
  if (scheduled.error) {
    return NextResponse.json({ code: "SCHEDULING_FAILED" }, { status: 503 });
  }
  try {
    const result = await processOutreachBatch({
      supabase,
      provider,
      limit: 10,
    });
    return NextResponse.json({
      ...result,
      purged: Number(cleanup.data ?? 0),
      scheduled: Number(scheduled.data ?? 0),
    });
  } catch {
    return NextResponse.json({ code: "PROCESSING_FAILED" }, { status: 503 });
  }
}
