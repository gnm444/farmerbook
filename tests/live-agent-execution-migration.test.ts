import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("live agent execution control-plane migration", () => {
  const sql = readFileSync(
    "supabase/migrations/20260820120000_live_agent_execution_control.sql",
    "utf8",
  );
  const compactSql = sql.replace(/\s+/g, " ");

  it("is a private, forward-only, default-off release", () => {
    expect(sql).toContain("values ('live_agent_execution', false)");
    expect(sql).toContain("create table public.live_agent_executor_controls");
    expect(sql).toMatch(/paused boolean not null default true/);
    expect(sql).toMatch(/shadow_only boolean not null default true/);
    expect(sql).not.toMatch(/update public\.ecosystem_release_controls[\s\S]{0,120}enabled\s*=\s*true/i);
  });

  it("stores frozen authorizations, distinct approvals, attempts and atomic budgets", () => {
    for (const table of [
      "agent_action_authorizations",
      "agent_action_approvals",
      "agent_action_attempts",
      "agent_action_budget_ledger",
      "agent_action_events",
    ]) {
      expect(sql).toContain(`create table public.${table}`);
      expect(sql).toContain(`alter table public.${table} enable row level security`);
    }
    expect(sql).toContain("unique (authorization_id, approver_id)");
    expect(sql).toContain("unique (authorization_id, attempt_number)");
    expect(sql).toContain("attempt_id uuid not null unique");
    expect(sql).toContain("agent_action_authorizations_freeze_contract");
    expect(sql).toContain("agent_action_attempts_freeze_contract");
  });

  it("uses the same exact capability and server-derived policy as TypeScript", () => {
    const policies = [
      ["consent_outreach", "consented_email_dispatch", "high", 3, 1],
      ["in_app_lifecycle", "in_app_lifecycle_message", "low", 2, 0],
      ["support_reply", "approved_support_reply_send", "medium", 3, 1],
      ["owned_site_publish", "owned_site_article_publish", "high", 4, 2],
      ["marketplace_recommendation", "marketplace_recommendation_create", "medium", 2, 0],
      ["experiment", "experiment_assignment_create", "high", 4, 2],
      ["engineering_pr", "engineering_pull_request_create", "medium", 3, 1],
      ["canary_release", "canary_release_deploy", "critical", 4, 2],
    ] as const;
    for (const [executor, action, risk, tier, approvals] of policies) {
      expect(compactSql).toContain(
        `('${executor}', '${action}', '${risk}', ${tier}, ${approvals},`,
      );
    }
    expect(sql).toContain("detail = 'ACTION_PROHIBITED'");
    expect(sql).toContain("detail = 'LIVE_EXECUTION_PROHIBITED'");
    expect(sql).toContain("detail = 'ACTION_POLICY_LIMIT_EXCEEDED'");
    expect(sql).toContain("policy.maximum_actions");
    expect(sql).toContain("policy.maximum_canary_stage");
    expect(sql).toContain("policy.live_eligible");
    expect(sql).toContain("canary_stage_input not between 1 and 20");
    expect(sql).toContain("approval_tier between 0 and 5");
    expect(sql).not.toContain("'moderate'");
  });

  it("enforces proposer separation and two distinct Tier-4 approvals", () => {
    expect(sql).toContain("authz.proposer_id = actor_id");
    expect(sql).toContain("detail = 'PROPOSER_APPROVER_CONFLICT'");
    expect(sql).toContain("unique (authorization_id, approver_id)");
    expect(sql).toContain("detail = 'DISTINCT_APPROVER_REQUIRED'");
    expect(sql).toContain("approved_count >= authz.required_approvals");
    expect(compactSql).toContain(
      "('owned_site_publish', 'owned_site_article_publish', 'high', 4, 2,",
    );
  });

  it("rechecks release, pause, expiry, revision, exact scope and budgets at dispatch", () => {
    const finalAuthorization = sql.slice(
      sql.indexOf("create or replace function public.authorize_live_agent_action_dispatch"),
      sql.indexOf("create or replace function public.record_live_agent_action_receipt"),
    );
    expect(finalAuthorization).toContain("is_ecosystem_release_enabled('live_agent_execution')");
    expect(finalAuthorization).toContain("control.paused or control.shadow_only");
    expect(finalAuthorization).toContain("authz.expires_at <= now()");
    expect(finalAuthorization).toContain("proposal.revision <> authz.proposal_revision");
    expect(finalAuthorization).toContain("authz.target_scope <> target_scope_input");
    expect(finalAuthorization).toContain("detail = 'EXACT_SCOPE_MISMATCH'");
    expect(finalAuthorization).toContain("for update");
    expect(finalAuthorization).toContain("detail = 'BUDGET_EXHAUSTED'");
    expect(finalAuthorization).toContain("insert into public.agent_action_budget_ledger");
  });

  it("never blindly retries an unknown or receipt-less dispatched lease", () => {
    const claim = sql.slice(
      sql.indexOf("create or replace function public.claim_live_agent_action_authorization"),
      sql.indexOf("create or replace function public.authorize_live_agent_action_dispatch"),
    );
    expect(claim).toContain("attempt.state in ('dispatched', 'unknown')");
    expect(claim).toContain("attempt.dispatch_authorized_at is not null");
    expect(claim).toContain("detail = 'RECONCILIATION_REQUIRED'");
    expect(sql).toContain("Only an unknown or expired dispatched lease may be reconciled");
    expect(sql).toContain("result_input not in ('unknown', 'dispatched', 'verified', 'failed')");
  });

  it("hash-links redacted immutable events and automatically pauses unsafe outcomes", () => {
    expect(sql).toContain("sequence_number integer not null");
    expect(sql).toContain("previous_event_hash text");
    expect(sql).toContain("event_hash text not null unique");
    expect(sql).toContain("pg_advisory_xact_lock");
    expect(sql).toContain("agent_action_events_are_immutable");
    expect(sql).toContain("details - array[");
    expect(sql).toContain("pause_code := 'UNKNOWN_OUTCOME'");
    expect(sql).toContain("pause_code := 'FAILURE_RATE_EXCEEDED'");
    expect(sql).toContain("failure_count * 100 <= sample_count * 5");
    expect(sql).toContain("(Z|[+-][0-9]{2}:[0-9]{2})$'");
  });

  it("exposes only narrow, role-separated RPCs", () => {
    expect(sql).toContain("detail = 'ACTION_PRINCIPAL_REQUIRED'");
    expect(sql).toContain("'authorizer'");
    expect(sql).toContain("'executor:' || attempt.executor");
    expect(sql).toContain("'verifier:' || verifier_identity_input");
    expect(sql).toContain("'reconciler:' || reconciler_identity_input");
    for (const serviceRpc of [
      "create_live_agent_action_authorization",
      "claim_live_agent_action_authorization",
      "authorize_live_agent_action_dispatch",
      "record_live_agent_action_receipt",
      "verify_live_agent_action_attempt",
      "reconcile_live_agent_action_attempt",
      "compensate_live_agent_action_attempt",
    ]) {
      expect(sql).toMatch(
        new RegExp(`grant execute on function public\\.${serviceRpc}\\([\\s\\S]*?\\) to service_role`),
      );
    }
    for (const adminRpc of [
      "set_live_agent_executor_pause",
      "review_live_agent_action_authorization",
      "revoke_live_agent_action_authorization",
      "live_agent_executor_controls",
      "live_agent_action_dashboard",
      "list_live_agent_action_attempts",
      "list_live_agent_action_events",
    ]) {
      expect(sql).toMatch(
        new RegExp(`grant execute on function public\\.${adminRpc}\\([\\s\\S]*?\\)\\s+to authenticated`),
      );
    }
    expect(sql).toMatch(
      /revoke all on table public\.live_agent_executor_controls,[\s\S]*from public, anon, authenticated, service_role/,
    );
  });
});
