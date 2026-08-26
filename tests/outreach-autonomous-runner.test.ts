import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const processor = readFileSync("features/outreach/processor.ts", "utf8");
const managed = readFileSync("features/managed-agents/processor.ts", "utf8");
const dedicated = readFileSync("app/api/outreach/process/route.ts", "utf8");

describe("autonomous consented-outreach runners", () => {
  it("uses the same fail-closed readiness policy for both private entry points", () => {
    expect(managed).toContain("evaluateOutreachAutonomyReadiness");
    expect(managed).toContain('processor: "managed_agent"');
    expect(dedicated).toContain("evaluateOutreachAutonomyReadiness");
    expect(dedicated).toContain('processor: "dedicated_route"');
    expect(managed).toContain("pause_outreach_delivery_automatically");
    expect(dedicated).toContain("pause_outreach_delivery_automatically");
  });

  it("reauthorizes after claim and immediately before the provider boundary", () => {
    expect(processor.match(/authorize_outreach_dispatch/g)).toHaveLength(2);
    const finalCheck = processor.indexOf("finalAuthorizationResult");
    const providerCall = processor.indexOf("options.provider.requestConsent");
    expect(finalCheck).toBeGreaterThan(0);
    expect(providerCall).toBeGreaterThan(finalCheck);
  });

  it("automatically stops unknown outcomes and the three-failure circuit", () => {
    expect(processor).toContain('code === "POSTMARK_DELIVERY_UNKNOWN"');
    expect(processor).toContain("consecutiveFailures >= 3");
    expect(processor).toContain('"PROVIDER_CIRCUIT_OPEN"');
    expect(processor).toContain("pause_outreach_delivery_automatically");
  });
});
