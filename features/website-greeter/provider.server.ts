import type { WorkersAiBinding } from "@/lib/cloudflare-bindings";
import type { AiFleetBudgetAgent } from "@/features/ai-budget/agent";
import {
  runBudgetedAi,
  runBudgetedExternalAi,
} from "@/features/ai-budget/inference";
import { modelCostMicros } from "@/features/ai-budget/pricing";
import { createBudgetedAiRuntime } from "@/features/ai-budget/runtime";
import {
  DEFAULT_WEBSITE_GREETER_MODEL,
  isGoogleWebsiteGreeterCanaryEnabled,
  resolveWebsiteGreeterProviderConfiguration,
  type WebsiteGreeterProviderEnvironment,
  type WebsiteGreeterProviderId,
} from "./provider-config";
import {
  isWebsiteGreeterMemoryScopeId,
  type WebsiteGreeterAnonymousConversation,
  type WebsiteGreeterContextTurn,
  type WebsiteGreeterProviderSessionMapping,
} from "./conversation";
import type { WebsiteGreeterReleaseLocale } from "./locales";
import {
  deleteGoogleWebsiteGreeterMemories,
  invokeGoogleWebsiteGreeter,
  type GoogleWebsiteGreeterTransportEnvironment,
} from "./google-provider.server";

const MODEL_INPUT_USD_PER_MILLION = 0.017;
const MODEL_OUTPUT_USD_PER_MILLION = 0.112;

export type WebsiteGreeterInferenceRequest = {
  systemPrompt: string;
  message: string;
  locale: WebsiteGreeterReleaseLocale;
  history: readonly WebsiteGreeterContextTurn[];
  session: WebsiteGreeterAnonymousConversation | null;
  maxOutputTokens: number;
  temperature: number;
};

export type WebsiteGreeterInferenceProvider = {
  id: WebsiteGreeterProviderId;
  model: string;
  conservativeCostMicros(request: WebsiteGreeterInferenceRequest): number;
  generate(request: WebsiteGreeterInferenceRequest): Promise<{
    providerId: WebsiteGreeterProviderId;
    value: unknown;
  }>;
};

export type WebsiteGreeterProviderRuntimeEnvironment =
  WebsiteGreeterProviderEnvironment & {
    AI?: WorkersAiBinding;
    AI_FLEET_BUDGET_AGENT?: DurableObjectNamespace<AiFleetBudgetAgent>;
  } & GoogleWebsiteGreeterTransportEnvironment;

export type WebsiteGreeterProviderResolution =
  | { ok: true; provider: WebsiteGreeterInferenceProvider }
  | { ok: false; code: `AI_${string}`; providerId: WebsiteGreeterProviderId | null };

function estimateTokens(value: string) {
  return Math.ceil(value.length / 3);
}

function cloudflareConservativeCostMicros(request: WebsiteGreeterInferenceRequest) {
  const inputTokens = estimateTokens(request.systemPrompt)
    + estimateTokens(request.message)
    + request.history.reduce(
      (sum, turn) => sum + estimateTokens(turn.content) + 4,
      0,
    )
    + 32;
  const inputUsd = (inputTokens / 1_000_000) * MODEL_INPUT_USD_PER_MILLION;
  const outputUsd =
    (request.maxOutputTokens / 1_000_000) * MODEL_OUTPUT_USD_PER_MILLION;
  return Math.max(1, Math.ceil((inputUsd + outputUsd) * 1_000_000));
}

function googleConservativeCostMicros(request: WebsiteGreeterInferenceRequest) {
  const inputTokens = estimateTokens(request.systemPrompt)
    + estimateTokens(request.message)
    + request.history.reduce(
      (sum, turn) => sum + estimateTokens(turn.content) + 4,
      0,
    )
    + 128;
  return modelCostMicros(
    "google/vertex-agent-engine-canary",
    inputTokens,
    request.maxOutputTokens,
  ) + cloudflareConservativeCostMicros(request);
}

function cloudflareProvider(
  env: WebsiteGreeterProviderRuntimeEnvironment,
  model: string,
): WebsiteGreeterInferenceProvider | null {
  if (!env.AI || !env.AI_FLEET_BUDGET_AGENT) return null;
  return {
    id: "cloudflare_workers_ai",
    model,
    conservativeCostMicros: cloudflareConservativeCostMicros,
    async generate(request) {
      const value = await runBudgetedAi(
        await createBudgetedAiRuntime(env),
        {
          workstream: "website_greeting",
          operation: "website_reply",
          model,
          input: {
            messages: websiteGreeterProviderMessages(request),
            max_tokens: request.maxOutputTokens,
            temperature: request.temperature,
          },
        },
      );
      return { providerId: "cloudflare_workers_ai", value };
    },
  };
}

export function websiteGreeterProviderMessages(
  request: WebsiteGreeterInferenceRequest,
) {
  return [
    { role: "system", content: request.systemPrompt },
    ...request.history.map((turn) => ({
      role: turn.role,
      content: turn.content,
    })),
    {
      role: "user",
      content: `Visitor locale: ${request.locale}\nVisitor question: ${request.message}`,
    },
  ];
}

