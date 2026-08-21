import { Agent, type AgentContext } from "agents";
import {
  assertCompanyAgentRoleLock,
} from "./contracts";

import {
  isCompanyAgentRole,
  managedAgentConfigurationSchema,
  managedAgentRunResultSchema,
  type CompanyAgentRole,
  type ManagedAgentRunResult,
  type ManagedAgentTrigger,
} from "@/features/managed-agents/contracts";

interface CompanyOperationsAgentEnv extends Cloudflare.Env {
  NEXT_PUBLIC_SITE_URL?: string;
  MANAGED_AGENT_PROCESSOR_SECRET?: string;
}

export type CompanyOperationsAgentState = {
  role: CompanyAgentRole | null;
  enabled: boolean;
  status: "idle" | "running" | "healthy" | "degraded" | "paused";
  intervalSeconds: number;
  maxItemsPerRun: number;
  scheduleId: string | null;
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  lastFailureCode: string | null;
  consecutiveFailures: number;
  updatedAt: string;
};

function safeProcessorUrl(rawOrigin: string | undefined) {
  if (!rawOrigin) throw new Error("MANAGED_AGENT_ORIGIN_NOT_CONFIGURED");
  const origin = new URL(rawOrigin);
  const local = origin.hostname === "localhost" || origin.hostname === "127.0.0.1";
  if (
    (!local && origin.protocol !== "https:") ||
    (local && !["http:", "https:"].includes(origin.protocol))
  ) {
    throw new Error("MANAGED_AGENT_ORIGIN_INVALID");
  }
  origin.pathname = "/api/managed-agents/run";
  origin.search = "";
  origin.hash = "";
  return origin;
}

function boundedFailureCode(caught: unknown) {
  return (caught instanceof Error ? caught.message : "MANAGED_AGENT_FAILED")
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 80) || "MANAGED_AGENT_FAILED";
}

export class CompanyOperationsAgent extends Agent<
  CompanyOperationsAgentEnv,
  CompanyOperationsAgentState
