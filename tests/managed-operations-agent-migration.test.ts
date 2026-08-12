import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("managed operations agent migration", () => {
  const sql = readFileSync(
    "supabase/migrations/20260812130000_managed_operations_agents.sql",
    "utf8",
  );

  it("creates a private default-off four-role fleet", () => {
    expect(sql).toContain("values ('managed_operations_agents', false)");
    for (const role of [
      "outreach_growth",
      "profile_drafting",
      "verification_triage",
      "operations_supervisor",
    ]) expect(sql).toContain(`'${role}'`);
    expect(sql).toContain("alter table public.managed_operations_agents enable row level security");
    expect(sql).toMatch(/revoke all on table public\.managed_operations_agents,[\s\S]*from public, anon, authenticated/);
  });

  it("lets administrators configure and inspect but keeps execution service-only", () => {
    expect(sql).toMatch(/grant execute on function public\.configure_managed_operations_agent\([\s\S]*to authenticated/);
    expect(sql).toMatch(/grant execute on function public\.managed_operations_agent_dashboard\(\)[\s\S]*to authenticated/);
    expect(sql).toMatch(/grant execute on function public\.begin_managed_operations_agent_run\([\s\S]*to service_role/);
    expect(sql).toMatch(/grant execute on function public\.finish_managed_operations_agent_run\(uuid, jsonb\)[\s\S]*to service_role/);
  });

  it("provides leases, idempotency, immutable events and automatic pause", () => {
    expect(sql).toContain("idempotency_key uuid not null unique");
    expect(sql).toContain("RUN_ALREADY_ACTIVE");
    expect(sql).toContain("managed_operations_agent_events_are_immutable");
    expect(sql).toContain("Automatically paused after three consecutive unsuccessful runs.");
    expect(sql).toContain("new_failures < 3");
  });

  it("records verification recommendations without awarding a badge", () => {
    expect(sql).toContain("create table public.managed_verification_triage");
    expect(sql).toContain("record_managed_verification_triage");
    const triageFunction = sql.slice(
      sql.indexOf("create or replace function public.record_managed_verification_triage"),
      sql.indexOf("create or replace function public.managed_operations_agent_dashboard"),
    );
    expect(triageFunction).not.toMatch(/update public\.profile_verification_claims/i);
    expect(triageFunction).not.toMatch(/state\s*=\s*'verified'/i);
  });
});
