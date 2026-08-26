import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { COMPANY_AGENT_ROLES } from "@/features/managed-agents/contracts";

describe("AI company control-plane migration", () => {
  const sql = readFileSync(
    "supabase/migrations/20260819120000_ai_company_control_plane.sql",
    "utf8",
  );

  it("adds fifteen default-paused roles behind a separate release control", () => {
    expect(sql).toContain("values ('ai_company', false)");
    for (const role of COMPANY_AGENT_ROLES) expect(sql).toContain(`'${role}'`);
    expect(sql).toContain("not public.is_ecosystem_release_enabled('ai_company')");
    expect(sql).toContain("not public.is_ecosystem_release_enabled('managed_operations_agents')");
  });

  it("stores only aggregate snapshots and reviewable proposals", () => {
    expect(sql).toContain("create table public.company_kpi_snapshots");
    expect(sql).toContain("create table public.company_agent_proposals");
    expect(sql).toContain("company-metrics-v1");
    expect(sql).toContain("company-policy-v1");
    expect(sql).toContain("activeListingsWithoutEnquiries");
    expect(sql).not.toMatch(/select[\s\S]{0,80}(full_name|email|phone|question|body)/i);
  });

  it("keeps creation service-only and review administrator-only", () => {
    expect(sql).toMatch(/grant execute on function public\.record_ai_company_snapshot\(uuid, uuid\)[\s\S]*to service_role/);
    expect(sql).toMatch(/grant execute on function public\.record_ai_company_proposal\([\s\S]*to service_role/);
    expect(sql).toMatch(/create or replace function public\.review_ai_company_proposal[\s\S]*not public\.is_admin\(\)/);
    expect(sql).toMatch(/grant execute on function public\.review_ai_company_proposal\([\s\S]*to authenticated/);
    expect(sql).toMatch(/create or replace function public\.ai_company_control_status\(\)[\s\S]*not public\.is_admin\(\)/);
    expect(sql).toMatch(/grant execute on function public\.ai_company_control_status\(\)[\s\S]*to authenticated/);
  });

  it("protects tables, immutable events, revisions and idempotency", () => {
    for (const table of [
      "company_objectives",
      "company_kpi_snapshots",
      "company_agent_proposals",
      "company_agent_proposal_events",
    ]) expect(sql).toContain(`alter table public.${table} enable row level security`);
    expect(sql).toContain("company_agent_proposal_events_are_immutable");
    expect(sql).toContain("REVISION_CONFLICT");
    expect(sql).toContain("IDEMPOTENCY_CONFLICT");
  });

  it("cannot execute a reviewed proposal or mutate product and trust records", () => {
    const review = sql.slice(
      sql.indexOf("create or replace function public.review_ai_company_proposal"),
      sql.indexOf("create or replace function public.list_ai_company_objectives"),
    );
    expect(review).not.toMatch(/update public\.(profiles|produce_listings|reports|messages|profile_verification_claims)/i);
    expect(review).not.toMatch(/insert into public\.(outreach_outbox|messages|moderation_actions)/i);
  });
});