/**
 * Server-only provider factory. The browser sends only a bounded message,
 * locale and anonymous session ID; provider configuration stays in Worker env.
 */
export function resolveWebsiteGreeterProvider(
  env: WebsiteGreeterProviderRuntimeEnvironment,
): WebsiteGreeterProviderResolution {
  const resolved = resolveWebsiteGreeterProviderConfiguration(env);
  if (!resolved.ok) {
    return { ok: false, code: resolved.code, providerId: null };
  }

  if (resolved.configuration.provider === "google_vertex_agent_engine") {
    if (!env.GOOGLE_IDENTITY_BROKER || !env.AI_FLEET_BUDGET_AGENT) {
      return {
        ok: false,
        code: !env.GOOGLE_IDENTITY_BROKER
          ? "AI_GOOGLE_IDENTITY_BROKER_UNAVAILABLE"
          : "AI_BUDGET_UNAVAILABLE",
        providerId: resolved.configuration.provider,
      };
    }
    const configuration = resolved.configuration;
    const fallback = env.AI
      ? cloudflareProvider(env, DEFAULT_WEBSITE_GREETER_MODEL)
      : null;
    return {
      ok: true,
      provider: {
        id: configuration.provider,
        model: configuration.budgetModel,
        conservativeCostMicros: googleConservativeCostMicros,
        async generate(request) {
          try {
            const response = await runBudgetedExternalAi(
              await createBudgetedAiRuntime(env),
              {
                workstream: "website_greeting",
                operation: "website_reply",
                model: configuration.budgetModel,
                input: {
                  systemPrompt: request.systemPrompt,
                  message: request.message,
                  locale: request.locale,
                  history: request.history,
                  max_tokens: request.maxOutputTokens,
                  temperature: request.temperature,
                },
              },
              () => invokeGoogleWebsiteGreeter({
                configuration,
                inference: request,
                identityBroker: env.GOOGLE_IDENTITY_BROKER!,
              }),
            );
            return {
              providerId: "google_vertex_agent_engine",
              value: {
                response: (response as { text: string }).text,
                usage: (response as { usage?: unknown }).usage,
              },
            };
          } catch (googleError) {
            if (fallback) {
              try {
                return await fallback.generate(request);
              } catch {
                // Preserve the bounded Google failure for diagnostics while
                // the caller returns the existing safe handoff.
              }
            }
            throw googleError;
          }
        },
      },
    };
  }

  if (!env.AI || !env.AI_FLEET_BUDGET_AGENT) {
    return {
      ok: false,
      code: !env.AI ? "AI_BINDING_UNAVAILABLE" : "AI_BUDGET_UNAVAILABLE",
      providerId: resolved.configuration.provider,
    };
  }

  const configuration = resolved.configuration;
  const provider = cloudflareProvider(env, configuration.model);
  if (!provider) {
    return {
      ok: false,
      code: !env.AI ? "AI_BINDING_UNAVAILABLE" : "AI_BUDGET_UNAVAILABLE",
      providerId: resolved.configuration.provider,
    };
  }
  return {
    ok: true,
    provider,
  };
}

export function resolveWebsiteGreeterProviderForSurface(
  env: WebsiteGreeterProviderRuntimeEnvironment,
  surface: "site_launcher" | "chat_canary",
) {
  const googleCanary = surface === "chat_canary"
    && isGoogleWebsiteGreeterCanaryEnabled(
      env.WEBSITE_GREETER_GOOGLE_CANARY_ENABLED,
    );
  const selected = resolveWebsiteGreeterProvider({
    ...env,
    WEBSITE_GREETER_PROVIDER: googleCanary
      ? "google_vertex_agent_engine"
      : "cloudflare_workers_ai",
  });
  if (!googleCanary || selected.ok) return selected;
  return resolveWebsiteGreeterProvider({
    ...env,
    WEBSITE_GREETER_PROVIDER: "cloudflare_workers_ai",
  });
}

export async function deleteGoogleWebsiteGreeterMemoryForSession(
  env: WebsiteGreeterProviderRuntimeEnvironment,
  mapping: WebsiteGreeterProviderSessionMapping | null,
) {
  if (mapping?.providerId !== "google_vertex_agent_engine"
    || !isWebsiteGreeterMemoryScopeId(mapping.providerSessionId)) {
    return { deleted: 0 };
  }
  const resolved = resolveWebsiteGreeterProviderConfiguration({
    ...env,
    WEBSITE_GREETER_PROVIDER: "google_vertex_agent_engine",
  });
  if (!resolved.ok
    || resolved.configuration.provider !== "google_vertex_agent_engine"
    || !env.GOOGLE_IDENTITY_BROKER) {
    throw new Error("AI_GOOGLE_MEMORY_DELETE_UNAVAILABLE");
  }
  return deleteGoogleWebsiteGreeterMemories({
    configuration: resolved.configuration,
    identityBroker: env.GOOGLE_IDENTITY_BROKER,
    scopeId: mapping.providerSessionId,
  });
}
