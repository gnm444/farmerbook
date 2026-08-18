import { Agent, type AgentContext } from "agents";
import {
  AI_WORKSTREAMS,
  ALLOCATED_MONTHLY_BUDGET_MICROS,
  FLEET_MONTHLY_BUDGET_MICROS,
  UNALLOCATED_MONTHLY_BUDGET_MICROS,
  WORKSTREAM_BUDGET_MICROS,
  aiReservationInputSchema,
  aiSettlementInputSchema,
  type AiFleetBudgetStatus,
  type AiReservationResult,
  type AiSettlementResult,
  type AiWorkstream,
} from "./contracts";
import { evaluateReservation } from "./ledger";
import { modelCostMicros } from "./pricing";

type AiFleetBudgetAgentState = {
  schemaVersion: 1;
  updatedAt: string;
};

type ReservationRow = {
  id: string;
  month_key: string;
  workstream: AiWorkstream;
  operation: string;
  model: string;
  estimated_input_tokens: number;
  max_output_tokens: number;
  reserved_micros: number;
  charged_micros: number;
  reported_cost_micros: number | null;
  outcome: "reserved" | "succeeded" | "failed";
};

type TotalRow = { total: number };

type WorkstreamAggregateRow = {
  workstream: AiWorkstream;
  charged_micros: number;
  calls: number;
  failed_calls: number;
  pending_calls: number;
};

function monthKey(date: Date) {
  return date.toISOString().slice(0, 7);
}

function boundedFailureCode(value: string | null) {
  if (!value) return null;
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 80) || "AI_INFERENCE_FAILED";
}

export class AiFleetBudgetAgent extends Agent<
  Cloudflare.Env,
  AiFleetBudgetAgentState
