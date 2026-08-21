import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260819130000_outreach_cleanup_compatibility.sql",
  ),
  "utf8",
).toLowerCase();

describe("outreach cleanup production compatibility", () => {
  it("installs the bounded service-only cleanup required by the managed worker", () => {
    expect(sql).toContain(
      "create or replace function public.purge_expired_outreach_research(",
    );
    expect(sql).toContain("prospect.retention_expires_at <= now()");
    expect(sql).toContain("prospect.consent_granted_at is null");
    expect(sql).toContain("from public.outreach_consents consent");
    expect(sql).toContain("for update skip locked");
    expect(sql).toContain(
      "revoke all on function public.purge_expired_outreach_research(integer)",
    );
    expect(sql).toContain(
      "grant execute on function public.purge_expired_outreach_research(integer)",
    );
    expect(sql).toContain("to service_role");
    expect(sql).not.toMatch(/grant execute[\s\S]*?to\s+(?:anon|authenticated)/);
  });
});
