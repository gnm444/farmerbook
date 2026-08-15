import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  "supabase/migrations/20260814120000_sourced_farmer_research.sql",
  "utf8",
).toLowerCase();
const releaseControlBridge = readFileSync(
  "supabase/migrations/20260814110000_sourced_farmer_release_control_bridge.sql",
  "utf8",
).toLowerCase();
const grantHardening = readFileSync(
  "supabase/migrations/20260814130000_sourced_farmer_grant_hardening.sql",
  "utf8",
).toLowerCase();

const tables = [
  "farmer_source_channels",
  "farmer_source_videos",
  "farmer_source_discovery_runs",
  "sourced_farmer_profiles",
  "sourced_farmer_facts",
  "farmer_source_events",
] as const;

const rpcs = [
  "reserve_sourced_farmer_discovery",
  "save_sourced_farmer_discovery_batch",
  "complete_sourced_farmer_discovery",
  "create_sourced_farmer_profile",
  "review_sourced_farmer_profile",
  "archive_sourced_farmer_profile",
  "purge_expired_farmer_source_data",
] as const;

function tableDefinition(name: string, nextName?: string) {
  const start = sql.indexOf(`create table public.${name}`);
  const end = nextName
    ? sql.indexOf(`create table public.${nextName}`, start)
    : sql.indexOf("create index", start);
  return sql.slice(start, end);
}

describe("sourced Farmer research migration", () => {
  it("adds only the release-control prerequisite to a baseline schema", () => {
    expect(releaseControlBridge).toContain(
      "create table if not exists public.ecosystem_release_controls",
    );
    expect(releaseControlBridge).toContain(
      "create or replace function public.is_ecosystem_release_enabled",
    );
    expect(releaseControlBridge).toContain(
      "control_key in ('sourced_farmer_research')",
    );
    expect(releaseControlBridge).not.toMatch(
      /farmer_contacts|outreach_|featured_farmer|organization_|agriculture_categories/,
    );
  });

  it("creates a default-off, service-only, RLS-protected domain", () => {
    expect(sql).toContain("values ('sourced_farmer_research', false)");
    for (const table of tables) {
      expect(sql).toContain(`create table public.${table}`);
      expect(sql).toContain(`alter table public.${table} enable row level security`);
      expect(sql).toContain(`grant select on table public.${table} to service_role`);
    }
    expect(sql).toMatch(
      /revoke all on table public\.farmer_source_channels,[\s\S]*?from public, anon, authenticated/,
    );
    expect(sql).not.toMatch(
      /grant (?:select|insert|update|delete)[^;]*to (?:anon|authenticated)/,
    );
    expect(sql).not.toMatch(
      /grant (?:insert|update|delete)[^;]*to service_role/,
    );
    expect(grantHardening).toMatch(
      /revoke all on table public\.farmer_source_channels,[\s\S]*?from public, anon, authenticated, service_role/,
    );
    expect(grantHardening).toContain(
      "revoke all on table public.ecosystem_release_controls\nfrom public, anon, authenticated, service_role",
    );
    expect(grantHardening).toContain(
      "grant select, update (enabled)\non table public.ecosystem_release_controls to service_role",
    );
  });

  it("keeps YouTube provenance anonymous and expires it within 30 days", () => {
    const channels = tableDefinition(
      "farmer_source_channels",
      "farmer_source_videos",
    );
    const videos = tableDefinition(
      "farmer_source_videos",
      "farmer_source_discovery_runs",
    );
    const provenance = `${channels}\n${videos}`;
    for (const forbidden of [
      " title ",
      " description ",
      " display_name ",
      " district ",
      " state_name ",
      " email ",
      " phone ",
      " whatsapp ",
      " username ",
      " handle ",
    ]) {
      expect(provenance).not.toContain(forbidden);
    }
    expect(channels).toContain("provider_channel_id text");
    expect(channels).toContain("channel_url text");
    expect(channels).toContain("cardinality(topic_slugs) = 0");
    expect(videos).toContain("provider_video_id text");
    expect(videos).toContain("video_url text");
    expect(videos).toContain("published_at timestamptz");
    expect(provenance.match(/interval '30 days'/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it("separates durable eligible evidence from YouTube discovery", () => {
    const profiles = tableDefinition(
      "sourced_farmer_profiles",
      "sourced_farmer_facts",
    );
    expect(profiles).toContain("documented_subject_consent");
    expect(profiles).toContain("independent_public_source");
    expect(profiles).toContain("state_name text");
    expect(profiles).toContain("summary text not null");
    expect(profiles).toContain("topic_slugs text[] not null");
    expect(sql).toContain("is_sourced_farmer_evidence_url");
    expect(sql).toContain("youtube-nocookie\\.com");
    expect(sql).toContain("duplicate_profile");
    expect(sql).toContain("sourced_farmer_contains_contact_text");
  });

  it("uses composite owner foreign keys and optimistic revisions", () => {
    expect(sql).toContain(
      "foreign key (channel_id, owner_id)\n    references public.farmer_source_channels (id, owner_id)",
    );
    expect(sql).toContain(
      "foreign key (profile_id, owner_id)\n    references public.sourced_farmer_profiles (id, owner_id)",
    );
    expect(sql).toContain("new.revision = old.revision + 1");
    expect(sql.match(/detail = 'revision_conflict'/g)?.length).toBeGreaterThanOrEqual(2);
    expect(sql).toContain("for update");
  });

  it("exposes only release-aware service RPCs with allowlisted JSON", () => {
    for (const rpc of rpcs) {
      expect(sql).toContain(`create or replace function public.${rpc}`);
      expect(sql).toMatch(
        new RegExp(`grant execute on function public\\.${rpc}\\([\\s\\S]*?\\) to service_role`),
      );
    }
    expect(sql).toContain("assert_sourced_farmer_research_access(owner_id_input)");
    expect(sql).toContain("is_ecosystem_release_enabled('sourced_farmer_research')");
    expect(sql).toContain("batch_input - array[");
    expect(sql).toContain("video_item - array[");
    expect(sql).toContain("profile_input - array[");
    expect(sql).toContain("fact_item - array[");
    expect(sql).toContain("jsonb_array_length(batch_input -> 'videos') > 50");
    expect(sql).toContain("page_number_value not between 1 and 2");
    expect(sql).toContain("is_sourced_farmer_channel_actor_counts");
    expect(sql).toContain("search_quota_exceeded");
  });

  it("makes audit events immutable and purges actual expired source rows", () => {
    expect(sql).toContain("farmer_source_events_are_immutable");
    expect(sql).toContain("sourced farmer research events are immutable");
    expect(sql).toContain("detail = 'audit_immutable'");
    expect(sql).toContain("delete from public.farmer_source_videos");
    expect(sql).toContain("delete from public.farmer_source_channels");
    expect(sql).toContain("delete from public.farmer_source_discovery_runs");
    expect(sql).toContain("for update skip locked");
    expect(sql).toContain("source_data_purged");
    expect(sql).toContain("idempotent_replay");
  });

  it("does not add contact, member, outreach, messaging, or publication links", () => {
    for (const table of tables) {
      const definition = tableDefinition(
        table,
        tables[tables.indexOf(table) + 1],
      );
      expect(definition).not.toMatch(
        /\b(email|phone|whatsapp|contact_id|member_profile_id|outreach_prospect_id|message_id|outbox_id|publication_id|verification_status)\b/,
      );
    }
  });
});