> {
  initialState: AiFleetBudgetAgentState = {
    schemaVersion: 1,
    updatedAt: new Date(0).toISOString(),
  };

  constructor(ctx: AgentContext, env: Cloudflare.Env) {
    super(ctx, env);
  }

  async onStart() {
    void this.sql`CREATE TABLE IF NOT EXISTS ai_fleet_reservations (
      id TEXT PRIMARY KEY,
      month_key TEXT NOT NULL,
      workstream TEXT NOT NULL,
      operation TEXT NOT NULL,
      model TEXT NOT NULL,
      estimated_input_tokens INTEGER NOT NULL,
      max_output_tokens INTEGER NOT NULL,
      reserved_micros INTEGER NOT NULL,
      charged_micros INTEGER NOT NULL,
      reported_input_tokens INTEGER,
      reported_output_tokens INTEGER,
      reported_cost_micros INTEGER,
      outcome TEXT NOT NULL CHECK (outcome IN ('reserved', 'succeeded', 'failed')),
      failure_code TEXT,
      created_at TEXT NOT NULL,
      settled_at TEXT
    )`;
    void this.sql`CREATE INDEX IF NOT EXISTS ai_fleet_reservations_month_workstream_idx
      ON ai_fleet_reservations(month_key, workstream)`;
    void this.sql`CREATE INDEX IF NOT EXISTS ai_fleet_reservations_created_idx
      ON ai_fleet_reservations(created_at)`;
    const retentionCutoff = new Date(
      Date.now() - 400 * 86_400_000,
    ).toISOString();
    void this.sql`DELETE FROM ai_fleet_reservations
      WHERE created_at < ${retentionCutoff}`;
  }

  validateStateChange(nextState: AiFleetBudgetAgentState) {
    if (
      nextState.schemaVersion !== 1 ||
      Number.isNaN(Date.parse(nextState.updatedAt))
    ) {
      throw new Error("AI_FLEET_BUDGET_STATE_INVALID");
    }
  }

  async reserve(rawInput: unknown): Promise<AiReservationResult> {
    const input = aiReservationInputSchema.parse(rawInput);
    const now = new Date();
    const currentMonth = monthKey(now);
    const reservedMicros = modelCostMicros(
      input.model,
      input.estimatedInputTokens,
      input.maxOutputTokens,
    );
    const existing = this.sql<ReservationRow>`SELECT id, month_key, workstream,
      operation, model, estimated_input_tokens, max_output_tokens,
      reserved_micros, charged_micros, reported_cost_micros, outcome
      FROM ai_fleet_reservations WHERE id = ${input.reservationId} LIMIT 1`[0];
    if (existing) {
      if (
        existing.month_key !== currentMonth ||
        existing.workstream !== input.workstream ||
        existing.operation !== input.operation ||
        existing.model !== input.model ||
        existing.estimated_input_tokens !== input.estimatedInputTokens ||
        existing.max_output_tokens !== input.maxOutputTokens ||
        existing.reserved_micros !== reservedMicros
      ) {
        throw new Error("AI_BUDGET_RESERVATION_CONFLICT");
      }
      const totals = this.currentTotals(currentMonth, input.workstream);
      return {
        code: "RESERVED",
        reservationId: existing.id,
        monthKey: currentMonth,
        reservedMicros: existing.reserved_micros,
        fleetReservedMicros: totals.fleet,
        workstreamReservedMicros: totals.workstream,
      };
    }

    const totals = this.currentTotals(currentMonth, input.workstream);
    const decision = evaluateReservation({
      workstream: input.workstream,
      fleetChargedMicros: totals.fleet,
      workstreamChargedMicros: totals.workstream,
      requestedMicros: reservedMicros,
    });
    if (decision !== "ACCEPTED") {
      return {
        code: decision,
        reservationId: null,
        monthKey: currentMonth,
        reservedMicros: 0,
        fleetReservedMicros: totals.fleet,
        workstreamReservedMicros: totals.workstream,
      };
    }

    void this.sql`INSERT INTO ai_fleet_reservations (
      id, month_key, workstream, operation, model, estimated_input_tokens,
      max_output_tokens, reserved_micros, charged_micros, outcome, created_at
    ) VALUES (
      ${input.reservationId}, ${currentMonth}, ${input.workstream},
      ${input.operation}, ${input.model}, ${input.estimatedInputTokens},
      ${input.maxOutputTokens}, ${reservedMicros}, ${reservedMicros},
      'reserved', ${now.toISOString()}
    )`;
    this.setState({ schemaVersion: 1, updatedAt: now.toISOString() });
    return {
      code: "RESERVED",
      reservationId: input.reservationId,
      monthKey: currentMonth,
      reservedMicros,
      fleetReservedMicros: totals.fleet + reservedMicros,
      workstreamReservedMicros: totals.workstream + reservedMicros,
    };
  }

  async settle(rawInput: unknown): Promise<AiSettlementResult> {
    const input = aiSettlementInputSchema.parse(rawInput);
    const existing = this.sql<ReservationRow>`SELECT id, month_key, workstream,
      operation, model, estimated_input_tokens, max_output_tokens,
      reserved_micros, charged_micros, reported_cost_micros, outcome
      FROM ai_fleet_reservations WHERE id = ${input.reservationId} LIMIT 1`[0];
    if (!existing) throw new Error("AI_BUDGET_RESERVATION_NOT_FOUND");
    if (existing.outcome !== "reserved") {
      return {
        code: "ALREADY_SETTLED",
        reservationId: existing.id,
        chargedMicros: existing.charged_micros,
        reportedCostMicros: existing.reported_cost_micros,
      };
    }
    const reportedCostMicros =
      input.reportedInputTokens === null ||
      input.reportedOutputTokens === null
        ? null
        : modelCostMicros(
            aiReservationInputSchema.shape.model.parse(existing.model),
            input.reportedInputTokens,
            input.reportedOutputTokens,
          );
    const chargedMicros = Math.max(
      existing.reserved_micros,
      reportedCostMicros ?? 0,
    );
    const now = new Date().toISOString();
    const failureCode =
      input.outcome === "failed"
        ? boundedFailureCode(input.failureCode) ?? "AI_INFERENCE_FAILED"
        : null;
    void this.sql`UPDATE ai_fleet_reservations SET
      reported_input_tokens = ${input.reportedInputTokens},
      reported_output_tokens = ${input.reportedOutputTokens},
      reported_cost_micros = ${reportedCostMicros},
      charged_micros = ${chargedMicros},
      outcome = ${input.outcome},
      failure_code = ${failureCode},
      settled_at = ${now}
      WHERE id = ${input.reservationId} AND outcome = 'reserved'`;
    this.setState({ schemaVersion: 1, updatedAt: now });
    return {
      code: "SETTLED",
      reservationId: input.reservationId,
      chargedMicros,
      reportedCostMicros,
    };
  }

  async status(): Promise<AiFleetBudgetStatus> {
    const currentMonth = monthKey(new Date());
    const fleet = this.sql<{
      charged_micros: number;
      calls: number;
      failed_calls: number;
      pending_calls: number;
    }>`SELECT
      COALESCE(SUM(charged_micros), 0) AS charged_micros,
      COUNT(*) AS calls,
      COALESCE(SUM(CASE WHEN outcome = 'failed' THEN 1 ELSE 0 END), 0) AS failed_calls,
      COALESCE(SUM(CASE WHEN outcome = 'reserved' THEN 1 ELSE 0 END), 0) AS pending_calls
      FROM ai_fleet_reservations WHERE month_key = ${currentMonth}`[0] ?? {
        charged_micros: 0,
        calls: 0,
        failed_calls: 0,
        pending_calls: 0,
      };
    const grouped = this.sql<WorkstreamAggregateRow>`SELECT workstream,
      COALESCE(SUM(charged_micros), 0) AS charged_micros,
      COUNT(*) AS calls,
      COALESCE(SUM(CASE WHEN outcome = 'failed' THEN 1 ELSE 0 END), 0) AS failed_calls,
      COALESCE(SUM(CASE WHEN outcome = 'reserved' THEN 1 ELSE 0 END), 0) AS pending_calls
      FROM ai_fleet_reservations WHERE month_key = ${currentMonth}
      GROUP BY workstream`;
    const byWorkstream = new Map(
      grouped.map((row) => [row.workstream, row]),
    );
    return {
      monthKey: currentMonth,
      fleetBudgetMicros: FLEET_MONTHLY_BUDGET_MICROS,
      allocatedBudgetMicros: ALLOCATED_MONTHLY_BUDGET_MICROS,
      unallocatedBudgetMicros: UNALLOCATED_MONTHLY_BUDGET_MICROS,
      chargedMicros: Number(fleet.charged_micros),
      remainingMicros: Math.max(
        0,
        FLEET_MONTHLY_BUDGET_MICROS - Number(fleet.charged_micros),
      ),
      calls: Number(fleet.calls),
      failedCalls: Number(fleet.failed_calls),
      pendingCalls: Number(fleet.pending_calls),
      workstreams: AI_WORKSTREAMS.map((workstream) => {
        const row = byWorkstream.get(workstream);
        const chargedMicros = Number(row?.charged_micros ?? 0);
        const budgetMicros = WORKSTREAM_BUDGET_MICROS[workstream];
        return {
          workstream,
          budgetMicros,
          chargedMicros,
          remainingMicros: Math.max(0, budgetMicros - chargedMicros),
          calls: Number(row?.calls ?? 0),
          failedCalls: Number(row?.failed_calls ?? 0),
          pendingCalls: Number(row?.pending_calls ?? 0),
        };
      }),
    };
  }

  private currentTotals(month: string, workstream: AiWorkstream) {
    const fleet = this.sql<TotalRow>`SELECT COALESCE(SUM(charged_micros), 0) AS total
      FROM ai_fleet_reservations WHERE month_key = ${month}`[0]?.total ?? 0;
    const role = this.sql<TotalRow>`SELECT COALESCE(SUM(charged_micros), 0) AS total
      FROM ai_fleet_reservations
      WHERE month_key = ${month} AND workstream = ${workstream}`[0]?.total ?? 0;
    return { fleet: Number(fleet), workstream: Number(role) };
  }
}
