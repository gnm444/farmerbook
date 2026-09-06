import { z } from "zod";
import { APPLICATION_MONTHLY_AI_SPEND_CEILING_MICROS } from "@/features/ai-budget/contracts";
import {
  WEBSITE_GREETER_RELEASE_LOCALES,
  type WebsiteGreeterReleaseLocale,
} from "./locales";

export {
  WEBSITE_GREETER_RELEASE_LOCALES,
  type WebsiteGreeterReleaseLocale,
} from "./locales";

export const WEBSITE_GREETER_PROVIDER_IDS = [
  "cloudflare_workers_ai",
  "google_vertex_agent_engine",
] as const;

export type WebsiteGreeterProviderId =
  (typeof WEBSITE_GREETER_PROVIDER_IDS)[number];

export const DEFAULT_WEBSITE_GREETER_MODEL =
  "@cf/ibm-granite/granite-4.0-h-micro";
export const GOOGLE_VERTEX_CANARY_BUDGET_MODEL =
  "google/vertex-agent-engine-canary" as const;

export const APPLICATION_MONTHLY_AI_SPEND_CEILING_USD =
  APPLICATION_MONTHLY_AI_SPEND_CEILING_MICROS / 1_000_000;
export const DEFAULT_WEBSITE_GREETER_MONTHLY_BUDGET_USD = 5;

const cloudflareModelSchema = z.literal(DEFAULT_WEBSITE_GREETER_MODEL);
const googleProjectSchema = z
  .string()
  .trim()
  .min(6)
  .max(30)
  .regex(/^[a-z][a-z0-9-]*[a-z0-9]$/);
const googleLocationSchema = z
  .string()
  .trim()
  .min(2)
  .max(32)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const googleAgentEngineIdSchema = z.string().trim().regex(/^\d{1,32}$/);
const googleWorkloadIdentityAudienceSchema = z.string().trim().max(256).regex(
  /^\/\/iam\.googleapis\.com\/projects\/\d{1,32}\/locations\/global\/workloadIdentityPools\/[a-z][a-z0-9-]{3,31}\/providers\/[a-z][a-z0-9-]{3,31}$/,
);
const googleServiceAccountEmailSchema = z.string().trim().max(128).regex(
  /^[a-z][a-z0-9-]{4,28}[a-z0-9]@[a-z][a-z0-9-]{4,28}[a-z0-9]\.iam\.gserviceaccount\.com$/,
);
const websiteGreeterMonthlyBudgetSchema = z.coerce
  .number()
  .min(1)
  .max(APPLICATION_MONTHLY_AI_SPEND_CEILING_USD)
  .catch(DEFAULT_WEBSITE_GREETER_MONTHLY_BUDGET_USD);

export type WebsiteGreeterProviderEnvironment = {
  WEBSITE_GREETER_PROVIDER?: string;
  WEBSITE_GREETER_MODEL?: string;
  GOOGLE_CLOUD_PROJECT?: string;
  GOOGLE_CLOUD_LOCATION?: string;
  GOOGLE_CLOUD_AGENT_ENGINE_ID?: string;
  GOOGLE_CLOUD_WORKLOAD_IDENTITY_AUDIENCE?: string;
  GOOGLE_CLOUD_SERVICE_ACCOUNT_EMAIL?: string;
  WEBSITE_GREETER_GOOGLE_CANARY_ENABLED?: string;
};

export type WebsiteGreeterProviderConfiguration =
  | {
      provider: "cloudflare_workers_ai";
      model: typeof DEFAULT_WEBSITE_GREETER_MODEL;
    }
  | {
      provider: "google_vertex_agent_engine";
      project: string;
      location: string;
      agentEngineResource: string;
      serviceEndpoint: string;
      workloadIdentityAudience: string;
      serviceAccountEmail: string;
      budgetModel: typeof GOOGLE_VERTEX_CANARY_BUDGET_MODEL;
      supportedLocales: readonly WebsiteGreeterReleaseLocale[];
      authMode: "workload_identity_federation_via_service_binding";
    };

export type WebsiteGreeterProviderConfigurationResult =
  | { ok: true; configuration: WebsiteGreeterProviderConfiguration }
  | {
      ok: false;
      code:
        | "AI_PROVIDER_INVALID"
        | "AI_GOOGLE_CONFIGURATION_INCOMPLETE";
    };

function configuredProvider(value: string | undefined) {
  return value?.trim() || "cloudflare_workers_ai";
}

export function resolveWebsiteGreeterMonthlyBudgetUsd(value: string | undefined) {
  return websiteGreeterMonthlyBudgetSchema.parse(value);
}

export function isGoogleWebsiteGreeterCanaryEnabled(value: string | undefined) {
  return value?.trim().toLowerCase() === "true";
}

/**
 * Resolve only non-secret provider metadata. Authentication material must never
 * be accepted by the public greeter contract or exposed through NEXT_PUBLIC_*.
 */
export function resolveWebsiteGreeterProviderConfiguration(
  env: WebsiteGreeterProviderEnvironment,
): WebsiteGreeterProviderConfigurationResult {
  const provider = configuredProvider(env.WEBSITE_GREETER_PROVIDER);

  if (provider === "cloudflare_workers_ai") {
    const model = cloudflareModelSchema.catch(DEFAULT_WEBSITE_GREETER_MODEL).parse(
      env.WEBSITE_GREETER_MODEL?.trim() || DEFAULT_WEBSITE_GREETER_MODEL,
    );
    return { ok: true, configuration: { provider, model } };
  }

  if (provider !== "google_vertex_agent_engine") {
    return { ok: false, code: "AI_PROVIDER_INVALID" };
  }

  const parsed = z.object({
    project: googleProjectSchema,
    location: googleLocationSchema,
    agentEngineId: googleAgentEngineIdSchema,
    workloadIdentityAudience: googleWorkloadIdentityAudienceSchema,
    serviceAccountEmail: googleServiceAccountEmailSchema,
  }).safeParse({
    project: env.GOOGLE_CLOUD_PROJECT,
    location: env.GOOGLE_CLOUD_LOCATION,
    agentEngineId: env.GOOGLE_CLOUD_AGENT_ENGINE_ID,
    workloadIdentityAudience: env.GOOGLE_CLOUD_WORKLOAD_IDENTITY_AUDIENCE,
    serviceAccountEmail: env.GOOGLE_CLOUD_SERVICE_ACCOUNT_EMAIL,
  });

  if (!parsed.success) {
    return { ok: false, code: "AI_GOOGLE_CONFIGURATION_INCOMPLETE" };
  }

  return {
    ok: true,
    configuration: {
      provider,
      project: parsed.data.project,
      location: parsed.data.location,
      agentEngineResource:
        `projects/${parsed.data.project}/locations/${parsed.data.location}`
        + `/reasoningEngines/${parsed.data.agentEngineId}`,
      serviceEndpoint: `${parsed.data.location}-aiplatform.googleapis.com`,
      workloadIdentityAudience: parsed.data.workloadIdentityAudience,
      serviceAccountEmail: parsed.data.serviceAccountEmail,
      budgetModel: GOOGLE_VERTEX_CANARY_BUDGET_MODEL,
      supportedLocales: WEBSITE_GREETER_RELEASE_LOCALES,
      authMode: "workload_identity_federation_via_service_binding",
    },
  };
}