> {
  initialState: CompanyOperationsAgentState = {
    role: null,
    enabled: false,
    status: "paused",
    intervalSeconds: 86_400,
    maxItemsPerRun: 1,
    scheduleId: null,
    lastRunAt: null,
    lastSuccessAt: null,
    lastFailureCode: null,
    consecutiveFailures: 0,
    updatedAt: new Date(0).toISOString(),
  };

  private readonly bindings: CompanyOperationsAgentEnv;

  constructor(ctx: AgentContext, env: CompanyOperationsAgentEnv) {
    super(ctx, env);
    this.bindings = env;
  }

  validateStateChange(nextState: CompanyOperationsAgentState) {
    if (nextState.role !== null && !isCompanyAgentRole(nextState.role)) {
      throw new Error("MANAGED_AGENT_ROLE_INVALID");
    }
    if (nextState.role) {
      assertCompanyAgentRoleLock(this.state.role, nextState.role);
    }
    if (
      !Number.isInteger(nextState.intervalSeconds) ||
      nextState.intervalSeconds < 300 ||
      nextState.intervalSeconds > 604_800 ||
      !Number.isInteger(nextState.maxItemsPerRun) ||
      nextState.maxItemsPerRun < 1 ||
      nextState.maxItemsPerRun > 25 ||
      nextState.consecutiveFailures < 0 ||
      nextState.consecutiveFailures > 3
    ) {
      throw new Error("MANAGED_AGENT_STATE_INVALID");
    }
  }

  private async clearSchedules() {
    const schedules = await this.listSchedules();
    await Promise.all(schedules.map((schedule) => this.cancelSchedule(schedule.id)));
  }

  async configure(rawInput: unknown) {
    const input = managedAgentConfigurationSchema.parse(rawInput);
    if (!isCompanyAgentRole(input.role)) {
      throw new Error("MANAGED_AGENT_ROLE_CONFLICT");
    }
    assertCompanyAgentRoleLock(this.state.role, input.role);
    await this.clearSchedules();
    let scheduleId: string | null = null;
    if (input.enabled) {
      const schedule = await this.scheduleEvery(
        input.intervalSeconds,
        "runScheduledCycle",
        { role: input.role },
        { retry: { maxAttempts: 3 } },
      );
      scheduleId = schedule.id;
    }
    this.setState({
      ...this.state,
      role: input.role,
      enabled: input.enabled,
      status: input.enabled ? "idle" : "paused",
      intervalSeconds: input.intervalSeconds,
      maxItemsPerRun: input.maxItemsPerRun,
      scheduleId,
      lastFailureCode: null,
      consecutiveFailures: 0,
      updatedAt: new Date().toISOString(),
    });
    return { code: input.enabled ? "CONFIGURED" : "PAUSED", scheduleId };
  }

  async pause() {
    await this.clearSchedules();
    this.setState({
      ...this.state,
      enabled: false,
      status: "paused",
      scheduleId: null,
      updatedAt: new Date().toISOString(),
    });
    return { code: "PAUSED" as const };
  }

  async runNow() {
    return this.executeCycle("manual");
  }

  async runScheduledCycle() {
    return this.executeCycle("scheduled");
  }

  private async requestCycle(
    role: CompanyAgentRole,
    trigger: ManagedAgentTrigger,
    idempotencyKey: string,
  ): Promise<ManagedAgentRunResult> {
    const secret = this.bindings.MANAGED_AGENT_PROCESSOR_SECRET ?? "";
    if (secret.length < 32) {
      throw new Error("MANAGED_AGENT_SECRET_NOT_CONFIGURED");
    }
    const url = safeProcessorUrl(this.bindings.NEXT_PUBLIC_SITE_URL);
    const response = await this.retry(
      () => fetch(url, {
        method: "POST",
        headers: {
          authorization: `Bearer ${secret}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          role,
          instanceName: `farmerbook-company-${role.replaceAll("_", "-")}`,
          trigger,
          maxItems: this.state.maxItemsPerRun,
          idempotencyKey,
        }),
      }).then(async (result) => {
        if (!result.ok) {
          const payload = await result.json().catch(() => ({})) as {
            code?: unknown;
          };
          throw new Error(
            typeof payload.code === "string"
              ? payload.code
              : `MANAGED_AGENT_HTTP_${result.status}`,
          );
        }
        return result;
      }),
      {
        maxAttempts: 3,
        baseDelayMs: 250,
        maxDelayMs: 3_000,
        shouldRetry: (error) => !/FORBIDDEN|FEATURE_DISABLED|NOT_CONFIGURED/.test(
          error instanceof Error ? error.message : "",
        ),
      },
    );
    return managedAgentRunResultSchema.parse(await response.json());
  }

  private async executeCycle(trigger: ManagedAgentTrigger) {
    const role = this.state.role;
    if (!this.state.enabled || !role) {
      return {
        code: "SKIPPED" as const,
        claimed: 0,
        succeeded: 0,
        failed: 0,
        summary: { reason: "AGENT_PAUSED" },
      };
    }
    const idempotencyKey = crypto.randomUUID();
    const startedAt = new Date().toISOString();
    this.setState({
      ...this.state,
      status: "running",
      lastRunAt: startedAt,
      updatedAt: startedAt,
    });
    try {
      const result = await this.requestCycle(role, trigger, idempotencyKey);
      const failed = result.code === "PARTIAL" || result.failed > 0;
      const failures = failed
        ? Math.min(this.state.consecutiveFailures + 1, 3)
        : 0;
      if (failures >= 3) await this.clearSchedules();
      this.setState({
        ...this.state,
        enabled: failures < 3,
        status: failures >= 3 ? "paused" : failed ? "degraded" : "healthy",
        scheduleId: failures >= 3 ? null : this.state.scheduleId,
        lastRunAt: startedAt,
        lastSuccessAt: failed ? this.state.lastSuccessAt : new Date().toISOString(),
        lastFailureCode: failed ? "PARTIAL_RUN" : null,
        consecutiveFailures: failures,
        updatedAt: new Date().toISOString(),
      });
      return result;
    } catch (caught) {
      const failures = Math.min(this.state.consecutiveFailures + 1, 3);
      if (failures >= 3) await this.clearSchedules();
      this.setState({
        ...this.state,
        enabled: failures < 3,
        status: failures >= 3 ? "paused" : "degraded",
        scheduleId: failures >= 3 ? null : this.state.scheduleId,
        lastRunAt: startedAt,
        lastFailureCode: boundedFailureCode(caught),
        consecutiveFailures: failures,
        updatedAt: new Date().toISOString(),
      });
      throw caught;
    }
  }
}
