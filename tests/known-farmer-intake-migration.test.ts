import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  "supabase/migrations/20260812140000_known_farmer_intake.sql",
  "utf8",
).toLowerCase();

describe("Known Farmer Intake migration", () => {
  it("creates private retained intake, candidate and YouTube quota tables", () => {
    expect(sql).toContain("create table public.known_farmer_intakes");
    expect(sql).toContain("create table public.known_farmer_source_candidates");
    expect(sql).toContain("create table public.known_farmer_youtube_searches");
    expect(sql).toContain("interval '30 days'");
    for (const table of [
      "known_farmer_intakes",
      "known_farmer_source_candidates",
      "known_farmer_youtube_searches",
    ]) {
      expect(sql).toContain(`alter table public.${table} enable row level security`);
    }
    expect(sql).toMatch(
      /revoke all on public\.known_farmer_intakes,[\s\S]*?from public, anon, authenticated/,
    );
  });

  it("keeps the application and database release gates ahead of search", () => {
    const reserve = sql.match(
      /create or replace function public\.reserve_known_farmer_youtube_search\([\s\S]*?\$\$;/,
    )?.[0];
    expect(reserve).toContain("public.is_admin()");
    expect(reserve).toContain("is_ecosystem_release_enabled('outreach_agent')");
    expect(reserve).toContain(
      "is_ecosystem_release_enabled('profile_research_agents')",
    );
    expect(reserve).toContain("select count(*) >= 50");
    expect(reserve).toContain("select count(*) >= 10");
    expect(reserve).toContain("select count(*) >= 100");
    expect(reserve).toContain("pg_advisory_xact_lock");
  });

  it("separates owned social profiles from third-party coverage", () => {
    expect(sql).toContain("'owned_social_profile'");
    expect(sql).toContain("'third_party_coverage'");
    expect(sql).toContain("'professional_reference'");
    expect(sql).toContain("is_supported_owned_social_profile_url");
    expect(sql).toContain("source.source_type, source.source_url");
    expect(sql).toContain("social_discovery_completed_at is not null");
    expect(sql).toContain("then 'ready_to_build'");
    expect(sql).toContain("require_social_link_for_public_farmer");
    expect(sql).toContain("detail = 'social_link_required'");
    expect(sql).toContain("source_url ~ '^https://'");
  });

  it("records exact Google, YouTube and operator provenance", () => {
    expect(sql).toContain("'manual_google_review'");
    expect(sql).toContain("'youtube_data_api'");
    expect(sql).toContain("'operator_supplied'");
    expect(sql).toContain("'operator_selected_destination'");
    expect(sql).toContain("'youtube_api_terms'");
    expect(sql).toContain("provider_item_id");
    expect(sql).toContain("provider_query_hash");
  });

  it("keeps candidate storage and sample linkage service-only", () => {
    expect(sql).toMatch(
      /revoke all on function public\.known_farmer_set_updated_at\(\)[\s\S]*?from public, anon, authenticated/,
    );
    expect(sql).toMatch(
      /function public\.save_known_farmer_source_candidates\(uuid, jsonb\)[\s\S]*?to service_role/,
    );
    expect(sql).toMatch(
      /function public\.link_known_farmer_intake_sample\([\s\S]*?to service_role/,
    );
    expect(sql).toMatch(
      /function public\.apply_known_farmer_sample_source_provenance\([\s\S]*?to service_role/,
    );
    expect(sql).not.toMatch(
      /grant execute on function public\.save_known_farmer_source_candidates\(uuid, jsonb\)\s+to authenticated/,
    );
  });
});
