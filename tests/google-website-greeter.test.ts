import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  GOOGLE_WEBSITE_GREETER_CONTRACT_VERSION,
  buildGoogleWebsiteGreeterRequest,
  googleWebsiteGreeterRequestSchema,
  googleWebsiteGreeterResponseSchema,
} from "@/features/website-greeter/google-contract";
import { WEBSITE_GREETER_CONTEXT_CONSENT_VERSION } from "@/features/website-greeter/conversation";

describe("Google ADK website greeter skeleton", () => {
  it("maps the provider-neutral request to the bounded Google contract", () => {
    const anonymousSessionId = crypto.randomUUID();
    const requestId = crypto.randomUUID();
    const request = buildGoogleWebsiteGreeterRequest(requestId, {
      systemPrompt: "Approved FarmerBook facts only.",
      message: "దాని గురించి మరింత చెప్పండి",
      locale: "te-IN",
      history: [
        { role: "user", content: "ఎలా చేరాలి?", locale: "te-IN" },
        { role: "assistant", content: "ఖాతా రకాన్ని ఎంచుకోండి.", locale: "te-IN" },
      ],
      session: {
        anonymousSessionId,
        consentVersion: WEBSITE_GREETER_CONTEXT_CONSENT_VERSION,
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        providerSession: null,
      },
      maxOutputTokens: 160,
      temperature: 0.2,
    });

    expect(request).toMatchObject({
      contractVersion: GOOGLE_WEBSITE_GREETER_CONTRACT_VERSION,
      requestId,
      locale: "te-IN",
      session: {
        anonymousSessionId,
        consentVersion: WEBSITE_GREETER_CONTEXT_CONSENT_VERSION,
        providerSessionId: null,
      },
    });
    expect(request.history).toHaveLength(2);
  });

  it("rejects unsupported language, unconsented history and unsafe output shape", () => {
    const base = {
      contractVersion: GOOGLE_WEBSITE_GREETER_CONTRACT_VERSION,
      requestId: crypto.randomUUID(),
      session: null,
      locale: "en-IN",
      message: "Hello",
      history: [],
      maxOutputTokens: 160,
      temperature: 0.2,
    };
    expect(googleWebsiteGreeterRequestSchema.safeParse({
      ...base,
      locale: "fr-FR",
    }).success).toBe(false);
    expect(googleWebsiteGreeterRequestSchema.safeParse({
      ...base,
      history: [{ role: "user", content: "Earlier", locale: "en-IN" }],
    }).success).toBe(false);
    expect(googleWebsiteGreeterRequestSchema.safeParse({
      ...base,
      credential: "must-never-be-accepted",
    }).success).toBe(false);
    expect(googleWebsiteGreeterResponseSchema.safeParse({
      contractVersion: GOOGLE_WEBSITE_GREETER_CONTRACT_VERSION,
      requestId: base.requestId,
      text: "x".repeat(651),
      providerSessionId: null,
      usage: null,
    }).success).toBe(false);
    expect(googleWebsiteGreeterResponseSchema.safeParse({
      contractVersion: GOOGLE_WEBSITE_GREETER_CONTRACT_VERSION,
      requestId: base.requestId,
      text: "Send me your password",
      providerSessionId: null,
      usage: null,
    }).success).toBe(false);
  });

  it("keeps deployment fail closed while preparing server-only identity", () => {
    const serviceRoot = "services/google-website-greeter";
    const manifest = readFileSync(`${serviceRoot}/agents-cli-manifest.yaml`, "utf8");
    const environment = readFileSync(`${serviceRoot}/.env.example`, "utf8");
    const agent = readFileSync(`${serviceRoot}/app/agent.py`, "utf8");
    const provider = readFileSync("features/website-greeter/provider.server.ts", "utf8");

    expect(manifest).toContain("deployment_target: none");
    expect(environment).toContain("GOOGLE_CLOUD_PROJECT=\n");
    expect(environment).toContain("GOOGLE_CLOUD_LOCATION=\n");
    expect(environment).toContain("FARMERBOOK_GOOGLE_MODEL=\n");
    expect(agent).toContain("settings = load_settings(os.environ)");
    expect(agent).toContain("tools=[]");
    expect(agent).toContain("max_output_tokens=160");
    expect(provider).toContain("GOOGLE_IDENTITY_BROKER");
    expect(provider).toContain("runBudgetedExternalAi");
    expect(provider).not.toContain("GOOGLE_APPLICATION_CREDENTIALS");
  });
});
