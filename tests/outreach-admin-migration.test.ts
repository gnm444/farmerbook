import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260810120000_outreach_admin_operations.sql",
  ),
  "utf8",
).toLowerCase();

describe("outreach administrator operations migration", () => {
  it("starts delivery paused and requires both release and runtime controls", () => {
    expect(sql).toContain("delivery_paused boolean not null default true");
    expect(sql).toContain("'awaiting reviewed provider activation.'");
    const availability = sql.match(
      /create or replace function public\.is_outreach_delivery_available[\s\S]*?\$\$;/,
    )?.[0];
    expect(availability).toContain("is_ecosystem_release_enabled('outreach_agent')");
    expect(availability).toContain("not control.delivery_paused");
    const claim = sql.match(
      /create or replace function public\.claim_outreach_outbox[\s\S]*?\$\$;/,
    )?.[0];
    expect(claim).toContain("not public.is_outreach_delivery_available()");
  });

  it("keeps pause, suppression, deletion and retry mutations service-only", () => {
    for (const name of [
      "set_outreach_delivery_pause",
      "admin_suppress_outreach_prospect",
      "admin_privacy_delete_outreach_prospect",
      "admin_retry_outreach_failure",
    ]) {
      const fn = sql.match(
        new RegExp(
          `create or replace function public\\.${name}[\\s\\S]*?\\$\\$;`,
        ),
      )?.[0];
      expect(fn).toContain("service_role_required");
      expect(sql).toContain(`grant execute on function public.${name}`);
    }
    expect(sql).not.toMatch(
      /grant execute on function public\.(?:set_outreach_delivery_pause|admin_suppress_outreach_prospect|admin_privacy_delete_outreach_prospect|admin_retry_outreach_failure)[^;]*to authenticated/,
    );
  });

  it("privacy-deletes usable content while retaining the suppression hash and receipts", () => {
    const deletion = sql.match(
      /create or replace function public\.admin_privacy_delete_outreach_prospect[\s\S]*?\$\$;/,
    )?.[0];
    expect(deletion).toContain("insert into public.outreach_suppressions");
    expect(deletion).toContain("set private_value = '[deleted]'");
    expect(deletion).toContain("source_excerpt = null");
    expect(deletion).toContain("business_name = null");
    expect(deletion).not.toContain("delete from public.outreach_consents");
    expect(deletion).not.toContain("delete from public.outreach_events");
  });

  it("retries only unexpired failures below the attempt cap and rechecks authorization", () => {
    const retry = sql.match(
      /create or replace function public\.admin_retry_outreach_failure[\s\S]*?\$\$;/,
    )?.[0];
    expect(retry).toContain("outbox_record.state <> 'failed'");
    expect(retry).toContain("outbox_record.attempts >= 5");
    expect(retry).toContain("outbox_record.expires_at <= now()");
    expect(retry).toContain("set state = 'pending'");
    expect(retry).toContain("not public.is_outreach_delivery_available()");
  });

  it("provides admin-only health, failures and redacted history without a force-send function", () => {
    expect(sql).toContain("function public.outreach_runtime_health()");
    expect(sql).toContain("function public.list_outreach_failures");
    expect(sql).toContain("function public.outreach_prospect_history");
    expect(sql).toContain("not public.is_admin()");
    expect(sql).not.toContain("force_send");
    expect(sql).not.toContain("bypass_consent");
  });
});
