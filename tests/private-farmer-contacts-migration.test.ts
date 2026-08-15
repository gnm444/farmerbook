import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  "supabase/migrations/20260813120000_private_farmer_contacts.sql",
  "utf8",
).toLowerCase();
const queries = readFileSync("features/farmer-database/queries.ts", "utf8");
const actions = readFileSync("features/farmer-database/actions.ts", "utf8");

const privateTables = [
  "farmer_contact_lists",
  "farmer_contacts",
  "farmer_contact_events",
  "farmer_youtube_discovery_runs",
];

describe("private Farmer contacts migration", () => {
  it("creates a default-off service-only owner-scoped database", () => {
    expect(sql).toContain("values ('private_farmer_contacts', false)");
    for (const table of privateTables) {
      expect(sql).toContain(`create table public.${table}`);
      expect(sql).toContain(`alter table public.${table} enable row level security`);
    }
    expect(sql).toMatch(
      /revoke all on table public\.farmer_contact_lists,[\s\S]*?from public, anon, authenticated/,
    );
    expect(sql).not.toMatch(/grant (?:select|insert|update|delete).*to authenticated/);
    expect(sql).toContain("owner_id uuid not null");
    expect(sql).toContain("email_ciphertext text");
    expect(sql).toContain("phone_ciphertext text");
  });

  it("excludes YouTube as a contact source and stores no discovery result item", () => {
    const contactTable = sql.slice(
      sql.indexOf("create table public.farmer_contacts"),
      sql.indexOf("create table public.farmer_contact_events"),
    );
    const discoveryTable = sql.slice(
      sql.indexOf("create table public.farmer_youtube_discovery_runs"),
      sql.indexOf("create unique index farmer_contacts_owner_email_hash_idx"),
    );
    expect(contactTable).not.toContain("youtube_api");
    expect(discoveryTable).not.toMatch(/channel_id|channel_url|description|email|phone|username/);
    expect(discoveryTable).toContain("query_hash");
    expect(discoveryTable).toContain("result_count");
  });

  it("enforces active consent and keeps WhatsApp out of the private database", () => {
    expect(sql).toContain("confirmed active email consent is required");
    expect(sql).toContain("target.consent_state <> 'active'");
    expect(sql).toContain("target.suppression_state <> 'none'");
    expect(sql).toContain("public.outreach_outbox");
    const contactTable = sql.slice(
      sql.indexOf("create table public.farmer_contacts"),
      sql.indexOf("create table public.farmer_contact_events"),
    );
    expect(contactTable).not.toContain("whatsapp");
  });

  it("keeps audit records immutable and all mutations service-only", () => {
    expect(sql).toContain("farmer_contact_events_are_immutable");
    expect(sql).toContain("farmer_contacts_record_creation");
    expect(sql).toContain("outreach_status_syncs_private_farmer_contact");
    expect(sql).toContain("private farmer contact events are immutable");
    for (const fn of [
      "activate_private_farmer_contact_consent",
      "update_private_farmer_contact_state",
      "prepare_private_farmer_contact_email",
      "reserve_private_farmer_youtube_search",
      "complete_private_farmer_youtube_search",
    ]) {
      expect(sql).toMatch(new RegExp(`grant execute on function public\\.${fn}\\([\\s\\S]*?\\) to service_role`));
    }
  });

  it("owner-scopes every service query and private mutation", () => {
    expect(queries.match(/\.eq\("owner_id", access\.administrator\.id\)/g))
      .toHaveLength(4);
    expect(actions).toContain("owner_id: access.administrator.id");
    expect(actions).toContain("owner_id_input: access.administrator.id");
    expect(actions).toContain('.eq("owner_id", access.administrator.id)');
  });
});
