import type { BudgetedAiRuntime } from "@/features/ai-budget/inference";
import type { AiFleetBudgetService } from "@/features/ai-budget/runtime";
import type { WorkersAiBinding } from "@/lib/cloudflare-bindings";

export function allowingBudgetService(): AiFleetBudgetService {
  return {
    async reserve(input) {
      return {
        code: "RESERVED",
        reservationId: input.reservationId,
        monthKey: "2026-08",
        reservedMicros: 1,
        fleetReservedMicros: 1,
        workstreamReservedMicros: 1,
      };
    },
    async settle(input) {
      return {
        code: "SETTLED",
        reservationId: input.reservationId,
        chargedMicros: 1,
        reportedCostMicros: null,
      };
    },
    async status() {
      return {
        monthKey: "2026-08",
        fleetBudgetMicros: 10_000_000,
        allocatedBudgetMicros: 10_000_000,
        unallocatedBudgetMicros: 0,
        chargedMicros: 0,
        remainingMicros: 10_000_000,
        calls: 0,
        failedCalls: 0,
        pendingCalls: 0,
        workstreams: [],
      };
    },
  };
}

export function allowingAiRuntime(
  ai: WorkersAiBinding,
): BudgetedAiRuntime {
  return { ai, budget: allowingBudgetService() };
}
