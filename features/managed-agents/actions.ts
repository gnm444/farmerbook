"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/features/auth/require-admin";
import { getCloudflareBindings } from "@/lib/cloudflare-bindings";
import { isDemoMode, isSupabaseConfigured } from "@/lib/env";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { createClient } from "@/lib/supabase/server";
import type { OutreachGrowthAgent } from "./agents";
import {
  managedAgentCommandSchema,
  managedAgentDefinition,
  isCompanyAgentRole,
  type ManagedAgentRole,
  type ManagedAgentRunResult,
} from "./contracts";

type AgentControlStub = {
  configure(input: unknown): Promise<{ code: string; scheduleId: string | null }>;
  pause(): Promise<{ code: "PAUSED" }>;
  runNow(): Promise<ManagedAgentRunResult>;
};

function failure(message: string) {
  return { ok: false as const, message };
}

function safeDatabaseMessage(details: unknown) {
  if (details === "FEATURE_DISABLED") {
    return "The private database release control is still disabled.";
  }
  if (details === "AGENT_PAUSED") {
    return "Resume this managed agent before requesting a run.";
  }
  if (details === "IDEMPOTENCY_CONFLICT") {
    return "This command conflicts with an earlier request. Please try again.";
  }
  return "The managed agent command could not be recorded.";
}

function rolePrerequisitesEnabled(role: ManagedAgentRole) {
  if (isCompanyAgentRole(role)) {
    return isFeatureEnabled("ENABLE_AI_COMPANY");
  }
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
  return true;
}

async function managedAgentStub(role: ManagedAgentRole) {
  const bindings = await getCloudflareBindings();
  if (!bindings) return null;
  const namespace = isCompanyAgentRole(role)
    ? bindings.COMPANY_OPERATIONS_AGENT
    : role === "outreach_growth"
    ? bindings.OUTREACH_GROWTH_AGENT
    : role === "profile_drafting"
      ? bindings.PROFILE_DRAFTING_AGENT
      : role === "verification_triage"
        ? bindings.VERIFICATION_TRIAGE_AGENT
        : role === "customer_support"
          ? bindings.CUSTOMER_SUPPORT_AGENT
          : role === "social_content"
            ? bindings.SOCIAL_CONTENT_AGENT
            : bindings.OPERATIONS_SUPERVISOR_AGENT;
  if (!namespace) return null;
  const { getAgentByName } = await import("agents");
  const instanceName = isCompanyAgentRole(role)
    ? `farmerbook-company-${role.replaceAll("_", "-")}`
    : `farmerbook-${role.replaceAll("_", "-")}`;
  return getAgentByName(
    namespace as unknown as DurableObjectNamespace<OutreachGrowthAgent>,
    instanceName,
  ) as unknown as Promise<AgentControlStub>;
}

export async function manageManagedAgentAction(rawInput: unknown) {
  if (!isFeatureEnabled("ENABLE_MANAGED_OPERATIONS_AGENTS")) {
    return failure("Managed operations agents are disabled in this deployment.");
  }
  const parsed = managedAgentCommandSchema.safeParse(rawInput);
  if (!parsed.success) return failure("Check the agent command and try again.");
  const administrator = await requireAdmin();
  if (administrator.demo || isDemoMode() || !isSupabaseConfigured()) {
    return failure("Managed operations agents are not configured.");
  }
  const definition = managedAgentDefinition(parsed.data.role);
  const intervalSeconds = parsed.data.intervalSeconds
    ?? definition.defaultIntervalSeconds;
  const maxItemsPerRun = parsed.data.maxItemsPerRun
    ?? definition.defaultMaxItemsPerRun;
  const supabase = await createClient();
  if (!rolePrerequisitesEnabled(parsed.data.role)) {
    return failure("Enable this role's prerequisite FarmerBook features first.");
  }
  const runtimeBindings = await getCloudflareBindings();
  if (
    !runtimeBindings?.NEXT_PUBLIC_SITE_URL ||
    (runtimeBindings.MANAGED_AGENT_PROCESSOR_SECRET?.length ?? 0) < 32
  ) {
    return failure("The private managed-agent origin or processor secret is unavailable.");
  }
  const stub = await managedAgentStub(parsed.data.role);

  if (parsed.data.operation === "run_now") {
    if (!stub) return failure("The Cloudflare Agent binding is unavailable.");
    const requested = await supabase.rpc("request_managed_operations_agent_run", {
      role_input: parsed.data.role,
      reason_input: parsed.data.reason,
      idempotency_key_input: parsed.data.idempotencyKey,
    });
    if (requested.error) {
      return failure(safeDatabaseMessage(requested.error.details));
    }
    try {
      const result = await stub.runNow();
      revalidatePath("/admin/agents");
      return {
        ok: true as const,
        code: result.code,
        message: `Run finished: ${result.succeeded} succeeded, ${result.failed} failed.`,
      };
    } catch {
      revalidatePath("/admin/agents");
      return failure("The managed Agent run failed closed and was recorded.");
    }
  }

  const enable = parsed.data.operation === "resume";
  if (enable && !stub) {
    return failure("The Cloudflare Agent binding is unavailable.");
  }
  const configured = await supabase.rpc("configure_managed_operations_agent", {
    role_input: parsed.data.role,
    enabled_input: enable,
    interval_seconds_input: intervalSeconds,
    max_items_per_run_input: maxItemsPerRun,
    reason_input: parsed.data.reason,
    idempotency_key_input: parsed.data.idempotencyKey,
  });
  if (configured.error) {
    return failure(safeDatabaseMessage(configured.error.details));
  }
  try {
    if (enable) {
      await stub!.configure({
        role: parsed.data.role,
        enabled: true,
        intervalSeconds,
        maxItemsPerRun,
      });
    } else if (stub) {
      await stub.pause();
    }
  } catch {
    if (enable) {
      await supabase.rpc("configure_managed_operations_agent", {
        role_input: parsed.data.role,
        enabled_input: false,
        interval_seconds_input: intervalSeconds,
        max_items_per_run_input: maxItemsPerRun,
        reason_input: "Cloudflare schedule configuration failed; paused automatically.",
        idempotency_key_input: crypto.randomUUID(),
      });
      return failure("Cloudflare scheduling failed, so the role was paused safely.");
    }
    return failure("The database is paused, but the old schedule needs operator review.");
  }
  revalidatePath("/admin/agents");
  return {
    ok: true as const,
    code: enable ? "CONFIGURED" : "PAUSED",
    message: enable
      ? `${definition.displayName} is scheduled and ready.`
      : `${definition.displayName} is paused.`,
  };
}
