import { describe, expect, it, vi } from "vitest";
import {
  AI_WORKSTREAMS,
  ALLOCATED_MONTHLY_BUDGET_MICROS,
  FLEET_MONTHLY_BUDGET_MICROS,
  UNALLOCATED_MONTHLY_BUDGET_MICROS,
  WORKSTREAM_BUDGET_MICROS,
  workstreamForOperation,
} from "@/features/ai-budget/contracts";
import {
  reportedUsage,
  runBudgetedAi,
} from "@/features/ai-budget/inference";
import { evaluateReservation } from "@/features/ai-budget/ledger";
import {
  MODEL_PRICES,
  estimateInputTokens,
  modelCostMicros,
  pricedReservation,
} from "@/features/ai-budget/pricing";
import { allowingBudgetService } from "./ai-budget-test-helpers";

const granite = "@cf/ibm-granite/granite-4.0-h-micro";

describe("central AI fleet budget contracts", () => {
  it("keeps only the approved allocations spendable", () => {
    expect(FLEET_MONTHLY_BUDGET_MICROS).toBe(10_000_000);
    expect(ALLOCATED_MONTHLY_BUDGET_MICROS).toBe(10_000_000);
    expect(UNALLOCATED_MONTHLY_BUDGET_MICROS).toBe(0);
    expect(WORKSTREAM_BUDGET_MICROS).toMatchObject({
      website_greeting: 5_000_000,
      blog_writing: 2_000_000,
      growth_outreach: 3_000_000,
      profile_drafting: 0,
      customer_support: 0,
      social_content: 0,
    });
    expect(AI_WORKSTREAMS).toHaveLength(6);
  });

  it("binds each operation to one workstream", () => {
    expect(workstreamForOperation("website_reply")).toBe("website_greeting");
    expect(workstreamForOperation("blog_translation")).toBe("blog_writing");
    expect(workstreamForOperation("screenshot_ocr")).toBe("growth_outreach");
    expect(workstreamForOperation("profile_sample")).toBe("profile_drafting");
    expect(workstreamForOperation("support_reply")).toBe("customer_support");
    expect(workstreamForOperation("social_content_draft")).toBe("social_content");
  });

  it("uses the exact upward-rounded price allowlist", () => {
    expect(MODEL_PRICES[granite]).toEqual({
      inputUsdPerMillion: 0.017,
      outputUsdPerMillion: 0.112,
    });
    expect(MODEL_PRICES["@cf/ai4bharat/indictrans2-en-indic-1B"])
      .toEqual({ inputUsdPerMillion: 0.342, outputUsdPerMillion: 0.342 });
    expect(MODEL_PRICES["@cf/meta/llama-3.1-8b-instruct-fast"])
      .toEqual({ inputUsdPerMillion: 0.045, outputUsdPerMillion: 0.384 });
    expect(MODEL_PRICES["@cf/meta/llama-3.2-11b-vision-instruct"])
      .toEqual({ inputUsdPerMillion: 0.049, outputUsdPerMillion: 0.68 });
    expect(modelCostMicros(granite, 1_000, 160)).toBe(35);
  });

  it("rejects unknown models and unbounded outputs", () => {
    expect(() => pricedReservation("unknown", { max_tokens: 10 })).toThrow();
    expect(() => pricedReservation(granite, { messages: [] })).toThrow(
      "AI_BUDGET_OUTPUT_UNBOUNDED",
    );
  });

  it("uses a UTF-8 byte upper bound for multilingual and image input", () => {
    const input = {
      text: ["నమస్కారం 🌾"],
      image: "data:image/png;base64,AAAA",
    };
    const bytes = new TextEncoder().encode(JSON.stringify(input)).byteLength;
    expect(estimateInputTokens(input)).toBeGreaterThan(bytes);
  });

  it("derives a bounded translation output allowance", () => {
    const reservation = pricedReservation(
      "@cf/ai4bharat/indictrans2-en-indic-1B",
      { text: ["A bounded article field."], target_language: "hin_Deva" },
    );
    expect(reservation.maxOutputTokens).toBeGreaterThan(
      reservation.estimatedInputTokens,
    );
  });

  it("denies workstream and fleet exhaustion independently", () => {
    expect(evaluateReservation({
      workstream: "website_greeting",
      fleetChargedMicros: 0,
      workstreamChargedMicros: 5_000_000,
      requestedMicros: 1,
    })).toBe("WORKSTREAM_BUDGET_REACHED");
    expect(evaluateReservation({
      workstream: "website_greeting",
      fleetChargedMicros: 10_000_000,
      workstreamChargedMicros: 0,
      requestedMicros: 1,
    })).toBe("FLEET_BUDGET_REACHED");
    expect(evaluateReservation({
      workstream: "profile_drafting",
      fleetChargedMicros: 0,
      workstreamChargedMicros: 0,
      requestedMicros: 1,
    })).toBe("WORKSTREAM_BUDGET_REACHED");
  });
});

