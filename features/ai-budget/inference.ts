import type { WorkersAiBinding } from "@/lib/cloudflare-bindings";
import {
  aiOperationSchema,
  aiWorkstreamSchema,
  workstreamForOperation,
  type AiOperation,
  type AiWorkstream,
} from "./contracts";
import { pricedReservation } from "./pricing";
import type { AiFleetBudgetService } from "./runtime";

export type BudgetedAiRuntime = {
  ai?: WorkersAiBinding;
  budget?: AiFleetBudgetService | null;
};

export type BudgetedInferenceRequest = {
  workstream: AiWorkstream;
  operation: AiOperation;
  model: string;
  input: Record<string, unknown>;
};

export class AiBudgetError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = "AiBudgetError";
  }
}

function boundedFailureCode(caught: unknown) {
  const message = caught instanceof Error ? caught.message : "";
  if (/time.?out/i.test(message)) return "AI_UPSTREAM_TIMEOUT";
  if (/rate.?limit|quota|billing|credit|capacity/i.test(message)) {
    return "AI_UPSTREAM_CAPACITY";
  }
  if (/abort/i.test(message)) return "AI_UPSTREAM_ABORTED";
  return "AI_INFERENCE_FAILED";
}

function nonnegativeInteger(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : null;
}

export function reportedUsage(result: unknown) {
  if (!result || typeof result !== "object") return null;
  const usage = (result as { usage?: unknown }).usage;
  if (!usage || typeof usage !== "object") return null;
  const record = usage as Record<string, unknown>;
  const inputTokens = nonnegativeInteger(
    record.prompt_tokens ?? record.input_tokens,
  );
  const outputTokens = nonnegativeInteger(
    record.completion_tokens ?? record.output_tokens,
  );
  return inputTokens === null || outputTokens === null
    ? null
    : { inputTokens, outputTokens };
}

async function settleSafely(
  budget: AiFleetBudgetService,
  input: Parameters<AiFleetBudgetService["settle"]>[0],
) {
  try {
    await budget.settle(input);
  } catch {
    // The accepted reservation remains charged when settlement is unavailable.
  }
}

export async function runBudgetedAi(
  runtime: BudgetedAiRuntime,
  rawRequest: BudgetedInferenceRequest,
) {
  if (!runtime.ai) throw new AiBudgetError("AI_BINDING_UNAVAILABLE");
  if (!runtime.budget) throw new AiBudgetError("AI_BUDGET_UNAVAILABLE");
  const workstream = aiWorkstreamSchema.parse(rawRequest.workstream);
  const operation = aiOperationSchema.parse(rawRequest.operation);
  if (workstreamForOperation(operation) !== workstream) {
    throw new AiBudgetError("AI_OPERATION_WORKSTREAM_CONFLICT");
  }
  const priced = pricedReservation(rawRequest.model, rawRequest.input);
  const reservationId = crypto.randomUUID();
  let reservation;
  try {
    reservation = await runtime.budget.reserve({
      reservationId,
      workstream,
      operation,
      model: priced.model,
      estimatedInputTokens: priced.estimatedInputTokens,
      maxOutputTokens: priced.maxOutputTokens,
    });
  } catch {
    throw new AiBudgetError("AI_BUDGET_UNAVAILABLE");
  }
  if (reservation.code !== "RESERVED") {
    throw new AiBudgetError(`AI_${reservation.code}`);
  }
  try {
    const result = await runtime.ai.run(priced.model, rawRequest.input);
    const usage = reportedUsage(result);
    await settleSafely(runtime.budget, {
      reservationId,
      outcome: "succeeded",
      reportedInputTokens: usage?.inputTokens ?? null,
      reportedOutputTokens: usage?.outputTokens ?? null,
      failureCode: null,
    });
    return result;
  } catch (caught) {
    await settleSafely(runtime.budget, {
      reservationId,
      outcome: "failed",
      reportedInputTokens: null,
      reportedOutputTokens: null,
      failureCode: boundedFailureCode(caught),
    });
    throw caught;
  }
}
