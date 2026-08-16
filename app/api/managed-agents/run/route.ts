import { NextResponse } from "next/server";
import { constantTimeEqual } from "@/features/outreach/crypto";
import { managedAgentRunRequestSchema } from "@/features/managed-agents/contracts";
import { processManagedAgentRun } from "@/features/managed-agents/processor";
import { isDemoMode, isSupabaseConfigured } from "@/lib/env";
import { isFeatureEnabled } from "@/lib/feature-flags";

function roleFeaturesEnabled(role: string) {
  if (role === "outreach_growth") {
    return isFeatureEnabled("ENABLE_OUTREACH_AGENT");
  }
  if (role === "profile_drafting") {
    return isFeatureEnabled("ENABLE_OUTREACH_AGENT")
      && isFeatureEnabled("ENABLE_PROFILE_RESEARCH_AGENT");
  }
  if (role === "verification_triage") {
    return isFeatureEnabled("ENABLE_PROFILE_RESEARCH_AGENT");
  }
  if (role === "customer_support" || role === "social_content") {
    return isFeatureEnabled("ENABLE_SUPPORT_SOCIAL_PILOT");
  }
  return role === "operations_supervisor";
}

export async function POST(request: Request) {
  if (
    !isFeatureEnabled("ENABLE_MANAGED_OPERATIONS_AGENTS") ||
    isDemoMode() ||
    !isSupabaseConfigured()
  ) {
    return NextResponse.json({ code: "FEATURE_DISABLED" }, { status: 404 });
  }
  const expected = process.env.MANAGED_AGENT_PROCESSOR_SECRET ?? "";
  const provided = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "") ?? "";
  if (expected.length < 32 || !constantTimeEqual(provided, expected)) {
    return NextResponse.json({ code: "FORBIDDEN" }, { status: 403 });
  }
  const parsed = managedAgentRunRequestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json({ code: "INVALID_INPUT" }, { status: 400 });
  }
  if (!roleFeaturesEnabled(parsed.data.role)) {
    return NextResponse.json({ code: "FEATURE_DISABLED" }, { status: 404 });
  }
  try {
    return NextResponse.json(await processManagedAgentRun(parsed.data));
  } catch {
    return NextResponse.json({ code: "PROCESSING_FAILED" }, { status: 503 });
  }
}
