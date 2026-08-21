import { describe, expect, it } from "vitest";
import { evaluateOutreachAutonomyReadiness } from "@/features/outreach/autonomous-readiness";

const configuredEnvironment = {
  ENABLE_OUTREACH_AGENT: "true",
  NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-key-value",
  SUPABASE_SERVICE_ROLE_KEY: "s".repeat(32),
  MANAGED_AGENT_PROCESSOR_SECRET: "m".repeat(48),
  OUTREACH_PROCESSOR_SECRET: "p".repeat(48),
  OUTREACH_CONSENT_SIGNING_SECRET: "c".repeat(48),
  OUTREACH_INVITATION_SIGNING_SECRET: "i".repeat(48),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: "turnstile-site-key",
  TURNSTILE_SECRET_KEY: "turnstile-secret",
  OUTREACH_PROVIDER_KIND: "postmark",
  POSTMARK_BROADCAST_MESSAGE_STREAM: "farmerbook-broadcast",
};

describe("autonomous consented-outreach readiness", () => {
  it("accepts the complete managed-Agent prerequisite set", () => {
    expect(evaluateOutreachAutonomyReadiness({
      environment: configuredEnvironment,
      providerConfigured: true,
      processor: "managed_agent",
    })).toEqual({
      ready: true,
      code: "OUTREACH_AUTONOMY_READY",
      action: "All repository-verifiable consented-delivery prerequisites are present.",
    });
  });

  it("checks the bearer for the selected processor path", () => {
    expect(evaluateOutreachAutonomyReadiness({
      environment: {
        ...configuredEnvironment,
        OUTREACH_PROCESSOR_SECRET: "",
      },
      providerConfigured: true,
      processor: "dedicated_route",
    }).code).toBe("OUTREACH_PROCESSOR_SECRET_NOT_CONFIGURED");
    expect(evaluateOutreachAutonomyReadiness({
      environment: {
        ...configuredEnvironment,
        MANAGED_AGENT_PROCESSOR_SECRET: "",
      },
      providerConfigured: true,
      processor: "managed_agent",
    }).code).toBe("OUTREACH_PROCESSOR_SECRET_NOT_CONFIGURED");
  });

  it.each([
    ["ENABLE_OUTREACH_AGENT", "false", "OUTREACH_FEATURE_DISABLED"],
    ["SUPABASE_SERVICE_ROLE_KEY", "", "OUTREACH_SERVICE_ROLE_NOT_CONFIGURED"],
    ["OUTREACH_CONSENT_SIGNING_SECRET", "", "OUTREACH_CONSENT_SIGNING_NOT_CONFIGURED"],
    ["OUTREACH_INVITATION_SIGNING_SECRET", "", "OUTREACH_INVITATION_SIGNING_NOT_CONFIGURED"],
    ["TURNSTILE_SECRET_KEY", "", "OUTREACH_TURNSTILE_NOT_CONFIGURED"],
    ["OUTREACH_PROVIDER_KIND", "http", "OUTREACH_PROVIDER_KIND_NOT_CONFIGURED"],
    ["POSTMARK_BROADCAST_MESSAGE_STREAM", "", "OUTREACH_BROADCAST_STREAM_NOT_CONFIGURED"],
  ] as const)("fails closed when %s is missing", (name, value, code) => {
    expect(evaluateOutreachAutonomyReadiness({
      environment: { ...configuredEnvironment, [name]: value },
      providerConfigured: true,
      processor: "managed_agent",
    })).toMatchObject({ ready: false, code });
  });

  it("reports the configured provider as the final readiness boundary", () => {
    expect(evaluateOutreachAutonomyReadiness({
      environment: configuredEnvironment,
      providerConfigured: false,
      processor: "managed_agent",
    })).toMatchObject({
      ready: false,
      code: "OUTREACH_PROVIDER_NOT_CONFIGURED",
    });
  });
});
