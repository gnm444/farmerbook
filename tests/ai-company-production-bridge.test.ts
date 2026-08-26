import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("AI company production compatibility bridge", () => {
  const bridge = readFileSync(
    "supabase/migrations/20260819110000_ai_company_production_bridge.sql",
    "utf8",
  );
  const company = readFileSync(
    "supabase/migrations/20260819120000_ai_company_control_plane.sql",
    "utf8",
  );

  it("creates only the private managed run ledger and keeps it disabled", () => {
    expect(bridge).toContain("values ('managed_operations_agents', false)");
    for (const table of [
      "managed_operations_agents",
      "managed_operations_agent_runs",
      "managed_operations_agent_events",
    ]) {
      expect(bridge).toContain(`create table if not exists public.${table}`);
      expect(bridge).toContain(`alter table public.${table} enable row level security`);
    }
    expect(bridge).not.toContain("create table if not exists public.profile_verification_claims");
    expect(bridge).not.toContain("create table if not exists public.support_cases");
    expect(bridge).not.toContain("create table if not exists public.outreach_prospects");
  });

  it("provides the service run lease and administrator observability required by the fleet", () => {
    expect(bridge).toContain("create or replace function public.begin_managed_operations_agent_run");
    expect(bridge).toContain("create or replace function public.finish_managed_operations_agent_run");
    expect(bridge).toContain("create or replace function public.managed_operations_agent_dashboard");
    expect(bridge).toContain("create or replace function public.list_managed_operations_agent_runs");
    expect(bridge).toMatch(/begin_managed_operations_agent_run\([\s\S]*to service_role/);
    expect(bridge).toMatch(/managed_operations_agent_dashboard\(\)[\s\S]*to authenticated/);
  });

  it("treats separately gated support tables as zero aggregates when absent", () => {
    expect(company).toContain("pg_catalog.to_regclass('public.support_cases')");
    expect(company).toContain("pg_catalog.to_regclass('public.agent_action_proposals')");
    expect(company).toContain("open_support_cases_value bigint := 0");
    expect(company).toContain("pending_action_proposals_value bigint := 0");
  });
});
