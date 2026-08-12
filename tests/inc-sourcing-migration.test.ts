import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const raw = readFileSync(resolve(process.cwd(), "supabase/migrations/20260811120000_inc_sourcing.sql"), "utf8");
const sql = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/--[^\n\r]*/g, "").toLowerCase();

describe("Inc sourcing migration", () => {
  it("creates structured requests, private responses, claim records and immutable events", () => {
    for (const table of [
      "organization_verification_claims",
      "inc_sourcing_requests",
      "inc_sourcing_request_categories",
      "inc_sourcing_request_events",
      "inc_sourcing_responses",
    ]) expect(sql).toContain(`create table public.${table}`);
    expect(sql).toContain("inc_sourcing_request_events_immutable");
    expect(sql).toContain("public.prevent_immutable_row_change()");
    expect(sql).toContain("request_snapshot jsonb not null");
    expect(sql).toContain("unique (farmer_id, sourcing_request_id, idempotency_key)");
  });

  it("defaults the independent database release control off", () => {
    expect(sql).toContain("values ('inc_sourcing', false)");
    expect(sql).toContain("'outreach_agent'");
    for (const functionName of ["create_inc_sourcing_request", "set_inc_sourcing_request_publication", "respond_to_inc_sourcing_request"]) {
      const definition = sql.match(new RegExp(`create or replace function public\\.${functionName}[\\s\\S]*?\\$\\$;`))?.[0];
      expect(definition).toContain("public.is_ecosystem_release_enabled('inc_sourcing')");
    }
  });

  it("blocks publication without exact organization, representative and relevant facility claims", () => {
    const publish = sql.match(/create or replace function public\.can_publish_inc_sourcing[\s\S]*?\$\$;/)?.[0];
    expect(publish).toContain("organization.publication_state = 'published'");
    expect(publish).toContain("organization.verification_state = 'verified'");
    expect(publish).toContain("'organization_registration'");
    expect(publish).toContain("'authorized_representative'");
    expect(publish).toContain("'industry_licence'");
    expect(publish).toContain("'facility_registration'");
    const currentClaim = sql.match(/create or replace function public\.has_current_organization_claim[\s\S]*?\$\$;/)?.[0];
    expect(currentClaim).toContain("claim.expires_at > now()");
    expect(currentClaim).toContain("claim.revoked_at is null");
  });

  it("keeps evidence private while exposing only disclosed current claim labels", () => {
    expect(sql).toContain("with (security_invoker = true)");
    const view = sql.match(/create view public\.public_organization_verification_claims[\s\S]*?;/)?.[0];
    expect(view).toContain("state = 'verified'");
    expect(view).toContain("public_disclosure");
    expect(view).not.toContain("evidence_path");
    expect(view).not.toContain("provider_receipt_hash");
    expect(sql).not.toMatch(/grant\s+select[\s\S]{0,180}\bevidence_path\b[\s\S]{0,180}to anon/);
  });

  it("allows only active Farmers to respond and rejects self-responses", () => {
    const respond = sql.match(/create or replace function public\.respond_to_inc_sourcing_request[\s\S]*?\$\$;/)?.[0];
    expect(respond).toContain("profile.account_role = 'farmer'");
    expect(respond).toContain("profile.status = 'active'");
    expect(respond).toContain("profile.onboarding_complete");
    expect(respond).toContain("inc_sourcing_self_response");
    expect(respond).toContain("current_date between request.opens_on and request.closes_on");
  });

  it("does not grant private claims, events or responses to anonymous callers", () => {
    expect(sql).not.toMatch(/grant\s+select[\s\S]{0,220}on public\.inc_sourcing_responses to anon/);
    expect(sql).not.toMatch(/grant\s+select[\s\S]{0,220}on public\.inc_sourcing_request_events to anon/);
    expect(sql).not.toContain("grant execute on function public.has_current_organization_claim(uuid, text, text) to anon");
  });
});
