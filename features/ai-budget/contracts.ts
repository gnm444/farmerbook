import { z } from "zod";

export const AI_MODEL_IDS = [
  "@cf/ibm-granite/granite-4.0-h-micro",
  "@cf/ai4bharat/indictrans2-en-indic-1B",
  "@cf/meta/llama-3.1-8b-instruct-fast",
  "@cf/meta/llama-3.2-11b-vision-instruct",
] as const;

export const aiModelSchema = z.enum(AI_MODEL_IDS);
export type AiModel = z.infer<typeof aiModelSchema>;

export const AI_WORKSTREAMS = [
  "website_greeting",
  "blog_writing",
  "growth_outreach",
  "profile_drafting",
  "customer_support",
  "social_content",
] as const;

export const aiWorkstreamSchema = z.enum(AI_WORKSTREAMS);
export type AiWorkstream = z.infer<typeof aiWorkstreamSchema>;

export const AI_OPERATIONS = [
  "website_reply",
  "blog_draft",
  "blog_translation",
  "outreach_qualification",
  "screenshot_ocr",
  "profile_sample",
  "support_reply",
  "social_content_draft",
] as const;

export const aiOperationSchema = z.enum(AI_OPERATIONS);
export type AiOperation = z.infer<typeof aiOperationSchema>;

export const FLEET_MONTHLY_BUDGET_MICROS = 10_000_000;

export const WORKSTREAM_BUDGET_MICROS = {
  website_greeting: 5_000_000,
  blog_writing: 2_000_000,
  growth_outreach: 3_000_000,
  profile_drafting: 0,
  customer_support: 0,
  social_content: 0,
} as const satisfies Record<AiWorkstream, number>;

export const ALLOCATED_MONTHLY_BUDGET_MICROS = Object.values(
  WORKSTREAM_BUDGET_MICROS,
).reduce<number>((sum, value) => sum + value, 0);

export const UNALLOCATED_MONTHLY_BUDGET_MICROS =
  FLEET_MONTHLY_BUDGET_MICROS - ALLOCATED_MONTHLY_BUDGET_MICROS;

if (
  ALLOCATED_MONTHLY_BUDGET_MICROS < 0 ||
  ALLOCATED_MONTHLY_BUDGET_MICROS > FLEET_MONTHLY_BUDGET_MICROS
) {
  throw new Error("AI_WORKSTREAM_ALLOCATIONS_INVALID");
}

const OPERATION_WORKSTREAM = {
  website_reply: "website_greeting",
  blog_draft: "blog_writing",
  blog_translation: "blog_writing",
  outreach_qualification: "growth_outreach",
  screenshot_ocr: "growth_outreach",
  profile_sample: "profile_drafting",
  support_reply: "customer_support",
  social_content_draft: "social_content",
} as const satisfies Record<AiOperation, AiWorkstream>;

export function workstreamForOperation(operation: AiOperation) {
  return OPERATION_WORKSTREAM[operation];
}

export const aiReservationInputSchema = z
  .object({
    reservationId: z.uuid(),
    workstream: aiWorkstreamSchema,
    operation: aiOperationSchema,
    model: aiModelSchema,
    estimatedInputTokens: z.number().int().min(1).max(5_000_000),
    maxOutputTokens: z.number().int().min(1).max(100_000),
  })
  .refine(
    (input) => workstreamForOperation(input.operation) === input.workstream,
    { message: "AI_OPERATION_WORKSTREAM_CONFLICT" },
  );

export type AiReservationInput = z.infer<typeof aiReservationInputSchema>;

export const aiSettlementInputSchema = z
  .object({
    reservationId: z.uuid(),
    outcome: z.enum(["succeeded", "failed"]),
    reportedInputTokens: z.number().int().min(0).max(5_000_000).nullable(),
    reportedOutputTokens: z.number().int().min(0).max(100_000).nullable(),
    failureCode: z
      .string()
      .regex(/^[A-Z0-9_]{1,80}$/)
      .nullable(),
  })
  .refine(
    (input) =>
      (input.reportedInputTokens === null) ===
      (input.reportedOutputTokens === null),
    { message: "AI_REPORTED_TOKEN_PAIR_INVALID" },
  );

export type AiSettlementInput = z.infer<typeof aiSettlementInputSchema>;

export type AiReservationResult =
  | {
      code: "RESERVED";
      reservationId: string;
      monthKey: string;
      reservedMicros: number;
      fleetReservedMicros: number;
      workstreamReservedMicros: number;
    }
  | {
      code: "WORKSTREAM_BUDGET_REACHED" | "FLEET_BUDGET_REACHED";
      reservationId: null;
      monthKey: string;
      reservedMicros: 0;
      fleetReservedMicros: number;
      workstreamReservedMicros: number;
    };

export type AiSettlementResult = {
  code: "SETTLED" | "ALREADY_SETTLED";
  reservationId: string;
  chargedMicros: number;
  reportedCostMicros: number | null;
};

export type AiWorkstreamBudgetStatus = {
  workstream: AiWorkstream;
  budgetMicros: number;
  chargedMicros: number;
  remainingMicros: number;
  calls: number;
  failedCalls: number;
  pendingCalls: number;
};

export type AiFleetBudgetStatus = {
  monthKey: string;
  fleetBudgetMicros: number;
  allocatedBudgetMicros: number;
  unallocatedBudgetMicros: number;
  chargedMicros: number;
  remainingMicros: number;
  calls: number;
  failedCalls: number;
  pendingCalls: number;
  workstreams: AiWorkstreamBudgetStatus[];
};
