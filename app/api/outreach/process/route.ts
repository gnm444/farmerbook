import { NextResponse } from "next/server";
import { constantTimeEqual } from "@/features/outreach/crypto";
import { processOutreachBatch } from "@/features/outreach/processor";
import { createConfiguredOutreachProvider } from "@/features/outreach/providers";
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
  const provider = createConfiguredOutreachProvider();
  if (!provider.configured) {
    return NextResponse.json(
      {
        code: "NOT_CONFIGURED",
        purged: Number(cleanup.data ?? 0),
        scheduled: Number(scheduled.data ?? 0),
      },
      { status: 503 },
    );
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
