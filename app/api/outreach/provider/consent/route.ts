import { NextResponse } from "next/server";
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
  const provider = createConfiguredOutreachProvider();
  if (!provider.configured) {
    return NextResponse.json({ code: "NOT_CONFIGURED" }, { status: 503 });
  }
  try {
    const decision = await provider.verifyWebhook(request);
    const supabase = createAdminClient();
    if (!decision.granted) {
      const { error } = await supabase.rpc("withdraw_outreach_consent", {
        prospect_id_input: decision.prospectId,
        reason_input: "Consent was declined through the verified provider.",
        idempotency_key_input: decision.idempotencyKey,
      });
      if (error) throw new Error("WITHDRAWAL_WRITE_FAILED");
      return NextResponse.json({ code: "DECLINED_AND_SUPPRESSED" });
    }
    const grantedAt = new Date(decision.occurredAt);
    const expiresAt = new Date(grantedAt);
    expiresAt.setUTCDate(expiresAt.getUTCDate() + 180);
    const { error } = await supabase.rpc("record_verified_outreach_consent", {
      prospect_id_input: decision.prospectId,
      receipt_input: {
        contactCandidateId: decision.contactCandidateId,
        contactHash: decision.contactHash,
        purpose: decision.purpose,
        channel: decision.channel,
        statementVersion: "2026-08-09.1",
        statementText:
          "I agree that FarmerBook may introduce its agriculture network through this contact channel. I can withdraw at any time.",
        captureMethod: "verified_provider",
        provider: provider.name,
        providerReceiptId: decision.providerReceiptId,
        grantedAt: grantedAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
      },
      idempotency_key_input: decision.idempotencyKey,
    });
    if (error) throw new Error("CONSENT_WRITE_FAILED");
    return NextResponse.json({ code: "CONSENT_RECORDED" });
  } catch {
    return NextResponse.json({ code: "INVALID_PROVIDER_EVENT" }, { status: 403 });
  }
}
