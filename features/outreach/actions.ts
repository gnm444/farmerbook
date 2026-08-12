"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/features/auth/require-admin";
import { getCloudflareBindings } from "@/lib/cloudflare-bindings";
import {
  getSiteUrl,
  isDemoMode,
  isProductionSite,
  isSupabaseConfigured,
} from "@/lib/env";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { DEFAULT_LOCALE } from "@/lib/i18n/locales";
import { loadMessages, messageFor } from "@/lib/i18n";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { createOutreachAgent } from "./agent";
import { createConfiguredOutreachProvider } from "./providers";
import {
  outreachDatabaseFailure,
  outreachFailure,
} from "./action-result";
import { extractContactCandidates } from "./contact-extractor";
import { sha256 } from "./crypto";
import { fetchPublicBusinessSource, SourceFetchError } from "./fetch-source";
import {
  extractVisibleBusinessTextFromScreenshot,
  sanitizeScreenshot,
  SCREENSHOT_VISION_MODEL,
} from "./ocr";
import {
  consentLeadSchema,
  outreachSourceInputSchema,
} from "./schemas";
import {
  classifyOutreachSource,
  requiresOperatorEvidence,
  sourceMayBeFetched,
} from "./source-policy";
import { verifyConsentToken } from "./consent-token";
import { verifyTurnstileToken } from "./turnstile";
import { normalizeOutreachUrl } from "./url-policy";
import type {
  OutreachActionResult,
  OutreachHistoryItem,
} from "./types";

const createResultSchema = z.object({
  code: z.string(),
  prospect_id: z.uuid(),
  revision: z.number().int().nonnegative(),
});

const adminOperationSchema = z.object({
  targetId: z.uuid(),
  reason: z.string().trim().min(5).max(500),
  idempotencyKey: z.uuid(),
});

const pauseOperationSchema = z.object({
  paused: z.boolean(),
  reason: z.string().trim().min(5).max(500),
  idempotencyKey: z.uuid(),
});

function firstRow(value: unknown) {
  return Array.isArray(value) ? value[0] : value;
}

