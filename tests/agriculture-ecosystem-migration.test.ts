import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { AGRICULTURE_CATEGORIES } from "@/lib/agriculture/categories";
import { AGRICULTURE_COMPANY_SECTORS } from "@/lib/agriculture/company-sectors";
import { ONBOARDING_STEPS } from "@/features/onboarding/types";
import { SUPPORTED_LOCALES } from "@/lib/i18n/locales";

const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/20260809120000_agriculture_ecosystem_foundation.sql",
);
const migration = readFileSync(migrationPath, "utf8");
const normalizedMigration = migration.toLowerCase();
const produceTaxonomyMigration = readFileSync(resolve(
  process.cwd(),
  "supabase/migrations/20260812120000_expand_farmer_produce_taxonomy.sql",
), "utf8");
const additiveTaxonomyMigrations = `${migration}\n${readFileSync(resolve(
  process.cwd(),
  "supabase/migrations/20260811120000_inc_sourcing.sql",
), "utf8")}\n${produceTaxonomyMigration}\n${readFileSync(resolve(
  process.cwd(),
  "supabase/migrations/20260818123000_eco_friendly_product_catalog.sql",
), "utf8")}\n${readFileSync(resolve(
  process.cwd(),
  "supabase/migrations/20260818124500_expand_eco_friendly_product_catalog.sql",
), "utf8")}`;

