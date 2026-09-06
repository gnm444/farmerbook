import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  websiteGreeterClearRequestSchema,
  websiteGreeterRequestSchema,
  websiteVisitRequestSchema,
} from "@/features/website-greeter/contracts";
import { approvedGreeterAnswer } from "@/features/website-greeter/knowledge";
import {
  DEFAULT_WEBSITE_GREETER_LOCALE,
  detectWebsiteGreeterLocale,
  websiteGreeterLocaleFromText,
} from "@/features/website-greeter/locales";
import {
  APPLICATION_MONTHLY_AI_SPEND_CEILING_USD,
  DEFAULT_WEBSITE_GREETER_MODEL,
  DEFAULT_WEBSITE_GREETER_MONTHLY_BUDGET_USD,
  resolveWebsiteGreeterMonthlyBudgetUsd,
  resolveWebsiteGreeterProviderConfiguration,
  WEBSITE_GREETER_RELEASE_LOCALES,
} from "@/features/website-greeter/provider-config";
import {
  resolveWebsiteGreeterProvider,
  resolveWebsiteGreeterProviderForSurface,
  websiteGreeterProviderMessages,
} from "@/features/website-greeter/provider.server";
import { aiText } from "@/features/website-greeter/response";
import {
  WEBSITE_GREETER_LOCALE_OPTIONS,
  websiteGreeterUiMessages,
} from "@/features/website-greeter/ui-messages";
import {
  WEBSITE_GREETER_CONTEXT_CONSENT_VERSION,
  WEBSITE_GREETER_CONTEXT_RETENTION_HOURS,
  WEBSITE_GREETER_MAX_CONTEXT_CHARACTERS,
  WEBSITE_GREETER_MAX_CONTEXT_TURNS,
  boundWebsiteGreeterContext,
  createWebsiteGreeterMemoryScopeId,
  isWebsiteGreeterMemoryScopeId,
  sanitizeWebsiteGreeterContextText,
  type WebsiteGreeterContextTurn,
} from "@/features/website-greeter/conversation";

