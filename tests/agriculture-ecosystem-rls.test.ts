import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260809120000_agriculture_ecosystem_foundation.sql",
  ),
  "utf8",
).toLowerCase();

const newTables = [
  "supported_locales",
  "agriculture_categories",
  "profile_category_affinities",
  "custom_category_requests",
  "profile_custom_category_affinities",
  "onboarding_progress",
];

describe("agriculture ecosystem authorization guards", () => {
  it.each(newTables)("enables RLS and revokes default access on %s", (table) => {
    expect(migration).toContain(
      `alter table public.${table} enable row level security`,
    );
    expect(migration).toContain(
      `revoke all on public.${table} from anon, authenticated`,
    );
  });

  it("keeps private custom-category and onboarding state away from anon", () => {
    expect(migration).not.toContain(
      "grant select on public.custom_category_requests to anon",
    );
    expect(migration).not.toContain(
      "grant select on public.profile_custom_category_affinities to anon",
    );
    expect(migration).not.toContain(
      "grant select on public.onboarding_progress to anon",
    );
    expect(migration).toContain(
      'policy "participants read own onboarding progress"',
    );
    const ownerReadPolicy = migration.match(
      /policy "participants read own onboarding progress"[\s\S]*?using \((.*?)\);/,
    )?.[1];
    expect(ownerReadPolicy).toBe("profile_id = (select auth.uid())");
    expect(migration).toContain(
      'policy "participants delete own onboarding progress"',
    );
    expect(migration).toContain(
      "grant delete on public.onboarding_progress to authenticated",
    );
  });

  it("uses fixed-search-path capability helpers and restricts execution", () => {
    expect(migration).toContain(
      "function public.has_agriculture_capability",
    );
    expect(migration).toContain(
      "function public.can_submit_custom_category",
    );
    expect(migration).toContain(
      "function public.is_public_agriculture_profile",
    );
    expect(migration.match(/security definer/g)?.length).toBeGreaterThanOrEqual(3);
    expect(migration.match(/set search_path = ''/g)?.length).toBeGreaterThanOrEqual(3);
    expect(migration).toContain(
      "revoke all on function public.has_agriculture_capability(uuid, text)",
    );
    expect(migration).toContain(
      "revoke all on function public.can_submit_custom_category(uuid)",
    );
    expect(migration).toContain(
      "revoke all on function public.is_public_agriculture_profile(uuid)",
    );
  });

  it("allows only Farmers and Wholesalers to publish produce", () => {
    expect(migration).toContain(
      "when 'sell_produce' then\n          profiles.account_role in ('farmer', 'wholesaler')",
    );
    expect(migration).toContain(
      "when 'publish_business_offers' then\n          profiles.account_role = 'agri_business'",
    );
  });

  it("never exposes an opted-out representative profile or affinity to anon", () => {
    expect(migration).toContain(
      "and onboarding_complete\n  and public_profile_enabled\n  and account_role in",
    );
    expect(migration).toContain(
      "and profiles.onboarding_complete\n      and profiles.public_profile_enabled",
    );
  });

  it("requires ownership for affinity, custom request and onboarding writes", () => {
    expect(migration).toContain(
      'policy "participants create own agriculture affinities"',
    );
    expect(migration).toContain(
      'policy "participants submit bounded custom category requests"',
    );
    expect(migration).toContain(
      "public.can_submit_custom_category((select auth.uid()))",
    );
    expect(migration).toContain("and source = 'onboarding_submission'");
    expect(migration).not.toContain(
      "grant insert (requested_by, source, domain",
    );
    expect(migration).toContain(
      'policy "participants create own onboarding progress"',
    );
  });
});