describe("budgeted Workers AI execution", () => {
  const request = {
    workstream: "website_greeting" as const,
    operation: "website_reply" as const,
    model: granite,
    input: { messages: [{ role: "user", content: "Hello" }], max_tokens: 160 },
  };

  it("makes zero model calls when the central budget denies", async () => {
    const run = vi.fn();
    const budget = allowingBudgetService();
    budget.reserve = vi.fn(async () => ({
      code: "WORKSTREAM_BUDGET_REACHED" as const,
      reservationId: null,
      monthKey: "2026-08",
      reservedMicros: 0 as const,
      fleetReservedMicros: 1,
      workstreamReservedMicros: 1,
    }));
    await expect(runBudgetedAi({ ai: { run }, budget }, request))
      .rejects.toMatchObject({
        code: "AI_WORKSTREAM_BUDGET_REACHED",
      });
    expect(run).not.toHaveBeenCalled();
  });

  it("settles reported token usage after exactly one accepted call", async () => {
    const result = {
      response: "Namaste",
      usage: { prompt_tokens: 120, completion_tokens: 20 },
    };
    const run = vi.fn(async () => result);
    const budget = allowingBudgetService();
    budget.reserve = vi.fn(budget.reserve);
    budget.settle = vi.fn(budget.settle);
    await expect(runBudgetedAi({ ai: { run }, budget }, request)).resolves.toBe(result);
    expect(run).toHaveBeenCalledOnce();
    expect(budget.reserve).toHaveBeenCalledOnce();
    expect(budget.settle).toHaveBeenCalledWith(expect.objectContaining({
      outcome: "succeeded",
      reportedInputTokens: 120,
      reportedOutputTokens: 20,
      failureCode: null,
    }));
  });

  it("keeps inference successful when settlement is unavailable", async () => {
    const budget = allowingBudgetService();
    budget.settle = vi.fn(async () => {
      throw new Error("temporary settlement failure");
    });
    await expect(runBudgetedAi({
      ai: { run: vi.fn(async () => ({ response: "Safe" })) },
      budget,
    }, request)).resolves.toEqual({ response: "Safe" });
  });

  it("uses a coarse failure code that cannot leak input or provider details", async () => {
    const budget = allowingBudgetService();
    budget.settle = vi.fn(budget.settle);
    await expect(runBudgetedAi({
      ai: { run: vi.fn(async () => { throw new Error("upstream timeout for Hello"); }) },
      budget,
    }, request)).rejects.toThrow("upstream timeout for Hello");
    const settlement = vi.mocked(budget.settle).mock.calls[0]?.[0];
    expect(settlement).toMatchObject({
      outcome: "failed",
      reportedInputTokens: null,
      reportedOutputTokens: null,
      failureCode: "AI_UPSTREAM_TIMEOUT",
    });
    expect(JSON.stringify(settlement)).not.toContain("Hello");
  });

  it("accepts only complete nonnegative provider usage", () => {
    expect(reportedUsage({ usage: { input_tokens: 2, output_tokens: 3 } }))
      .toEqual({ inputTokens: 2, outputTokens: 3 });
    expect(reportedUsage({ usage: { input_tokens: 2 } })).toBeNull();
    expect(reportedUsage({ usage: { prompt_tokens: -1, completion_tokens: 3 } }))
      .toBeNull();
  });
});
