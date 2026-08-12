import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260810110000_outreach_provider_lifecycle.sql",
  ),
  "utf8",
).toLowerCase();

describe("verified outreach provider lifecycle migration", () => {
  it("stores bounded classifications but no raw reply body", () => {
    expect(sql).toContain("create table public.outreach_provider_events");
    expect(sql).toContain("reply_intent text");
    expect(sql).toContain("question_code text");
    expect(sql).not.toContain("message_text");
    expect(sql).not.toContain("reply_body");
    expect(sql).toContain("unique (provider, provider_event_id)");
  });

  it("binds every event to the exact prospect, contact hash, contact id and channel", () => {
    const record = sql.match(
      /create or replace function public\.record_outreach_provider_event[\s\S]*?\$\$;/,
    )?.[0];
    expect(record).toContain("candidate.prospect_id = prospect_id_input");
    expect(record).toContain("candidate.value_hash = event_input ->> 'contacthash'");
    expect(record).toContain("candidate.channel = 'email'");
    expect(record).toContain("for update");
    expect(record).toContain("idempotent_replay");
  });

  it("suppresses terminal events and stops all pending automation", () => {
    const record = sql.match(
      /create or replace function public\.record_outreach_provider_event[\s\S]*?\$\$;/,
    )?.[0];
    expect(record).toContain("suppression_reason := 'complaint'");
    expect(record).toContain("suppression_reason := 'hard_bounce'");
    expect(record).toContain("reply_intent_value = 'stop'");
    expect(record).toContain("insert into public.outreach_suppressions");
    expect(record).toContain("set state = 'cancelled'");
    expect(record).toContain("set private_value = case");
  });

  it("allows one bounded reply only for a verified inbound onboarding question", () => {
    expect(sql).toContain("purpose = 'onboarding_reply'");
    expect(sql).toContain("outreach_outbox_one_inbound_reply_idx");
    const guard = sql.match(
      /create or replace function public\.validate_outreach_outbox_consent[\s\S]*?\$\$;/,
    )?.[0];
    expect(guard).toContain("reply_authorization_required");
    expect(guard).toContain("provider_event.reply_intent = 'onboarding_question'");
    expect(guard).toContain("provider_event.response_requested");
    expect(sql).toContain("reply stop at any time");
  });

  it("keeps provider lifecycle data private", () => {
    expect(sql).toContain(
      "alter table public.outreach_provider_events enable row level security",
    );
    expect(sql).toContain("revoke all on table public.outreach_provider_events");
    expect(sql).not.toMatch(
      /grant\s+(?:select|insert|update|delete)[^;]*\s+to\s+(?:anon|authenticated)/,
    );
  });
});
