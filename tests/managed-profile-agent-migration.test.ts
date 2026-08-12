import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  "supabase/migrations/20260811130000_managed_farmer_profile_agents.sql",
  "utf8",
).toLowerCase();

describe("managed Farmer profile agent migration", () => {
  it("creates private samples, provenance, verification claims and a disabled release control", () => {
    expect(sql).toContain("values ('profile_research_agents', false)");
    expect(sql).toContain("'inc_sourcing'");
    expect(sql).toContain("create table public.managed_profile_samples");
    expect(sql).toContain("create table public.managed_profile_sample_sources");
    expect(sql).toContain("create table public.managed_profile_search_requests");
    expect(sql).toContain("create table public.profile_verification_claims");
    for (const table of [
      "managed_profile_samples",
      "managed_profile_sample_sources",
      "managed_profile_search_requests",
      "profile_verification_claims",
    ]) {
      expect(sql).toContain(`alter table public.${table} enable row level security`);
    }
    expect(sql).toMatch(
      /revoke all on public\.managed_profile_samples,[\s\S]*?from public, anon, authenticated/,
    );
  });

  it("records approved-search provenance and enforces idempotent cost caps", () => {
    expect(sql).toContain("discovery_provider = 'brave_search'");
    expect(sql).toContain("usage_rights_basis = 'provider_storage_plan'");
    expect(sql).toContain("function public.reserve_managed_profile_search");
    expect(sql).toContain("function public.complete_managed_profile_search");
    expect(sql).toContain("select count(*) >= 25");
    expect(sql).toContain("select count(*) >= 250");
    expect(sql).toContain("request.requested_by = actor_id");
    expect(sql).toContain("search_quota_exceeded");
    expect(sql).toMatch(
      /grant execute on function public\.reserve_managed_profile_search\(text, uuid\)[\s\S]*?to authenticated/,
    );
  });

  it("keeps preview and decisions behind service-role functions and signed invitations", () => {
    expect(sql).toContain("function public.get_managed_profile_sample_preview");
    expect(sql).toContain("function public.decide_managed_profile_sample");
    expect(sql).toContain("invitation.token_hash = token_hash_input");
    expect(sql).toContain("invitation.expires_at > now()");
    expect(sql).toContain("service_role_required");
    expect(sql).toContain("active_consent_required");
    expect(sql).toContain("public.has_active_outreach_consent(");
    expect(sql).toMatch(
      /grant execute on function public\.get_managed_profile_sample_preview\(text\)[\s\S]*?to service_role/,
    );
  });

  it("enforces the approved verification access levels only after rollout", () => {
    expect(sql).toContain("function public.can_profile_message");
    expect(sql).toContain("function public.can_profile_publish_produce");
    expect(sql).toContain("function public.can_create_rate_limited_post");
    expect(sql).toContain("contact_verification_required");
    expect(sql).toContain("'farmer_role'");
    expect(sql).toContain("count(*) < 6");
    expect(sql).toContain(
      "not public.is_ecosystem_release_enabled('profile_research_agents')",
    );
  });

  it("links only an approved sample and records contact proof on invitation redemption", () => {
    const trigger = sql.match(
      /create or replace function public\.link_approved_sample_after_invitation\(\)[\s\S]*?\$\$;/,
    )?.[0];
    expect(trigger).toContain("sample.state = 'approved'");
    expect(trigger).toContain("claim_type");
    expect(trigger).toContain("'contact'");
    expect(trigger).toContain("returning sample.sample_data into sample_data_value");
    expect(trigger).toContain("profile.website_url is null");
    expect(sql).toContain("after insert on public.outreach_account_links");
  });

  it("exposes only current safe claim metadata and gates onboarding prefill", () => {
    expect(sql).toMatch(
      /create view public\.public_profile_verification_claims\s+with \(security_barrier = true\) as/,
    );
    expect(sql).not.toContain("create view public.public_profile_verification_claims\nwith (security_invoker = true)");
    expect(sql).toMatch(
      /function public\.get_claimed_managed_profile_sample\(\)[\s\S]*?is_ecosystem_release_enabled\('profile_research_agents'\)/,
    );
  });
});
