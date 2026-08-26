import { requireAdmin } from "@/features/auth/require-admin";
import { isDemoMode, isSupabaseConfigured } from "@/lib/env";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { createClient } from "@/lib/supabase/server";
import {
  evaluateOutreachAutonomyReadiness,
  type OutreachAutonomyReadiness,
} from "./autonomous-readiness";
import { createConfiguredOutreachProvider } from "./providers";
import type {
  OutreachDashboardSummary,
  OutreachFailure,
  OutreachRuntimeHealth,
  OutreachProspect,
  OutreachStatus,
} from "./types";

type ProspectRow = {
  id: string;
  source_url: string;
  source_type: OutreachProspect["sourceType"];
  business_name: string | null;
  status: OutreachStatus;
  suggested_role: OutreachProspect["suggestedRole"];
  preferred_locale: OutreachProspect["preferredLocale"];
  category_slugs: string[];
  introduction_draft: string | null;
  consent_channel: OutreachProspect["consentChannel"];
  consent_granted_at: string | null;
  consent_withdrawn_at: string | null;
  retention_expires_at: string;
  revision: number;
  created_at: string;
  updated_at: string;
};

const emptySummary: OutreachDashboardSummary = {
  discovered: 0,
  blocked: 0,
  consented: 0,
  introduced: 0,
  onboarding: 0,
  joined: 0,
  optedOut: 0,
};

const emptyHealth: OutreachRuntimeHealth = {
  deliveryPaused: true,
  pauseReason: "Outreach delivery is unavailable.",
  pendingCount: 0,
  failedCount: 0,
  lastDeliveredAt: null,
  lastProviderEventAt: null,
  dailyDeliveryLimit: 25,
  dailyAuthorizedCount: 0,
  lastAutomaticStopCode: null,
  lastAutomaticStopAt: null,
};

export async function loadOutreachDashboard(): Promise<{
  prospects: OutreachProspect[];
  summary: OutreachDashboardSummary;
  health: OutreachRuntimeHealth;
  failures: OutreachFailure[];
  readiness: OutreachAutonomyReadiness;
}> {
  await requireAdmin();
  const readiness = evaluateOutreachAutonomyReadiness({
    providerConfigured: createConfiguredOutreachProvider().configured,
    processor: "managed_agent",
  });
  if (!isFeatureEnabled("ENABLE_OUTREACH_AGENT") || !isSupabaseConfigured()) {
    return { prospects: [], summary: emptySummary, health: emptyHealth, failures: [], readiness };
  }
  if (isDemoMode()) {
    return { prospects: [], summary: emptySummary, health: emptyHealth, failures: [], readiness };
  }
  const supabase = await createClient();
  const [prospectsResult, summaryResult, healthResult, failuresResult] = await Promise.all([
    supabase.rpc("list_outreach_prospects", { limit_input: 100 }),
    supabase.rpc("outreach_dashboard_summary"),
    supabase.rpc("outreach_runtime_health"),
    supabase.rpc("list_outreach_failures", { limit_input: 25 }),
  ]);
  if (
    prospectsResult.error ||
    summaryResult.error ||
    healthResult.error ||
    failuresResult.error
  ) {
    throw new Error("Outreach data is temporarily unavailable.");
  }
  const prospects = ((prospectsResult.data ?? []) as ProspectRow[]).map((row) => ({
    id: row.id,
    sourceUrl: row.source_url,
    sourceType: row.source_type,
    businessName: row.business_name,
    status: row.status,
    suggestedRole: row.suggested_role,
    preferredLocale: row.preferred_locale,
    categorySlugs: row.category_slugs ?? [],
    introductionDraft: row.introduction_draft,
    consentChannel: row.consent_channel,
    consentGrantedAt: row.consent_granted_at,
    consentWithdrawnAt: row.consent_withdrawn_at,
    retentionExpiresAt: row.retention_expires_at,
    revision: row.revision,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
  const summary = { ...emptySummary };
  for (const row of (summaryResult.data ?? []) as Array<{
    status: OutreachStatus;
    prospect_count: number | string;
  }>) {
    const count = Number(row.prospect_count) || 0;
    if (row.status === "discovered" || row.status === "consent_requested") summary.discovered += count;
    if (row.status === "consent_blocked") summary.blocked += count;
    if (row.status === "consented" || row.status === "qualified" || row.status === "introduction_queued") summary.consented += count;
    if (row.status === "introduced") summary.introduced += count;
    if (row.status === "onboarding") summary.onboarding += count;
    if (row.status === "joined") summary.joined += count;
    if (row.status === "withdrawn" || row.status === "suppressed") summary.optedOut += count;
  }
  const healthRow = (Array.isArray(healthResult.data)
    ? healthResult.data[0]
    : healthResult.data) as
    | {
        delivery_paused?: unknown;
        pause_reason?: unknown;
        pending_count?: unknown;
        failed_count?: unknown;
        last_delivered_at?: unknown;
        last_provider_event_at?: unknown;
        daily_delivery_limit?: unknown;
        daily_authorized_count?: unknown;
        last_automatic_stop_code?: unknown;
        last_automatic_stop_at?: unknown;
      }
    | null;
  const health: OutreachRuntimeHealth = healthRow
    ? {
        deliveryPaused: healthRow.delivery_paused === true,
        pauseReason: String(healthRow.pause_reason ?? "No reason recorded."),
        pendingCount: Number(healthRow.pending_count) || 0,
        failedCount: Number(healthRow.failed_count) || 0,
        lastDeliveredAt:
          typeof healthRow.last_delivered_at === "string"
            ? healthRow.last_delivered_at
            : null,
        lastProviderEventAt:
          typeof healthRow.last_provider_event_at === "string"
            ? healthRow.last_provider_event_at
            : null,
        dailyDeliveryLimit: Number(healthRow.daily_delivery_limit) || 25,
        dailyAuthorizedCount: Number(healthRow.daily_authorized_count) || 0,
        lastAutomaticStopCode:
          typeof healthRow.last_automatic_stop_code === "string"
            ? healthRow.last_automatic_stop_code
            : null,
        lastAutomaticStopAt:
          typeof healthRow.last_automatic_stop_at === "string"
            ? healthRow.last_automatic_stop_at
            : null,
      }
    : emptyHealth;
  const failures = ((failuresResult.data ?? []) as Array<{
    id: string;
    prospect_id: string;
    business_name: string | null;
    purpose: string;
    attempts: number;
    failure_code: string | null;
    created_at: string;
    expires_at: string;
  }>).map((row) => ({
    id: row.id,
    prospectId: row.prospect_id,
    businessName: row.business_name,
    purpose: row.purpose,
    attempts: row.attempts,
    failureCode: row.failure_code,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  }));
  return { prospects, summary, health, failures, readiness };
}
