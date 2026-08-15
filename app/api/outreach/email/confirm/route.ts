import { NextResponse } from "next/server";
import { z } from "zod";
import { sha256, uuidFromText } from "@/features/outreach/crypto";
import { verifyEmailConsentToken } from "@/features/outreach/email-action-token";
import { activateMirroredEmailConsent } from "@/features/farmer-database/private-contact-service";
import { isDemoMode, isSupabaseConfigured } from "@/lib/env";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { createAdminClient } from "@/lib/supabase/admin";

const contactSchema = z.object({
  prospect_id: z.uuid(),
  value_hash: z.string().regex(/^[0-9a-f]{64}$/),
  channel: z.literal("email"),
});

function redirectWithStatus(request: Request, status: string) {
  const target = new URL("/confirm-email", request.url);
  target.searchParams.set("status", status);
  return NextResponse.redirect(target, 303);
}

export async function POST(request: Request) {
  if (
    !isFeatureEnabled("ENABLE_OUTREACH_AGENT") ||
    isDemoMode() ||
    !isSupabaseConfigured()
  ) {
    return redirectWithStatus(request, "unavailable");
  }
  const form = await request.formData();
  const token = String(form.get("token") ?? "");
  const secret = process.env.OUTREACH_EMAIL_ACTION_SIGNING_SECRET ?? "";
  const payload = await verifyEmailConsentToken(token, secret);
  if (!payload) return redirectWithStatus(request, "invalid");

  const supabase = createAdminClient();
  const contactResult = await supabase
    .from("outreach_contact_candidates")
    .select("prospect_id, value_hash, channel")
    .eq("id", payload.contactCandidateId)
    .eq("prospect_id", payload.prospectId)
    .maybeSingle();
  if (contactResult.error || !contactResult.data) {
    return redirectWithStatus(request, "invalid");
  }
  const contact = contactSchema.safeParse(contactResult.data);
  if (!contact.success) return redirectWithStatus(request, "invalid");

  const grantedAt = new Date();
  const expiresAt = new Date(
    grantedAt.getTime() + 180 * 24 * 60 * 60 * 1_000,
  );
  const receiptId = await sha256(`postmark-double-opt-in:${token}`);
  const [introductionKey, followupKey] = await Promise.all([
    uuidFromText(`postmark-consent:introduction:${token}`),
    uuidFromText(`postmark-consent:followup:${token}`),
  ]);
  const privateContactKey = await uuidFromText(
    `private-farmer-contact-email-confirmed:${token}`,
  );
  const recorded = await supabase.rpc(
    "record_verified_email_double_opt_in",
    {
      prospect_id_input: payload.prospectId,
      receipt_input: {
        contactCandidateId: payload.contactCandidateId,
        contactHash: contact.data.value_hash,
        channel: "email",
        requestedPurposes: payload.requestedPurposes,
        statementVersion: "farmerbook-email-2026-08-10.1",
        statementText:
          "I confirm that FarmerBook may introduce its agriculture network by email and send the separately requested onboarding follow-up. I can withdraw at any time.",
        captureMethod: "double_opt_in",
        provider: "postmark",
        providerReceiptId: receiptId,
        grantedAt: grantedAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
      },
      introduction_idempotency_key_input: introductionKey,
      followup_idempotency_key_input: followupKey,
    },
  );
  if (recorded.error) return redirectWithStatus(request, "unavailable");
  try {
    await activateMirroredEmailConsent({
      prospectId: payload.prospectId,
      confirmationReference: receiptId,
      confirmedAt: grantedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      idempotencyKey: privateContactKey,
    });
  } catch {
    return redirectWithStatus(request, "unavailable");
  }
  return redirectWithStatus(request, "confirmed");
}
