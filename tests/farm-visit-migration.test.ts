import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260824120000_farm_visit_requests.sql"),
  "utf8",
).toLowerCase();

describe("Farm Visit migration", () => {
  it("keeps private addresses behind forced RLS and narrow RPC grants", () => {
    expect(migration).toContain("alter table public.farm_visit_requests force row level security");
    expect(migration).toContain("revoke all on table public.farm_visit_requests from public, anon, authenticated");
    expect(migration).toContain("grant execute on function public.create_farm_visit_request");
    expect(migration).toContain("to authenticated");
    expect(migration).toContain("grant execute on function public.record_farm_visit_notification");
    expect(migration).toContain("to service_role");
  });

  it("binds the Customer account, JWT email, one open request and idempotency", () => {
    expect(migration).toContain("actor_id uuid := (select auth.uid())");
    expect(migration).toContain("auth.jwt() ->> 'email'");
    expect(migration).toContain("profile.account_role = 'customer'");
    expect(migration).toContain("profile.onboarding_complete");
    expect(migration).toContain("farm_visit_requests_one_open_per_customer_idx");
    expect(migration).toContain("unique (requester_id, idempotency_key)");
    expect(migration).toContain("'idempotent_replay'");
  });

  it("stores only bounded notification state and no email body", () => {
    expect(migration).toContain("notification_state in ('pending', 'sent', 'failed', 'unknown')");
    expect(migration).toContain("notification_receipt_id text");
    expect(migration).not.toContain("notification_body");
    expect(migration).not.toContain("email_body");
  });
});