describe("agriculture ecosystem foundation migration", () => {
  it("adds the locale registry and backfills the compatible profile field", () => {
    expect(normalizedMigration).toContain("create table public.supported_locales");
    expect(normalizedMigration).toContain("add column preferred_locale text not null");
    expect(normalizedMigration).toContain("default 'en-in'");
    expect(normalizedMigration).toContain("when 'hi' then 'hi-in'");
    expect(normalizedMigration).toContain("when 'mr' then 'mr-in'");
    expect(normalizedMigration).toContain("human_review_status");
    expect(normalizedMigration).toContain("human_reviewed_at");
    expect(normalizedMigration).toContain(
      "grant select (preferred_locale) on public.profiles to anon, authenticated",
    );
    expect(normalizedMigration).toContain(
      "grant update (preferred_locale) on public.profiles to authenticated",
    );

    for (const locale of SUPPORTED_LOCALES) {
      expect(migration).toContain(`('${locale}',`);
    }
  });

  it("adds agricultural-business compatibility without removing legacy columns", () => {
    expect(normalizedMigration).toContain(
      "account_role in ('farmer', 'customer', 'wholesaler', 'agri_business')",
    );
    expect(normalizedMigration).toContain(
      "drop constraint if exists profiles_participant_type_check",
    );
    expect(normalizedMigration).toContain("'ngo', 'agri_business'");
    expect(normalizedMigration).not.toContain("drop column participant_type");
    expect(normalizedMigration).not.toContain("drop column crops");
    expect(normalizedMigration).not.toContain("rename column farmer_id");
  });

  it("seeds every application taxonomy slug across additive migrations", () => {
    expect(normalizedMigration).toContain("create table public.agriculture_categories");
    expect(normalizedMigration).toContain("slug text primary key");
    expect(normalizedMigration).toContain("parent_slug text references");
    expect(normalizedMigration).toContain("translation_key text not null unique");
    expect(normalizedMigration).toContain("selectable boolean not null");
    for (const category of AGRICULTURE_CATEGORIES) {
      expect(additiveTaxonomyMigrations).toContain(`('${category.slug}',`);
    }
    for (const sector of AGRICULTURE_COMPANY_SECTORS) {
      expect(additiveTaxonomyMigrations).toContain(`('${sector.slug}',`);
    }
  });

  it("forward-expands produce and preserves unmatched legacy categories", () => {
    const normalized = produceTaxonomyMigration.toLowerCase();
    expect(normalized).toContain("on conflict (slug) do update set");
    expect(normalized).toContain("unnest(coalesce(profiles.crops");
    expect(normalized).toContain("insert into public.profile_category_affinities");
    expect(normalized).toContain("insert into public.custom_category_requests");
    expect(normalized).toContain("'legacy_import', 'commodity'");
    expect(normalized).toContain("insert into public.profile_custom_category_affinities");
    const finalize = normalized.match(
      /create or replace function public\.finalize_onboarding[\s\S]*?\$\$;/,
    )?.[0];
    expect(finalize).toContain("'onboarding_submission', 'commodity'");
    expect(finalize).toContain("request.domain = 'commodity'");
    expect(finalize).not.toContain(
      "'onboarding_submission', 'farming_activity'",
    );
    expect(normalized).not.toContain("delete from public.agriculture_categories");
    for (const category of AGRICULTURE_CATEGORIES) {
      expect(produceTaxonomyMigration).toContain(
        `'${category.translationKey}'`,
      );
    }
  });

  it("creates bounded normalized category and onboarding persistence", () => {
    expect(normalizedMigration).toContain(
      "create table public.profile_category_affinities",
    );
    expect(normalizedMigration).toContain(
      "create table public.custom_category_requests",
    );
    expect(normalizedMigration).toContain(
      "create table public.profile_custom_category_affinities",
    );
    expect(normalizedMigration).toContain("create table public.onboarding_progress");
    expect(normalizedMigration).toContain("original_label text not null");
    expect(normalizedMigration).toContain(
      "source in ('onboarding_submission', 'legacy_import')",
    );
    expect(normalizedMigration).toContain("normalize(original_label, nfkc)");
    expect(normalizedMigration).toContain("original_label !~ '@'");
    expect(normalizedMigration).toContain("pg_column_size(draft_data) <= 32768");
    expect(normalizedMigration).toContain("revision integer not null default 0");
    expect(normalizedMigration).toContain("enforce_onboarding_revision");
    expect(normalizedMigration).toContain("cardinality(completed_steps) <= 6");
    expect(normalizedMigration).toContain("completed_steps <@ array[");
    expect(normalizedMigration).toContain(
      "custom_category_pending_name_idx",
    );
    expect(normalizedMigration).toContain(
      "custom_category_pending_limit_before_insert",
    );
    expect(normalizedMigration).toContain("pg_advisory_xact_lock");
    expect(normalizedMigration).toContain(
      "and source = 'onboarding_submission'",
    );
    expect(normalizedMigration).toContain("account_role text check");
    expect(normalizedMigration).not.toContain("account_role text not null check");
    for (const step of ONBOARDING_STEPS) {
      expect(migration).toContain(`'${step}'`);
    }
  });

  it("has unique policy declarations and comma-separated affinity contracts", () => {
    expect(normalizedMigration).not.toMatch(/create\s+policy\s+create\s+policy/);
    const policyNames = [...migration.matchAll(/create policy\s+"([^"]+)"/gi)].map(
      (match) => match[1],
    );
    expect(new Set(policyNames).size).toBe(policyNames.length);

    const expectedRelationships = [
      "grows", "raises", "farms", "catches", "processes", "buys", "sells",
      "supplies", "services", "interested_in",
    ];
    const clauses = [...migration.matchAll(/relationship in \(([\s\S]*?)\)/gi)];
    expect(clauses.length).toBeGreaterThanOrEqual(3);
    for (const [, clause = ""] of clauses) {
      expect(clause.trim()).toMatch(/^'[^']+'(?:\s*,\s*'[^']+')*$/);
      expect([...clause.matchAll(/'([^']+)'/g)].map((match) => match[1])).toEqual(
        expectedRelationships,
      );
    }
  });

  it("forward-replaces customer-only marketplace sourcing guards", () => {
    expect(normalizedMigration).toContain(
      "create or replace function public.is_valid_market_connection",
    );
    expect(normalizedMigration).toContain(
      "create or replace function public.connect_to_listing",
    );
    expect(normalizedMigration).toContain(
      "buyer.account_role in (\n        'farmer', 'customer', 'wholesaler', 'agri_business'",
    );
    expect(normalizedMigration).not.toContain("buyer.account_role = 'customer'");
    expect(normalizedMigration).toContain("buyer.id <> seller.id");
    expect(normalizedMigration).toContain("seller.onboarding_complete");
  });

  it("replaces broad produce insertion with an explicit safe column grant", () => {
    expect(normalizedMigration).toContain(
      "revoke insert on public.produce_listings from authenticated",
    );
    const correctiveSection = normalizedMigration.slice(
      normalizedMigration.indexOf(
        "revoke insert on public.produce_listings from authenticated",
      ),
    );
    const explicitGrant = correctiveSection.match(
      /grant insert \(([\s\S]*?)\) on public\.produce_listings to authenticated;/,
    )?.[1];
    expect(explicitGrant).toBeDefined();
    expect(explicitGrant).toContain("farmer_id");
    expect(explicitGrant).toContain("title");
    expect(explicitGrant).not.toContain("view_count");
    expect(explicitGrant).not.toContain("save_count");
    expect(explicitGrant).not.toContain("enquiry_count");
    expect(explicitGrant).not.toContain("created_at");
    expect(explicitGrant).not.toContain("updated_at");
  });
});
