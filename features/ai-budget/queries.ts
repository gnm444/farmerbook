import { requireAdmin } from "@/features/auth/require-admin";
import { getCloudflareBindings } from "@/lib/cloudflare-bindings";
import type { AiFleetBudgetStatus } from "./contracts";
import { aiFleetBudgetAgentStub } from "./runtime";

export type AiFleetBudgetDashboard =
  | { available: true; status: AiFleetBudgetStatus }
  | { available: false };

export async function loadAiFleetBudgetStatus(): Promise<AiFleetBudgetDashboard> {
  await requireAdmin();

  try {
    const bindings = await getCloudflareBindings();
    const budget = await aiFleetBudgetAgentStub(bindings);
    if (!budget) return { available: false };
    return { available: true, status: await budget.status() };
  } catch {
    return { available: false };
  }
}