export async function researchOutreachSourceAction(input: unknown) {
  if (!isFeatureEnabled("ENABLE_OUTREACH_AGENT")) {
    return outreachFailure("FEATURE_DISABLED");
  }
  const parsed = outreachSourceInputSchema.safeParse(input);
  if (!parsed.success) return outreachFailure("INVALID_INPUT", z.flattenError(parsed.error).fieldErrors);
  const admin = await requireAdmin();
  if (admin.demo || isDemoMode() || !isSupabaseConfigured()) {
    return outreachFailure("NOT_CONFIGURED");
  }

  const sourceType = classifyOutreachSource(parsed.data.sourceUrl);
  if (sourceType === "unsupported") return outreachFailure("UNSUPPORTED_SOURCE");
  if (
    requiresOperatorEvidence(sourceType) &&
    !parsed.data.description &&
    !parsed.data.screenshotDataUrl
  ) {
    return outreachFailure("EVIDENCE_REQUIRED");
  }

  const bindings = await getCloudflareBindings();
  const requestHeaders = await headers();
  const requestHost =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const requestProtocol =
    requestHeaders.get("x-forwarded-proto") ??
    (requestHost?.includes("localhost") ? "http" : "https");
  const applicationOrigin = requestHost
    ? new URL(`${requestProtocol}://${requestHost}`).origin
    : new URL(getSiteUrl()).origin;
  let sourceText = parsed.data.description ?? "";
  let sourceTitle: string | null = null;
  let evidenceOrigin: "website" | "pasted_description" | "screenshot_ocr" =
    parsed.data.description ? "pasted_description" : "website";
  let normalizedSourceUrl: string;
  const agentRuns: Array<Record<string, unknown>> = [];
  try {
    normalizedSourceUrl = normalizeOutreachUrl(parsed.data.sourceUrl);
    if (parsed.data.screenshotDataUrl) {
      if (!bindings?.IMAGES || !bindings.AI) return outreachFailure("AI_UNAVAILABLE");
      const ocrStartedAt = Date.now();
      const sanitized = await sanitizeScreenshot(parsed.data.screenshotDataUrl, bindings.IMAGES);
      sourceText = await extractVisibleBusinessTextFromScreenshot(sanitized, bindings.AI);
      evidenceOrigin = "screenshot_ocr";
      agentRuns.push({
        runType: "ocr",
        model: SCREENSHOT_VISION_MODEL,
        promptVersion: "outreach-ocr-2026-08-09.1",
        status: "succeeded",
        failureCode: null,
        durationMs: Date.now() - ocrStartedAt,
      });
    } else if (sourceMayBeFetched(sourceType)) {
      const fetched = await fetchPublicBusinessSource(normalizedSourceUrl, {
        production: isProductionSite(requestHost),
      });
      normalizedSourceUrl = fetched.sourceUrl;
      sourceTitle = fetched.title;
      sourceText = fetched.text;
      evidenceOrigin = "website";
    }
  } catch (error) {
    if (error instanceof SourceFetchError) {
      return outreachFailure(
        error.code === "BLOCKED_SOURCE" ? "BLOCKED_SOURCE" : "FETCH_FAILED",
      );
    }
    return outreachFailure("DATA_UNAVAILABLE");
  }
  if (!sourceText.trim()) return outreachFailure("EVIDENCE_REQUIRED");

  const contacts = extractContactCandidates(sourceText, {
    sourceUrl: normalizedSourceUrl,
    origin: evidenceOrigin,
  });
  const analysis = await createOutreachAgent(bindings?.AI).analyze({
    sourceText,
    businessName: parsed.data.businessName,
    preferredLocale: DEFAULT_LOCALE,
  });
  agentRuns.push({ runType: "qualification", ...analysis.run });
  const sourceHash = await sha256(`${normalizedSourceUrl}\n${sourceText}`);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_outreach_prospect", {
    prospect_input: {
      sourceUrl: normalizedSourceUrl,
      applicationOrigin,
      sourceType,
      sourceTitle,
      sourceExcerpt: sourceText.slice(0, 8_000),
      sourceHash,
      businessName: parsed.data.businessName,
      operatorContext: parsed.data.description,
      contactReady: contacts.some(
        (candidate) => candidate.explicitlyForBusinessEnquiries,
      ),
      suggestedRole: analysis.suggestedRole,
      preferredLocale: analysis.preferredLocale,
      categorySlugs: analysis.categorySlugs,
      rationale: analysis.rationale,
      introductionDraft: analysis.introductionDraft,
      contactCandidates: contacts.map((candidate) => ({
        channel: candidate.channel,
        normalizedValue: candidate.normalizedValue,
        sourceUrl: candidate.evidence.sourceUrl,
        evidenceExcerpt: candidate.evidence.excerpt,
        evidenceOrigin: candidate.evidence.origin,
        explicitlyForBusinessEnquiries:
          candidate.explicitlyForBusinessEnquiries,
      })),
      agentRuns,
    },
    idempotency_key_input: parsed.data.idempotencyKey,
  });
  if (error) return outreachDatabaseFailure(error);
  const result = createResultSchema.safeParse(firstRow(data));
  if (!result.success) return outreachFailure("DATA_UNAVAILABLE");
  revalidatePath("/admin/outreach");
  return {
    ok: true as const,
    code: result.data.code,
    data: {
      prospectId: result.data.prospect_id,
      revision: result.data.revision,
      sourceType,
      contactsFound: contacts.length,
      contactConsentStatus: contacts.length ? "consent_required" : "blocked",
      analysis,
    },
  };
}

