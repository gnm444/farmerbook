import { z } from "zod";
import { requireAdmin } from "@/features/auth/require-admin";
import { getCloudflareBindings } from "@/lib/cloudflare-bindings";
import { isDemoMode, isSupabaseConfigured } from "@/lib/env";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { createClient } from "@/lib/supabase/server";
import {
  MANAGED_AGENT_DEFINITIONS,
  isCompanyAgentRole,
  type ManagedAgentRole,
} from "./contracts";

export type ManagedAgentDashboardItem = {
  role: ManagedAgentRole;
  division: "company" | "specialized_operations";
  commandAvailable: boolean;
  displayName: string;
  description: string;
  boundary: string;
  enabled: boolean;
  runtimeState: "idle" | "running" | "healthy" | "degraded" | "paused";
  intervalSeconds: number;
  maxItemsPerRun: number;
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastFailureCode: string | null;
  consecutiveFailures: number;
  runsLast24Hours: number;
  successesLast24Hours: number;
  failuresLast24Hours: number;
};

export type ManagedAgentRecentRun = {
  id: string;
  role: ManagedAgentRole;
  triggerType: "scheduled" | "manual";
  state: "running" | "succeeded" | "partial" | "failed" | "skipped";
  claimedCount: number;
  succeededCount: number;
  failedCount: number;
  failureCode: string | null;
  startedAt: string;
  completedAt: string | null;
};

function defaults(): ManagedAgentDashboardItem[] {
  return MANAGED_AGENT_DEFINITIONS.map((definition) => ({
    role: definition.role,
    division: definition.division,
    commandAvailable: false,
    displayName: definition.displayName,
    description: definition.description,
    boundary: definition.boundary,
    enabled: false,
    runtimeState: "paused",
    intervalSeconds: definition.defaultIntervalSeconds,
    maxItemsPerRun: definition.defaultMaxItemsPerRun,
    lastRunAt: null,
    lastSuccessAt: null,
    lastFailureAt: null,
    lastFailureCode: null,
    consecutiveFailures: 0,
    runsLast24Hours: 0,
    successesLast24Hours: 0,
    failuresLast24Hours: 0,
  }));
}

const companyControlStatusSchema = z.object({
  managed_operations_enabled: z.boolean(),
  ai_company_enabled: z.boolean(),
});

export async function loadManagedAgentDashboard(): Promise<{
  agents: ManagedAgentDashboardItem[];
  recentRuns: ManagedAgentRecentRun[];
  configured: boolean;
}> {
  await requireAdmin();
  if (
    !isFeatureEnabled("ENABLE_MANAGED_OPERATIONS_AGENTS") ||
    !isSupabaseConfigured() ||
    isDemoMode()
  ) {
    return { agents: defaults(), recentRuns: [], configured: false };
  }
  const bindings = await getCloudflareBindings();
  if (
    !bindings?.NEXT_PUBLIC_SITE_URL ||
    (bindings.MANAGED_AGENT_PROCESSOR_SECRET?.length ?? 0) < 32
  ) {
    return { agents: defaults(), recentRuns: [], configured: false };
  }
  const supabase = await createClient();
  const [dashboard, runs] = await Promise.all([
    supabase.rpc("managed_operations_agent_dashboard"),
    supabase.rpc("list_managed_operations_agent_runs", { limit_input: 40 }),
  ]);
  if (dashboard.error || runs.error) {
    throw new Error("Managed agent operations data is temporarily unavailable.");
  }
  const definitions = new Map(
    MANAGED_AGENT_DEFINITIONS.map((definition) => [definition.role, definition]),
  );
  const companyApplicationAvailable =
    isFeatureEnabled("ENABLE_AI_COMPANY") &&
    Boolean(bindings.COMPANY_OPERATIONS_AGENT);
  let companyCommandsAvailable = false;
  if (companyApplicationAvailable) {
    const controlResult = await supabase.rpc("ai_company_control_status");
    const control = companyControlStatusSchema.safeParse(
      Array.isArray(controlResult.data) ? controlResult.data[0] : null,
    );
    companyCommandsAvailable =
      !controlResult.error && control.success &&
      control.data.managed_operations_enabled &&
      control.data.ai_company_enabled;
  }
  const agents = (dashboard.data ?? []).map((row: Record<string, unknown>) => {
    const role = String(row.role) as ManagedAgentRole;
    const definition = definitions.get(role);
    if (!definition) throw new Error("Unknown managed agent role.");
    return {
      role,
      division: definition.division,
      commandAvailable: !isCompanyAgentRole(role) || companyCommandsAvailable,
      displayName: String(row.display_name),
      description: definition.description,
      boundary: definition.boundary,
      enabled: row.enabled === true,
      runtimeState: String(row.runtime_state) as ManagedAgentDashboardItem["runtimeState"],
      intervalSeconds: Number(row.interval_seconds),
      maxItemsPerRun: Number(row.max_items_per_run),
      lastRunAt: row.last_run_at ? String(row.last_run_at) : null,
      lastSuccessAt: row.last_success_at ? String(row.last_success_at) : null,
      lastFailureAt: row.last_failure_at ? String(row.last_failure_at) : null,
      lastFailureCode: row.last_failure_code
        ? String(row.last_failure_code)
        : null,
      consecutiveFailures: Number(row.consecutive_failures),
      runsLast24Hours: Number(row.runs_last_24_hours),
      successesLast24Hours: Number(row.successes_last_24_hours),
      failuresLast24Hours: Number(row.failures_last_24_hours),
    };
  });
  const recentRuns = (runs.data ?? []).map((row: Record<string, unknown>) => ({
    id: String(row.id),
    role: String(row.role) as ManagedAgentRole,
    triggerType: String(row.trigger_type) as ManagedAgentRecentRun["triggerType"],
    state: String(row.state) as ManagedAgentRecentRun["state"],
    claimedCount: Number(row.claimed_count),
    succeededCount: Number(row.succeeded_count),
    failedCount: Number(row.failed_count),
    failureCode: row.failure_code ? String(row.failure_code) : null,
    startedAt: String(row.started_at),
    completedAt: row.completed_at ? String(row.completed_at) : null,
  }));
  return { agents, recentRuns, configured: true };
}
