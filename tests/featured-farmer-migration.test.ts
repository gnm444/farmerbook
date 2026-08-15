import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  "supabase/migrations/20260812150000_featured_farmer_profiles.sql",
  "utf8",
).toLowerCase();

const privateTables = [
  "featured_farmer_research",
  "featured_farmer_sources",
  "featured_farmer_drafts",
  "featured_farmer_claims",
  "featured_farmer_claim_sources",
  "featured_farmer_social_links",
  "featured_farmer_media",
  "featured_farmer_events",
  "featured_farmer_youtube_searches",
];

describe("Featured Farmer profiles migration", () => {
  it("creates the editorial model and immutable publication snapshots", () => {
    for (const table of [...privateTables, "featured_farmer_publications"]) {
      expect(sql).toContain(`create table public.${table}`);
      expect(sql).toContain(`alter table public.${table} enable row level security`);
    }
    expect(sql).toContain("snapshot jsonb not null");
    expect(sql).toContain("published_at timestamptz not null");
    expect(sql).toContain("withdrawn_at timestamptz");
    expect(sql).toContain("'editorialdisclosure'");
    expect(sql).toContain("farmerbook editorial profile; not a member");
  });

  it("keeps private research data behind RPC boundaries", () => {
    expect(sql).toMatch(
      /revoke all on public\.featured_farmer_research,[\s\S]*?from public, anon, authenticated/,
    );
    expect(sql).toMatch(
      /function public\.save_featured_farmer_youtube_candidates\(uuid, jsonb\)[\s\S]*?to service_role/,
    );
    expect(sql).not.toMatch(
      /grant execute on function public\.save_featured_farmer_youtube_candidates\(uuid, jsonb\)\s+to authenticated/,
    );
    const publicGrant = sql.match(
      /grant execute on function public\.list_featured_farmer_publications[\s\S]*?to anon, authenticated;/,
    )?.[0];
    expect(publicGrant).toContain(
      "list_featured_farmer_publications(integer, integer)",
    );
    expect(publicGrant).toContain("get_featured_farmer_publication(text)");
  });

  it("enforces release, evidence, social and media readiness", () => {
    expect(sql).toContain("is_ecosystem_release_enabled('featured_farmer_profiles')");
    expect(sql).toContain("count(distinct source.publisher_host)");
    expect(sql).toContain("professional_domains < 2");
    expect(sql).toContain("authoritative_sources < 1");
    expect(sql).toContain("approved_claims < 2");
    expect(sql).toContain("social_links < 1");
    expect(sql).toContain("media_unapproved > 0");
    expect(sql).toContain("detail = 'publication_not_ready'");
  });

  it("does not mutate member, outreach or marketplace records", () => {
    expect(sql).not.toMatch(/insert into public\.(profiles|outreach_|marketplace_)/);
    expect(sql).not.toMatch(/update public\.(profiles|outreach_|marketplace_)/);
    expect(sql).not.toMatch(/delete from public\.(profiles|outreach_|marketplace_)/);
  });
});