export async function submitAcquisitionConsentAction(input: unknown) {
  if (!isFeatureEnabled("ENABLE_OUTREACH_AGENT")) {
    return outreachFailure("FEATURE_DISABLED");
  }
  const parsed = consentLeadSchema.safeParse(input);
  if (!parsed.success) return outreachFailure("INVALID_INPUT", z.flattenError(parsed.error).fieldErrors);
  if (isDemoMode() || !isSupabaseConfigured()) return outreachFailure("NOT_CONFIGURED");
  const signingSecret = process.env.OUTREACH_CONSENT_SIGNING_SECRET ?? "";
  const token = await verifyConsentToken(parsed.data.consentNonce, signingSecret);
  if (!token) return outreachFailure("INVALID_INPUT");
  const requestHeaders = await headers();
  const requestHost =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const hostname = requestHost?.split(":")[0];
  const turnstileValid = await verifyTurnstileToken(parsed.data.turnstileToken, {
    remoteIp: requestHeaders.get("cf-connecting-ip") ?? undefined,
    expectedHostname: hostname && !hostname.includes("localhost") ? hostname : undefined,
  });
  if (!turnstileValid) return outreachFailure("FORBIDDEN");

  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (requestHost?.includes("localhost") ? "http" : "https");
  const requestOrigin = requestHost
    ? `${protocol}://${requestHost}`
    : getSiteUrl();
  const sourceUrl = new URL("/join", requestOrigin).toString();
  const applicationOrigin = new URL(requestOrigin).origin;
  const consentMessages = await loadMessages(parsed.data.preferredLocale);
  const introductionDraft = messageFor(
    consentMessages,
    "outreach.introductionTemplate",
    {
      name: parsed.data.fullName,
      signupUrl: new URL("/signup", applicationOrigin).toString(),
    },
  );
  const lead = {
    role: parsed.data.role,
    fullName: parsed.data.fullName,
    businessName: parsed.data.businessName,
    state: parsed.data.state,
    district: parsed.data.district,
    preferredLocale: parsed.data.preferredLocale,
    preferredChannel: parsed.data.preferredChannel,
    email: parsed.data.email,
    phone: parsed.data.phone,
    introductionConsent: parsed.data.introductionConsent,
    followupConsent: parsed.data.followupConsent,
    consentPolicyVersion: parsed.data.consentPolicyVersion,
    campaignCode: parsed.data.campaignCode,
    sourceUrl,
    sourceType: "inbound_form" as const,
    applicationOrigin,
    introductionDraft,
  };
  const inputFingerprint = await sha256(JSON.stringify(lead));
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("submit_outreach_consent_lead", {
    lead_input: {
      ...lead,
      inputFingerprint,
    },
    idempotency_key_input: token.nonce,
  });
  if (error) return outreachDatabaseFailure(error);
  const row = firstRow(data) as
    | { code?: unknown; prospect_id?: unknown; status?: unknown }
    | null;
  if (!row || typeof row.code !== "string" || typeof row.prospect_id !== "string") {
    return outreachFailure("DATA_UNAVAILABLE");
  }
  return {
    ok: true as const,
    code: row.code,
    data: {
      prospectId: row.prospect_id,
      status: String(row.status ?? "consent_requested"),
      message:
        "Your request is recorded. FarmerBook will introduce itself only after your contact channel is verified.",
    },
  };
}

async function requireConfiguredOutreachAdmin(): Promise<
  | { ok: true; admin: { id: string; demo: false } }
  | { ok: false; error: OutreachActionResult<never> }
> {
  if (!isFeatureEnabled("ENABLE_OUTREACH_AGENT")) {
    return { ok: false, error: outreachFailure("FEATURE_DISABLED") };
  }
  const admin = await requireAdmin();
  if (admin.demo || isDemoMode() || !isSupabaseConfigured()) {
    return { ok: false, error: outreachFailure("NOT_CONFIGURED") };
  }
  return { ok: true, admin: { id: admin.id, demo: false } };
}

