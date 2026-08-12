import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260809140000_outreach_agent.sql"),
  "utf8",
).toLowerCase();

describe("consent-first outreach migration", () => {
  it("creates a private normalized ledger with a default-off DB release control", () => {
    expect(sql).toContain("values ('outreach_agent', false)");
    for (const table of [
      "outreach_prospects",
      "outreach_contact_candidates",
      "outreach_consents",
      "outreach_outbox",
      "outreach_events",
      "outreach_suppressions",
      "outreach_agent_runs",
    ]) {
      expect(sql).toContain(`create table public.${table}`);
      expect(sql).toContain(`alter table public.${table} enable row level security`);
      expect(sql).toContain(`revoke all on table public.${table} from public, anon, authenticated`);
    }
    expect(sql).not.toMatch(/grant\s+(?:select|insert|update|delete)[^;]*\s+to\s+(?:anon|authenticated)/);
  });

  it("allows confirmation requests but requires active purpose-matched consent for introductions", () => {
    const guard = sql.match(
      /create or replace function public\.validate_outreach_outbox_consent[\s\S]*?\$\$;/,
    )?.[0];
    expect(guard).toContain("new.purpose = 'consent_confirmation'");
    expect(guard).toContain("public.has_active_outreach_consent");
    expect(guard).toContain("detail = 'consent_required'");
    expect(sql).toContain("unique (consent_id, purpose)");
    expect(sql).toContain("creation_fingerprint text not null");
    expect(sql).toContain("detail = 'idempotency_conflict'");
    const sourcedProspect = sql.match(
      /create or replace function public\.create_outreach_prospect[\s\S]*?\$\$;/,
    )?.[0];
    expect(sourcedProspect).not.toContain("insert into public.outreach_outbox");
  });

  it("binds verified receipts to the exact prospect, contact hash and contact id", () => {
    const consent = sql.match(
      /create or replace function public\.record_verified_outreach_consent[\s\S]*?\$\$;/,
    )?.[0];
    expect(consent).toContain("candidate.prospect_id = prospect_id_input");
    expect(consent).toContain("receipt_input ->> 'contactcandidateid'");
    expect(consent).toContain("candidate.value_hash = receipt_input ->> 'contacthash'");
    expect(consent).toContain("contact_suppressed");
  });

  it("claims with skip-locked and records provider outcomes transactionally", () => {
    expect(sql).toContain("for update skip locked");
    expect(sql).toContain("attempts < 5");
    expect(sql).toContain("function public.record_outreach_delivery_result(");
    expect(sql).toContain("provider receipt is required");
    expect(sql).toContain("then now() + make_interval");
    expect(sql).toContain("'delivery_failed'");
  });

  it("withdraws consent, cancels pending work, removes usable contact values and suppresses hashes", () => {
    const withdrawal = sql.match(
      /create or replace function public\.withdraw_outreach_consent[\s\S]*?\$\$;/,
    )?.[0];
    expect(withdrawal).toContain("withdrawn_at = coalesce(withdrawn_at, now())");
    expect(withdrawal).toContain("insert into public.outreach_suppressions");
    expect(withdrawal).toContain("set state = 'cancelled'");
    expect(withdrawal).toContain("set private_value = '[withdrawn]'");
  });

  it("keeps follow-up consent separate and purges only expired unconsented research", () => {
    expect(sql).toContain("followup_requested boolean not null default false");
    expect(sql).toContain("purpose_value = 'onboarding_followup'");
    const followups = sql.match(
      /create or replace function public\.schedule_due_outreach_followups[\s\S]*?\$\$;/,
    )?.[0];
    expect(followups).toContain("prospect.followup_requested");
    expect(followups).toContain("consent.purpose = 'onboarding_followup'");
    expect(followups).toContain("one consented onboarding follow-up was queued");
    expect(followups).toContain(
      "on conflict on constraint outreach_outbox_consent_id_purpose_key do nothing",
    );
    const purge = sql.match(
      /create or replace function public\.purge_expired_outreach_research[\s\S]*?\$\$;/,
    )?.[0];
    expect(purge).toContain("prospect.consent_granted_at is null");
    expect(purge).toContain("not exists (");
    expect(purge).toContain("from public.outreach_consents consent");
    expect(sql).toContain("grant execute on function public.purge_expired_outreach_research(integer)");
  });
});