describe("24/7 managed website greeting agent", () => {
  const agent = readFileSync("features/website-greeter/agent.ts", "utf8");
  const vite = readFileSync("vite.config.ts", "utf8");
  const worker = readFileSync("worker/index.ts", "utf8");

  it("runs as a named Cloudflare Agent Durable Object", () => {
    expect(vite).toContain('name: "WEBSITE_GREETING_AGENT"');
    expect(vite).toContain('class_name: "WebsiteGreetingAgent"');
    expect(vite).toContain('WebsiteGreetingAgent: { type: "durable-object", storage: "sqlite" }');
    expect(worker).toContain('"farmerbook-website-greeting"');
  });

  it("keeps the lifetime visit total in a deployment-stable global row", () => {
    expect(agent).toContain("website_visit_totals");
    expect(agent).toContain("ON CONFLICT(id) DO NOTHING");
    expect(agent).toContain("SELECT total_visits");
    expect(agent).toContain("UPDATE website_visit_totals");
  });

  it("partitions opt-in anonymous context and reserves future provider sessions", () => {
    expect(agent).toContain("website_greeter_conversations");
    expect(agent).toContain("website_greeter_conversation_turns");
    expect(agent).toContain("provider_session_id");
    expect(agent).toContain("WHERE session_id = ${sessionId}");
    expect(worker).toContain("websiteGreeterClearRequestSchema");
    expect(worker).toContain("agent.clearConversation");
    expect(worker).toContain("websiteGreeter.pruneExpiredConversations()");
    expect(WEBSITE_GREETER_CONTEXT_CONSENT_VERSION)
      .toBe("anonymous-conversation-context-v1");
    expect(WEBSITE_GREETER_CONTEXT_RETENTION_HOURS).toBe(24);
    const scopeId = createWebsiteGreeterMemoryScopeId();
    expect(isWebsiteGreeterMemoryScopeId(scopeId)).toBe(true);
    expect(isWebsiteGreeterMemoryScopeId(crypto.randomUUID())).toBe(false);
    expect(agent).toContain("deleteGoogleWebsiteGreeterMemoryForSession");
    expect(agent).toContain("Keep the opaque mapping so withdrawal/expiry cleanup can retry");
  });

  it("redacts and bounds context before it reaches a provider", () => {
    const sanitized = sanitizeWebsiteGreeterContextText(
      "Email me at visitor@example.com, call +91 98765 43210, or see https://example.com/private",
    );
    expect(sanitized).not.toContain("visitor@example.com");
    expect(sanitized).not.toContain("98765");
    expect(sanitized).not.toContain("example.com/private");
    expect(sanitized).toContain("[email removed]");
    expect(sanitized).toContain("[phone removed]");
    expect(sanitized).toContain("[link removed]");

    const turns: WebsiteGreeterContextTurn[] = Array.from(
      { length: 12 },
      (_, index) => ({
        role: index % 2 === 0 ? "user" : "assistant",
        content: `${index}-${"x".repeat(500)}`,
        locale: "en-IN",
      }),
    );
    const bounded = boundWebsiteGreeterContext(turns);
    expect(bounded.length).toBeLessThanOrEqual(WEBSITE_GREETER_MAX_CONTEXT_TURNS);
    expect(bounded.reduce((sum, turn) => sum + turn.content.length, 0))
      .toBeLessThanOrEqual(WEBSITE_GREETER_MAX_CONTEXT_CHARACTERS);
    expect(bounded.at(-1)?.content.startsWith("11-")).toBe(true);

    expect(websiteGreeterProviderMessages({
      systemPrompt: "Approved facts only",
      message: "What about that?",
      locale: "en-IN",
      history: [
        { role: "user", content: "Tell me about joining", locale: "en-IN" },
        { role: "assistant", content: "Choose an account type.", locale: "en-IN" },
      ],
      session: null,
      maxOutputTokens: 160,
      temperature: 0.2,
    })).toEqual([
      { role: "system", content: "Approved facts only" },
      { role: "user", content: "Tell me about joining" },
      { role: "assistant", content: "Choose an account type." },
      { role: "user", content: "Visitor locale: en-IN\nVisitor question: What about that?" },
    ]);
  });

  it("defaults to the cheapest allowlisted model and has layered hard stops", () => {
    expect(DEFAULT_WEBSITE_GREETER_MODEL).toBe(
      "@cf/ibm-granite/granite-4.0-h-micro",
    );
    expect(DEFAULT_WEBSITE_GREETER_MONTHLY_BUDGET_USD).toBe(5);
    expect(agent).toContain("DEFAULT_MONTHLY_REPLY_LIMIT = 25_000");
    expect(agent).toContain("MAX_SESSION_REPLIES = 8");
    expect(agent).toContain("DEFAULT_DAILY_AI_REPLY_LIMIT = 1_000");
    expect(APPLICATION_MONTHLY_AI_SPEND_CEILING_USD).toBe(20);
    expect(resolveWebsiteGreeterMonthlyBudgetUsd("20")).toBe(20);
    expect(resolveWebsiteGreeterMonthlyBudgetUsd("20.01")).toBe(5);
  });

  it("keeps Cloudflare as the default provider while Google is absent", () => {
    expect(resolveWebsiteGreeterProviderConfiguration({})).toEqual({
      ok: true,
      configuration: {
        provider: "cloudflare_workers_ai",
        model: "@cf/ibm-granite/granite-4.0-h-micro",
      },
    });
  });

  it("requires complete validated Google Agent Engine metadata", () => {
    expect(resolveWebsiteGreeterProviderConfiguration({
      WEBSITE_GREETER_PROVIDER: "google_vertex_agent_engine",
      GOOGLE_CLOUD_PROJECT: "farmerbook-prod",
    })).toEqual({
      ok: false,
      code: "AI_GOOGLE_CONFIGURATION_INCOMPLETE",
    });

    expect(resolveWebsiteGreeterProviderConfiguration({
      WEBSITE_GREETER_PROVIDER: "google_vertex_agent_engine",
      GOOGLE_CLOUD_PROJECT: "farmerbook-prod",
      GOOGLE_CLOUD_LOCATION: "asia-south1",
      GOOGLE_CLOUD_AGENT_ENGINE_ID: "1234567890123456",
      GOOGLE_CLOUD_WORKLOAD_IDENTITY_AUDIENCE:
        "//iam.googleapis.com/projects/123456789/locations/global/workloadIdentityPools/farmerbook-canary/providers/cloudflare-worker",
      GOOGLE_CLOUD_SERVICE_ACCOUNT_EMAIL:
        "greeter-runtime@farmerbook-prod.iam.gserviceaccount.com",
    })).toEqual({
      ok: true,
      configuration: {
        provider: "google_vertex_agent_engine",
        project: "farmerbook-prod",
        location: "asia-south1",
        agentEngineResource:
          "projects/farmerbook-prod/locations/asia-south1/reasoningEngines/1234567890123456",
        serviceEndpoint: "asia-south1-aiplatform.googleapis.com",
        workloadIdentityAudience:
          "//iam.googleapis.com/projects/123456789/locations/global/workloadIdentityPools/farmerbook-canary/providers/cloudflare-worker",
        serviceAccountEmail:
          "greeter-runtime@farmerbook-prod.iam.gserviceaccount.com",
        budgetModel: "google/vertex-agent-engine-canary",
        supportedLocales: WEBSITE_GREETER_RELEASE_LOCALES,
        authMode: "workload_identity_federation_via_service_binding",
      },
    });

    expect(resolveWebsiteGreeterProvider({
      WEBSITE_GREETER_PROVIDER: "google_vertex_agent_engine",
      GOOGLE_CLOUD_PROJECT: "farmerbook-prod",
      GOOGLE_CLOUD_LOCATION: "asia-south1",
      GOOGLE_CLOUD_AGENT_ENGINE_ID: "1234567890123456",
      GOOGLE_CLOUD_WORKLOAD_IDENTITY_AUDIENCE:
        "//iam.googleapis.com/projects/123456789/locations/global/workloadIdentityPools/farmerbook-canary/providers/cloudflare-worker",
      GOOGLE_CLOUD_SERVICE_ACCOUNT_EMAIL:
        "greeter-runtime@farmerbook-prod.iam.gserviceaccount.com",
    })).toEqual({
      ok: false,
      code: "AI_GOOGLE_IDENTITY_BROKER_UNAVAILABLE",
      providerId: "google_vertex_agent_engine",
    });
  });

  it("rejects unknown providers instead of silently rerouting messages", () => {
    expect(resolveWebsiteGreeterProviderConfiguration({
      WEBSITE_GREETER_PROVIDER: "some_proxy",
    })).toEqual({ ok: false, code: "AI_PROVIDER_INVALID" });
  });

  it("isolates Google to /chat and falls back before inference when it is not ready", () => {
    const base = {
      AI: { run: async () => ({ response: "Cloudflare answer" }) },
      AI_FLEET_BUDGET_AGENT: {} as never,
      WEBSITE_GREETER_GOOGLE_CANARY_ENABLED: "true",
      GOOGLE_CLOUD_PROJECT: "farmerbook-prod",
      GOOGLE_CLOUD_LOCATION: "asia-south1",
      GOOGLE_CLOUD_AGENT_ENGINE_ID: "1234567890123456",
      GOOGLE_CLOUD_WORKLOAD_IDENTITY_AUDIENCE:
        "//iam.googleapis.com/projects/123456789/locations/global/workloadIdentityPools/farmerbook-canary/providers/cloudflare-worker",
      GOOGLE_CLOUD_SERVICE_ACCOUNT_EMAIL:
        "greeter-runtime@farmerbook-prod.iam.gserviceaccount.com",
    };
    const site = resolveWebsiteGreeterProviderForSurface(base, "site_launcher");
    const notReadyCanary = resolveWebsiteGreeterProviderForSurface(
      base,
      "chat_canary",
    );
    const readyCanary = resolveWebsiteGreeterProviderForSurface({
      ...base,
      GOOGLE_IDENTITY_BROKER: {
        fetch: async () => new Response(null, { status: 503 }),
      },
    }, "chat_canary");

    expect(site.ok && site.provider.id).toBe("cloudflare_workers_ai");
    expect(notReadyCanary.ok && notReadyCanary.provider.id)
      .toBe("cloudflare_workers_ai");
    expect(readyCanary.ok && readyCanary.provider.id)
      .toBe("google_vertex_agent_engine");
  });

  it("serves common questions without a model call", () => {
    expect(approvedGreeterAnswer("How do I contact you?")?.text).toContain("ceo@farmerbook.in");
    expect(approvedGreeterAnswer("What about organic certification?")?.text).toContain(
      "Non-certified organic farmer (paperwork not yet completed to prove certification).",
    );
    expect(approvedGreeterAnswer("I want to buy produce")?.text)
      .toContain("Customers can browse");
  });

  it("serves approved Telugu and Hindi answers in native scripts", () => {
    expect(approvedGreeterAnswer(
      "నేను పంట ఉత్పత్తులు అమ్మాలనుకుంటున్నాను",
      "te-IN",
    )?.text).toContain("రైతులు");
    expect(approvedGreeterAnswer(
      "मैं उपज खरीदना चाहता हूँ",
      "hi-IN",
    )?.text).toContain("ग्राहक");
    expect(approvedGreeterAnswer(
      "నేను పంట ఉత్పత్తులు కొనాలనుకుంటున్నాను",
      "te-IN",
    )?.text).toContain("వినియోగదారులు");
    expect(approvedGreeterAnswer("How do I join?", "hi-IN")?.text)
      .toContain("जुड़ते समय");
  });

  it("limits chat UX to English, Telugu and Hindi native labels", () => {
    expect(WEBSITE_GREETER_LOCALE_OPTIONS).toEqual([
      { value: "en-IN", label: "English" },
      { value: "te-IN", label: "తెలుగు" },
      { value: "hi-IN", label: "हिन्दी" },
    ]);
    expect(websiteGreeterUiMessages("te-IN").welcome).toMatch(/[\u0C00-\u0C7F]/u);
    expect(websiteGreeterUiMessages("hi-IN").welcome).toMatch(/[\u0900-\u097F]/u);
  });

  it("detects supported browser and turn languages conservatively", () => {
    expect(detectWebsiteGreeterLocale({
      siteLocale: "ta-IN",
      browserLanguages: ["fr-FR", "te-IN", "en-US"],
    })).toBe("te-IN");
    expect(detectWebsiteGreeterLocale({
      siteLocale: "ta-IN",
      browserLanguages: ["fr-FR"],
    })).toBe(DEFAULT_WEBSITE_GREETER_LOCALE);
    expect(websiteGreeterLocaleFromText("నా పంటను అమ్మాలి")).toBe("te-IN");
    expect(websiteGreeterLocaleFromText("मुझे सहायता चाहिए")).toBe("hi-IN");
    expect(websiteGreeterLocaleFromText("Need help")).toBeNull();
  });

  it("accepts both Workers AI response shapes", () => {
    expect(aiText({ response: "Managed answer" })).toBe("Managed answer");
    expect(aiText({
      choices: [{ message: { content: "OpenAI-compatible answer" } }],
    })).toBe("OpenAI-compatible answer");
  });

  it("rejects oversized or malformed visitor messages", () => {
    expect(websiteGreeterRequestSchema.safeParse({
      sessionId: crypto.randomUUID(),
      message: "Hello",
      locale: "en-IN",
    }).success).toBe(true);
    expect(websiteGreeterRequestSchema.parse({
      sessionId: crypto.randomUUID(),
      message: "Hello",
    })).toMatchObject({
      locale: "en-IN",
      contextConsent: false,
    });
    expect(websiteGreeterRequestSchema.parse({
      sessionId: crypto.randomUUID(),
      message: "Remember this",
      contextConsent: true,
    }).contextConsent).toBe(true);
    expect(websiteGreeterRequestSchema.safeParse({
      sessionId: crypto.randomUUID(),
      message: "Canary question",
      surface: "chat_canary",
    }).success).toBe(false);
    expect(websiteGreeterClearRequestSchema.safeParse({
      sessionId: crypto.randomUUID(),
    }).success).toBe(true);
    expect(websiteGreeterRequestSchema.safeParse({
      sessionId: "not-a-session",
      message: "x".repeat(301),
      locale: "bad locale",
    }).success).toBe(false);
    expect(websiteGreeterRequestSchema.safeParse({
      sessionId: crypto.randomUUID(),
      message: "Bonjour",
      locale: "fr-FR",
    }).success).toBe(false);
  });

  it("accepts only a browser session and a safe page path for anonymous visits", () => {
    expect(websiteVisitRequestSchema.safeParse({
      sessionId: crypto.randomUUID(),
      path: "/featured-farmers/sravanamegham",
    }).success).toBe(true);
    expect(websiteVisitRequestSchema.safeParse({
      sessionId: crypto.randomUUID(),
      path: "https://example.com/steal-data",
    }).success).toBe(false);
  });

  it("routes follow-up requests through the consent intake", () => {
    const component = readFileSync("components/website-greeting-agent.tsx", "utf8");
    expect(component).toContain("/join?campaign=greeter");
    expect(websiteGreeterUiMessages("en-IN").privacy)
      .toBe("No personal details or message text are stored here.");
    expect(component).toContain("farmerbook-greeter-locale");
    expect(component).toContain("window.localStorage.setItem");
  });
});