export async function setOutreachDeliveryPauseAction(
  input: unknown,
): Promise<OutreachActionResult<unknown>> {
  const parsed = pauseOperationSchema.safeParse(input);
  if (!parsed.success) return outreachFailure("INVALID_INPUT");
  const access = await requireConfiguredOutreachAdmin();
  if (!access.ok) return access.error;
  if (!parsed.data.paused && !createConfiguredOutreachProvider().configured) {
    return outreachFailure("NOT_CONFIGURED");
  }
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("set_outreach_delivery_pause", {
    paused_input: parsed.data.paused,
    reason_input: parsed.data.reason,
    actor_id_input: access.admin.id,
    idempotency_key_input: parsed.data.idempotencyKey,
  });
  if (error) return outreachDatabaseFailure(error);
  revalidatePath("/admin/outreach");
  return { ok: true as const, code: "PAUSE_UPDATED", data: firstRow(data) };
}

export async function suppressOutreachProspectAction(
  input: unknown,
): Promise<OutreachActionResult<unknown>> {
  const parsed = adminOperationSchema.safeParse(input);
  if (!parsed.success) return outreachFailure("INVALID_INPUT");
  const access = await requireConfiguredOutreachAdmin();
  if (!access.ok) return access.error;
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc(
    "admin_suppress_outreach_prospect",
    {
      prospect_id_input: parsed.data.targetId,
      reason_input: parsed.data.reason,
      actor_id_input: access.admin.id,
      idempotency_key_input: parsed.data.idempotencyKey,
    },
  );
  if (error) return outreachDatabaseFailure(error);
  revalidatePath("/admin/outreach");
  return { ok: true as const, code: "PROSPECT_SUPPRESSED", data: firstRow(data) };
}

export async function privacyDeleteOutreachProspectAction(
  input: unknown,
): Promise<OutreachActionResult<unknown>> {
  const parsed = adminOperationSchema.safeParse(input);
  if (!parsed.success) return outreachFailure("INVALID_INPUT");
  const access = await requireConfiguredOutreachAdmin();
  if (!access.ok) return access.error;
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc(
    "admin_privacy_delete_outreach_prospect",
    {
      prospect_id_input: parsed.data.targetId,
      reason_input: parsed.data.reason,
      actor_id_input: access.admin.id,
      idempotency_key_input: parsed.data.idempotencyKey,
    },
  );
  if (error) return outreachDatabaseFailure(error);
  revalidatePath("/admin/outreach");
  return { ok: true as const, code: "PRIVACY_DATA_DELETED", data: firstRow(data) };
}

export async function retryOutreachFailureAction(
  input: unknown,
): Promise<OutreachActionResult<unknown>> {
  const parsed = adminOperationSchema.safeParse(input);
  if (!parsed.success) return outreachFailure("INVALID_INPUT");
  const access = await requireConfiguredOutreachAdmin();
  if (!access.ok) return access.error;
  if (!createConfiguredOutreachProvider().configured) {
    return outreachFailure("NOT_CONFIGURED");
  }
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc(
    "admin_retry_outreach_failure",
    {
      outbox_id_input: parsed.data.targetId,
      reason_input: parsed.data.reason,
      actor_id_input: access.admin.id,
      idempotency_key_input: parsed.data.idempotencyKey,
    },
  );
  if (error) return outreachDatabaseFailure(error);
  revalidatePath("/admin/outreach");
  return { ok: true as const, code: "RETRY_QUEUED", data: firstRow(data) };
}

export async function loadOutreachProspectHistoryAction(
  input: unknown,
): Promise<OutreachActionResult<OutreachHistoryItem[]>> {
  const prospectId = z.uuid().safeParse(input);
  if (!prospectId.success) return outreachFailure("INVALID_INPUT");
  const access = await requireConfiguredOutreachAdmin();
  if (!access.ok) return access.error;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("outreach_prospect_history", {
    prospect_id_input: prospectId.data,
  });
  if (error) return outreachDatabaseFailure(error);
  const history: OutreachHistoryItem[] = ((data ?? []) as Array<{
    history_type: string;
    event_type: string;
    summary: string;
    occurred_at: string;
  }>).map((row) => ({
    historyType: row.history_type,
    eventType: row.event_type,
    summary: row.summary,
    occurredAt: row.occurred_at,
  }));
  return { ok: true as const, code: "HISTORY_LOADED", data: history };
}
