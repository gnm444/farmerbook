import { Agent, type AgentContext } from "agents";
import {
  initialManagedAgentState,
  managedAgentConfigurationSchema,
  managedAgentRunResultSchema,
  type ManagedAgentRole,
  type ManagedAgentRunResult,
  type ManagedAgentState,
  type ManagedAgentTrigger,
} from "./contracts";

export interface ManagedOperationsAgentEnv extends Cloudflare.Env {
  NEXT_PUBLIC_SITE_URL?: string;
  MANAGED_AGENT_PROCESSOR_SECRET?: string;
}

function safeProcessorUrl(rawOrigin: string | undefined) {
  if (!rawOrigin) throw new Error("MANAGED_AGENT_ORIGIN_NOT_CONFIGURED");
  const origin = new URL(rawOrigin);
  const local = origin.hostname === "localhost" || origin.hostname === "127.0.0.1";
  if ((!local && origin.protocol !== "https:") || (local && !["http:", "https:"].includes(origin.protocol))) {
    throw new Error("MANAGED_AGENT_ORIGIN_INVALID");
  }
  origin.pathname = "/api/managed-agents/run";
  origin.search = "";
  origin.hash = "";
  return origin;
}

function failureCode(caught: unknown) {
  return (caught instanceof Error ? caught.message : "MANAGED_AGENT_FAILED")
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 80) || "MANAGED_AGENT_FAILED";
}

export abstract class ScheduledManagedAgent extends Agent<
  ManagedOperationsAgentEnv,
  ManagedAgentState
> {
  protected abstract readonly managedRole: ManagedAgentRole;
  private readonly bindings: ManagedOperationsAgentEnv;

  constructor(ctx: AgentContext, env: ManagedOperationsAgentEnv) {
    super(ctx, env);
    this.bindings = env;
  }

  abstract initialState: ManagedAgentState;

  validateStateChange(nextState: ManagedAgentState) {
    if (nextState.role !== this.managedRole) {
      throw new Error("MANAGED_AGENT_ROLE_CONFLICT");
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
    if (input.role !== this.managedRole) {
      throw new Error("MANAGED_AGENT_ROLE_CONFLICT");
    }
    await this.clearSchedules();
    let scheduleId: string | null = null;
    if (input.enabled) {
      const schedule = await this.scheduleEvery(
        input.intervalSeconds,
        "runScheduledCycle",
        { role: this.managedRole },
        { retry: { maxAttempts: 3 } },
      );
      scheduleId = schedule.id;
    }
    this.setState({
      ...this.state,
      role: this.managedRole,
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
          role: this.managedRole,
          instanceName: `farmerbook-${this.managedRole.replaceAll("_", "-")}`,
          trigger,
          maxItems: this.state.maxItemsPerRun,
          idempotencyKey,
        }),
      }).then(async (result) => {
        if (!result.ok) {
          const payload = await result.json().catch(() => ({})) as { code?: unknown };
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
    if (!this.state.enabled) {
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
      const result = await this.requestCycle(trigger, idempotencyKey);
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
        lastFailureCode: failureCode(caught),
        consecutiveFailures: failures,
        updatedAt: new Date().toISOString(),
      });
      throw caught;
    }
  }
}

export { initialManagedAgentState };
