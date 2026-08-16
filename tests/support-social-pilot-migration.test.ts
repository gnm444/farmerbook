import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("support and social pilot migration", () => {
  const sql = readFileSync(
    "supabase/migrations/20260816120000_support_social_pilot.sql",
    "utf8",
  );

  it("creates a forward-only, default-off four-table domain", () => {
    expect(sql).toContain("values ('support_social_pilot', false)");
    for (const table of [
      "support_cases",
      "social_campaign_briefs",
      "agent_action_proposals",
      "agent_action_proposal_events",
    ]) {
      expect(sql).toContain(`create table public.${table}`);
      expect(sql).toContain(`alter table public.${table} enable row level security`);
    }
    expect(sql).toMatch(
      /revoke all on table public\.support_cases,[\s\S]*from public, anon, authenticated, service_role/,
    );
    expect(sql).toContain("expires_at timestamptz not null default (now() + interval '90 days')");
  });

  it("extends the fleet to six paused roles and gates the new schedules", () => {
    expect(sql).toContain("'customer_support', 'Customer Support', 300, 10");
    expect(sql).toContain("'social_content', 'Social Content', 3600, 5");
    const requestFunction = sql.slice(
      sql.indexOf("create or replace function public.request_managed_operations_agent_run"),
      sql.indexOf("create or replace function public.configure_managed_operations_agent"),
    );
    const configureFunction = sql.slice(
      sql.indexOf("create or replace function public.configure_managed_operations_agent"),
      sql.indexOf("alter table public.support_cases enable row level security"),
    );
    for (const body of [requestFunction, configureFunction]) {
      expect(body).toContain("'customer_support'");
      expect(body).toContain("'social_content'");
      expect(body).toContain("is_ecosystem_release_enabled('support_social_pilot')");
    }
    expect(requestFunction).toContain("is_ecosystem_release_enabled('managed_operations_agents')");
    expect(configureFunction).toContain("is_ecosystem_release_enabled('managed_operations_agents')");
  });

  it("exposes only the five purpose-limited RPC contracts", () => {
    expect(sql).toMatch(/create or replace function public\.create_support_case\(\s*category_input text,\s*locale_input text,\s*subject_input text,\s*question_input text,\s*idempotency_key_input uuid\s*\)/);
    expect(sql).toMatch(/create or replace function public\.list_my_support_cases\(\s*limit_input integer default 25\s*\)/);
    expect(sql).toMatch(/create or replace function public\.create_social_campaign_brief\(\s*platform_input text,\s*locale_input text,\s*audience_input text,\s*objective_input text,\s*source_facts_input text,\s*call_to_action_input text,\s*idempotency_key_input uuid\s*\)/);
    expect(sql).toMatch(/create or replace function public\.record_agent_action_proposal\(\s*run_id_input uuid,\s*action_type_input text,\s*target_id_input uuid,\s*draft_content_input text,\s*metadata_input jsonb,\s*risk_level_input text,\s*model_input text,\s*prompt_version_input text,\s*idempotency_key_input uuid\s*\)/);
    expect(sql).toMatch(/create or replace function public\.review_agent_action_proposal\(\s*proposal_id_input uuid,\s*decision_input text,\s*expected_revision_input integer,\s*content_input text,\s*reason_input text,\s*idempotency_key_input uuid\s*\)/);
  });

  it("enforces participant/admin/service separation and daily abuse caps", () => {
    expect(sql).toMatch(/grant execute on function public\.create_support_case\([\s\S]*\) to authenticated/);
    expect(sql).toMatch(/grant execute on function public\.record_agent_action_proposal\([\s\S]*\) to service_role/);
    expect(sql).toMatch(/revoke all on function public\.review_agent_action_proposal\([\s\S]*from public, anon, authenticated, service_role/);
    expect(sql).toMatch(/grant execute on function public\.review_agent_action_proposal\([\s\S]*\) to authenticated/);
    expect(sql).toContain("recent.created_at >= now() - interval '24 hours'");
    expect(sql).toContain(") >= 5 then");
    expect(sql).toContain(") >= 25 then");
    expect(sql.match(/detail = 'RATE_LIMITED'/g)).toHaveLength(2);
    expect(sql.match(/pg_advisory_xact_lock/g)).toHaveLength(2);
  });

  it("keeps drafts private until review and never publishes social content", () => {
    const listFunction = sql.slice(
      sql.indexOf("create or replace function public.list_my_support_cases"),
      sql.indexOf("create or replace function public.create_social_campaign_brief"),
    );
    expect(listFunction).toContain("proposal.state = 'approved'");
    expect(listFunction).toContain("support.participant_id = actor_id");
    expect(listFunction).toContain("support.expires_at > now()");

    const reviewFunction = sql.slice(
      sql.indexOf("create or replace function public.review_agent_action_proposal"),
      sql.indexOf("create or replace function public.request_managed_operations_agent_run"),
    );
    expect(reviewFunction).toContain("proposal.revision <> expected_revision_input");
    expect(reviewFunction).toContain("when 'approved' then 'copy_ready'");
    expect(reviewFunction).not.toContain("'published'");
    expect(reviewFunction).toContain("'contentSha256', content_hash");
    expect(reviewFunction).not.toContain("'question'");
    expect(reviewFunction).not.toContain("'draftContent'");
  });

  it("covers the fixed category, platform, action and decision vocabulary", () => {
    for (const category of [
      "account",
      "marketplace",
      "profile",
      "technical",
      "billing",
      "safety",
      "agriculture",
      "other",
    ]) expect(sql).toContain(`'${category}'`);
    for (const platform of ["linkedin", "instagram", "facebook", "x"])
      expect(sql).toContain(`'${platform}'`);
    for (const action of ["support_reply", "social_post"])
      expect(sql).toContain(`'${action}'`);
    for (const decision of ["approved", "rejected", "escalated"])
      expect(sql).toContain(`'${decision}'`);
    expect(sql).toContain("agent_action_proposal_events_are_immutable");
    expect(sql).toContain("'ks-Arab-IN'");
    expect(sql).toContain("'mni-Mtei-IN'");
    expect(sql).toContain("model ~ '^[A-Za-z0-9@._:/-]+$'");
  });
});
