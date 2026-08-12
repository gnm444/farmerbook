import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const runbook = readFileSync(
  resolve(process.cwd(), "docs/PRODUCTION_RUNBOOK.md"),
  "utf8",
);

describe("production runbook release controls", () => {
  it("separates environments, secrets, and disabled-by-default flags", () => {
    expect(runbook).toContain("Local, staging, and production must not share");
    expect(runbook).toContain("NEXT_PUBLIC_DEMO_MODE");
    expect(runbook).toContain("Must be `false`");
    expect(runbook).toContain("SUPABASE_SERVICE_ROLE_KEY");

    for (const flag of [
      "ENABLE_CANONICAL_AGRICULTURE_TAXONOMY",
      "ENABLE_RESUMABLE_ONBOARDING",
      "ENABLE_AGRI_BUSINESSES",
      "ENABLE_BUSINESS_OFFERS",
      "ENABLE_EXTENDED_LOCALES",
      "ENABLE_OUTREACH_AGENT",
      "ENABLE_PROFILE_RESEARCH_AGENT",
    ]) {
      expect(runbook).toContain(flag);
    }
  });

  it("requires inventory, restore, executable data gates, and separate approval", () => {
    expect(runbook).toContain("supabase migration list --linked");
    expect(runbook).toContain("shasum -a 256");
    expect(runbook).toContain("supabase db reset");
    expect(runbook).toContain("supabase test db");
    expect(runbook).toContain("npm run test:e2e:configured");
    expect(runbook).toContain("Storage object export and restore proof");
    expect(runbook).toContain("## 9. Separate production release approval");
  });

  it("keeps dry run, deployment, release versions, and rollback distinct", () => {
    expect(runbook).toMatch(/wrangler deploy[\s\S]*--dry-run/);
    expect(runbook).toContain("## 10. Release A");
    expect(runbook).toContain("## 11. Release B");
    expect(runbook).toContain("## 12. Release C");
    expect(runbook).toContain("wrangler versions list");
    expect(runbook).toContain("wrangler rollback");
    expect(runbook).toContain("PREVIOUS_HEALTHY_WORKER_VERSION_ID");
    expect(runbook).toContain("forward migration");
    expect(runbook).toContain("do not drop new tables");
  });

  it("coordinates private database controls with Worker rollout and rollback", () => {
    expect(runbook).toContain("public.ecosystem_release_controls");
    expect(runbook).toContain("select control_key, enabled, updated_at");
    expect(runbook).toContain("Never enable all controls as a convenience");

    for (const control of [
      "extended_locales",
      "resumable_onboarding",
      "agri_businesses",
      "business_offers",
      "outreach_agent",
      "profile_research_agents",
    ]) {
      expect(runbook).toContain(control);
    }

    expect(runbook).toMatch(
      /set `business_offers`[\s\S]*to `false` first[\s\S]*`agri_businesses` to `false`/,
    );
  });

  it("leaves operational policy values explicitly unresolved", () => {
    expect(runbook).toContain("**REQUIRED:** backup frequency");
    expect(runbook).toContain("**REQUIRED:** identity of the deletion/privacy request owner");
    expect(runbook).toContain("**REQUIRED:** 24/7 or pilot-hours incident contact");
    expect(runbook).toContain(
      "An unresolved `REQUIRED` entry is a failed production gate.",
    );
  });

  it("keeps autonomous outreach behind consent, provider and rollback gates", () => {
    expect(runbook).toContain("## 12A. Consent-first acquisition agent");
    expect(runbook).toMatch(/Public\s+contact details are never permission/);
    expect(runbook).toContain("OUTREACH_PROCESSOR_SECRET");
    expect(runbook).toContain("set the private `outreach_agent` control to `false`");
    expect(runbook).toMatch(/Do not\s+delete suppression hashes/);
  });

  it("keeps private profile generation behind approval and claim-specific gates", () => {
    expect(runbook).toContain("## 12B. Managed private Farmer-profile Agent");
    expect(runbook).toContain("farmer-profile-agent-v1");
    expect(runbook).toMatch(/fewer than six posts per\s+hour/);
    expect(runbook).toContain("Farmer role verified");
    expect(runbook).toContain("profile_research_agents=false");
    expect(runbook).toContain("`routeAgentRequest`");
  });
});
