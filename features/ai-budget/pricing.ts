import {
  aiModelSchema,
  type AiModel,
} from "./contracts";

type ModelPrice = {
  inputUsdPerMillion: number;
  outputUsdPerMillion: number;
};

export const MODEL_PRICES = {
  "@cf/ibm-granite/granite-4.0-h-micro": {
    inputUsdPerMillion: 0.017,
    outputUsdPerMillion: 0.112,
  },
  "@cf/ai4bharat/indictrans2-en-indic-1B": {
    inputUsdPerMillion: 0.342,
    outputUsdPerMillion: 0.342,
  },
  "@cf/meta/llama-3.1-8b-instruct-fast": {
    inputUsdPerMillion: 0.045,
    outputUsdPerMillion: 0.384,
  },
  "@cf/meta/llama-3.2-11b-vision-instruct": {
    inputUsdPerMillion: 0.049,
    outputUsdPerMillion: 0.68,
  },
} as const satisfies Record<AiModel, ModelPrice>;

export function modelCostMicros(
  model: AiModel,
  inputTokens: number,
  outputTokens: number,
) {
  const price = MODEL_PRICES[model];
  return Math.max(
    1,
    Math.ceil(
      inputTokens * price.inputUsdPerMillion +
        outputTokens * price.outputUsdPerMillion,
    ),
  );
}

function serializedInput(input: Record<string, unknown>) {
  try {
    return JSON.stringify(input);
  } catch {
    throw new Error("AI_BUDGET_INPUT_INVALID");
  }
}

export function estimateInputTokens(input: Record<string, unknown>) {
  // A tokenizer cannot emit more non-empty tokens than the UTF-8 bytes it
  // consumes. Treating every byte as one token plus fixed request overhead is
  // intentionally much more conservative than a typical chars/token estimate.
  const estimated =
    new TextEncoder().encode(serializedInput(input)).byteLength + 256;
  if (estimated > 5_000_000) throw new Error("AI_BUDGET_INPUT_UNBOUNDED");
  return Math.max(1, estimated);
}

export function maxOutputTokens(
  model: string,
  input: Record<string, unknown>,
  estimatedInputTokens: number,
) {
  aiModelSchema.parse(model);
  const explicit = input.max_tokens;
  if (
    typeof explicit === "number" &&
    Number.isInteger(explicit) &&
    explicit >= 1 &&
    explicit <= 100_000
  ) {
    return explicit;
  }
  if (
    model === "@cf/ai4bharat/indictrans2-en-indic-1B" &&
    Array.isArray(input.text) &&
    input.text.every((value) => typeof value === "string")
  ) {
    const derived = Math.max(1, Math.ceil(estimatedInputTokens * 1.5));
    if (derived <= 100_000) return derived;
  }
  throw new Error("AI_BUDGET_OUTPUT_UNBOUNDED");
}

export function pricedReservation(
  model: string,
  input: Record<string, unknown>,
) {
  const parsedModel = aiModelSchema.parse(model);
  const estimatedInputTokens = estimateInputTokens(input);
  const boundedOutputTokens = maxOutputTokens(
    parsedModel,
    input,
    estimatedInputTokens,
  );
  return {
    model: parsedModel,
    estimatedInputTokens,
    maxOutputTokens: boundedOutputTokens,
    reservedMicros: modelCostMicros(
      parsedModel,
      estimatedInputTokens,
      boundedOutputTokens,
    ),
  };
}
