import type { FarmerBookBindings } from "@/lib/cloudflare-bindings";
import type { BudgetedAiRuntime } from "./inference";
import type { AiFleetBudgetAgent } from "./agent";
import type {
  AiFleetBudgetStatus,
  AiReservationInput,
  AiReservationResult,
  AiSettlementInput,
  AiSettlementResult,
} from "./contracts";

export interface AiFleetBudgetService {
  reserve(input: AiReservationInput): Promise<AiReservationResult>;
  settle(input: AiSettlementInput): Promise<AiSettlementResult>;
  status(): Promise<AiFleetBudgetStatus>;
}

export async function aiFleetBudgetAgentStub(
  bindings: FarmerBookBindings | null | undefined,
): Promise<AiFleetBudgetService | null> {
  if (!bindings?.AI_FLEET_BUDGET_AGENT) return null;
  const { getAgentByName } = await import("agents");
  return await getAgentByName(
    bindings.AI_FLEET_BUDGET_AGENT,
    "farmerbook-ai-fleet-budget",
  ) as DurableObjectStub<AiFleetBudgetAgent>;
}

export async function createBudgetedAiRuntime(
  bindings: FarmerBookBindings | null | undefined,
): Promise<BudgetedAiRuntime> {
  return {
    ai: bindings?.AI,
    budget: await aiFleetBudgetAgentStub(bindings),
  };
}
