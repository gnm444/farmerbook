import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  "supabase/migrations/20260810130000_outreach_email_provider.sql",
  "utf8",
).toLowerCase();

describe("outreach email provider migration", () => {
  it("records introduction and optional follow-up consent in one transaction", () => {
    expect(sql).toContain("record_verified_email_double_opt_in");
    expect(sql.match(/record_verified_outreach_consent/g)).toHaveLength(2);
    expect(sql).toContain("farmerbook_introduction");
    expect(sql).toContain("onboarding_followup");
  });

  it("keeps the completion RPC service-only", () => {
    expect(sql).toMatch(
      /revoke all on function public\.record_verified_email_double_opt_in[\s\S]*?from public, anon, authenticated/,
    );
    expect(sql).toMatch(
      /grant execute on function public\.record_verified_email_double_opt_in[\s\S]*?to service_role/,
    );
    expect(sql).not.toMatch(
      /grant execute on function public\.record_verified_email_double_opt_in[\s\S]*?to (anon|authenticated)/,
    );
  });
});
