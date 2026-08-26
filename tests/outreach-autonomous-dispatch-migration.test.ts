import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/20260822120000_autonomous_outreach_dispatch.sql",
  "utf8",
);

describe("autonomous consented-outreach dispatch migration", () => {
  it("adds a final service-only dispatch authorization", () => {
    expect(migration).toContain("authorize_outreach_dispatch");
    expect(migration).toContain("has_active_outreach_consent");
    expect(migration).toContain("has_active_outreach_reply_authorization");
    expect(migration).toContain("SUPPRESSED_BEFORE_DISPATCH");
    expect(migration).toContain("grant execute on function public.authorize_outreach_dispatch(uuid)\n  to service_role");
    expect(migration).toContain("from public, anon, authenticated");
  });

  it("serializes and conservatively caps India-calendar reservations", () => {
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("daily_delivery_limit integer not null default 25");
    expect(migration).toContain("time zone 'Asia/Kolkata'");
    expect(migration).toContain("DAILY_DELIVERY_LIMIT_REACHED");
    expect(migration).toContain("where dispatch_check.authorized");
  });

  it("keeps redacted evidence immutable and browser-inaccessible", () => {
    expect(migration).toContain("create table if not exists public.outreach_dispatch_checks");
    expect(migration).toContain("create table if not exists public.outreach_automatic_events");
    const dispatchTable = migration.match(
      /create table if not exists public\.outreach_dispatch_checks[\s\S]*?\n\);/,
    )?.[0];
    expect(dispatchTable).not.toMatch(/message_body|private_value|value_hash/);
    expect(migration).toContain("outreach_dispatch_checks_are_immutable");
    expect(migration).toContain("outreach_automatic_events_are_immutable");
    expect(migration).toContain("from public, anon, authenticated, service_role");
  });

  it("persists an automatic stop and safely releases claimed rows", () => {
    expect(migration).toContain("pause_outreach_delivery_automatically");
    expect(migration).toContain("delivery_paused = true");
    expect(migration).toContain("Automatic stop:");
    expect(migration).toContain("where state = 'processing'");
    expect(migration).toContain("last_automatic_stop_code");
  });
});
