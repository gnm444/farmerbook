import { NextResponse } from "next/server";
import { isDemoMode, isSupabaseConfigured } from "@/lib/env";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { isOutreachConsentIntakeConfigured } from "@/features/outreach/configuration";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadMessages, messageFor } from "@/lib/i18n";
import { constantTimeEqual, sha256, uuidFromText } from "@/features/outreach/crypto";
import {
  googleLeadWebhookSchema,
  OUTREACH_CONSENT_POLICY_VERSION,
  verifiedConsentLeadSchema,
} from "@/features/outreach/schemas";

function columns(rows: Array<{ column_id: string; string_value?: string }>) {
  return Object.fromEntries(
    rows.map((row) => [row.column_id.toUpperCase(), row.string_value ?? ""]),
  );
}

export async function POST(request: Request) {
  if (
    !isFeatureEnabled("ENABLE_OUTREACH_AGENT") ||
    isDemoMode() ||
    !isSupabaseConfigured() ||
    !isOutreachConsentIntakeConfigured()
  ) {
    return NextResponse.json({ code: "FEATURE_DISABLED" }, { status: 404 });
  }
  const secret = process.env.GOOGLE_LEAD_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ code: "NOT_CONFIGURED" }, { status: 503 });
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ code: "INVALID_INPUT" }, { status: 400 });
  }
  const parsed = googleLeadWebhookSchema.safeParse(payload);
  if (!parsed.success || !constantTimeEqual(parsed.data.google_key, secret)) {
    return NextResponse.json({ code: "FORBIDDEN" }, { status: 403 });
  }
  const values = columns(parsed.data.user_column_data);
  if (values.CONSENT_POLICY_VERSION !== OUTREACH_CONSENT_POLICY_VERSION) {
    return NextResponse.json({ code: "CONSENT_CONFIRMATION_REQUIRED" }, { status: 202 });
  }
  if (values.INTRODUCTION_CONSENT?.toLowerCase() !== "yes") {
    return NextResponse.json({ code: "CONSENT_CONFIRMATION_REQUIRED" }, { status: 202 });
  }
  const email = values.EMAIL?.trim() || undefined;
  const rawPhone = values.PHONE_NUMBER?.replace(/[\s()-]+/g, "") || "";
  const phone = rawPhone
    ? rawPhone.startsWith("+91")
      ? rawPhone
      : rawPhone.length === 10
        ? `+91${rawPhone}`
        : rawPhone
    : undefined;
  if (!email && !phone) return NextResponse.json({ code: "INVALID_INPUT" }, { status: 400 });
  const idempotencyKey = await uuidFromText(`google-lead:${parsed.data.lead_id}`);
  const sourceUrl = `https://ads.google.com/lead-form/${encodeURIComponent(parsed.data.form_id)}/${encodeURIComponent(parsed.data.lead_id)}`;
  const lead = verifiedConsentLeadSchema.safeParse({
    engagementType: "membership",
    fullName: values.FULL_NAME || [values.FIRST_NAME, values.LAST_NAME].filter(Boolean).join(" "),
    businessName: values.COMPANY_NAME || undefined,
    role: values.ROLE?.toLowerCase().replaceAll(" ", "_") || "customer",
    countryCode: "IN",
    state: values.REGION,
    district: values.CITY,
    farmingApproach: "general",
    preferredLocale: values.PREFERRED_LOCALE || "en-IN",
    preferredChannel: email ? "email" : "sms",
    email,
    phone,
    introductionConsent: true,
    followupConsent: values.ONBOARDING_FOLLOWUP_CONSENT?.toLowerCase() === "yes",
    consentPolicyVersion: OUTREACH_CONSENT_POLICY_VERSION,
    campaignCode: "google-lead-form",
  });
  if (!lead.success) {
    return NextResponse.json({ code: "INCOMPLETE_LEAD" }, { status: 202 });
  }
  const supabase = createAdminClient();
  const applicationOrigin = new URL(request.url).origin;
  const leadMessages = await loadMessages(lead.data.preferredLocale);
  const introductionDraft = messageFor(
    leadMessages,
    "outreach.introductionTemplate",
    {
      name: lead.data.fullName,
      signupUrl: new URL("/signup", applicationOrigin).toString(),
    },
  );
  const leadInput = {
    sourceUrl,
    sourceType: "google_lead_form" as const,
    applicationOrigin,
    introductionDraft,
    ...lead.data,
  };
  const inputFingerprint = await sha256(JSON.stringify(leadInput));
  const { error } = await supabase.rpc("submit_outreach_consent_lead", {
    lead_input: {
      ...leadInput,
      inputFingerprint,
    },
    idempotency_key_input: idempotencyKey,
  });
  if (error) return NextResponse.json({ code: "DATA_UNAVAILABLE" }, { status: 503 });
  return NextResponse.json({ code: "CONSENT_PENDING" });
}
