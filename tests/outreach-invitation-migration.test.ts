import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260810100000_outreach_invitation_linkage.sql",
  ),
  "utf8",
).toLowerCase();

describe("outreach invitation and account linkage migration", () => {
  it("stores token hashes and private one-to-one account links", () => {
    expect(sql).toContain("create table public.outreach_invitations");
    expect(sql).toContain("token_hash text not null unique");
    expect(sql).toContain("create table public.outreach_account_links");
    expect(sql).toContain("profile_id uuid not null unique");
    for (const table of ["outreach_invitations", "outreach_account_links"]) {
      expect(sql).toContain(`alter table public.${table} enable row level security`);
      expect(sql).toContain(`revoke all on table public.${table}`);
    }
  });

  it("requires active purpose-matched consent before attaching an invitation", () => {
    const prepare = sql.match(
      /create or replace function public\.prepare_outreach_invitation[\s\S]*?\$\$;/,
    )?.[0];
    expect(prepare).toContain("service_role_required");
    expect(prepare).toContain("public.has_active_outreach_consent");
    expect(prepare).toContain("outbox_record.state <> 'processing'");
    expect(prepare).toContain("extensions.digest(token_input, 'sha256')");
    expect(prepare).toContain("invitation_issued");
  });

  it("links only active authenticated profiles and marks real onboarding completion", () => {
    const redeem = sql.match(
      /create or replace function public\.redeem_outreach_invitation[\s\S]*?\$\$;/,
    )?.[0];
    expect(redeem).toContain("profile.status = 'active'");
    expect(redeem).toContain("invitation_already_used");
    expect(redeem).toContain("account_link_conflict");
    expect(redeem).toContain("purpose = 'onboarding_followup'");
    expect(sql).toContain("after update of onboarding_complete on public.profiles");
    expect(sql).toContain("set status = 'joined', next_action_at = null");
  });

  it("revokes unused invitations after a terminal consent state", () => {
    expect(sql).toContain("revoke_outreach_invitations_on_terminal_status");
    expect(sql).toContain(
      "new.status in ('withdrawn', 'suppressed', 'declined', 'expired')",
    );
    expect(sql).not.toMatch(
      /grant\s+(?:select|insert|update|delete)[^;]*\s+to\s+(?:anon|authenticated)/,
    );
  });
});
