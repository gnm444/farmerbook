import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260809130000_agriculture_organizations_and_offers.sql",
  ),
  "utf8",
);

function stripSqlComments(sql: string) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/--[^\n\r]*/g, "");
}

const executable = stripSqlComments(migration);
const sql = executable.toLowerCase();

describe("agriculture organizations and offers migration", () => {
  it("creates the normalized organization, offer and enquiry model", () => {
    for (const table of [
      "organizations",
      "organization_memberships",
      "organization_membership_audit",
      "organization_category_affinities",
      "organization_service_areas",
      "organization_private_details",
      "organization_verification_requests",
      "certification_claims",
      "business_offers",
      "business_offer_categories",
      "business_offer_service_areas",
      "business_offer_media",
      "business_offer_enquiries",
      "business_offer_enquiry_events",
      "business_offer_enquiry_assignments",
    ]) {
      expect(sql).toContain(`create table public.${table}`);
    }

    for (const organizationType of [
      "manufacturer_brand",
      "dealer_distributor",
      "retailer",
      "wholesaler_trader",
      "processor_exporter",
      "fpo_cooperative",
      "custom_hiring_rental_centre",
      "logistics_warehouse",
      "finance_insurance",
      "advisory_training_research",
      "ngo",
      "government_support_body",
    ]) {
      expect(sql).toContain(`'${organizationType}'`);
    }

    for (const membershipRole of [
      "owner",
      "admin",
      "editor",
      "enquiry_agent",
      "viewer",
    ]) {
      expect(sql).toContain(`'${membershipRole}'`);
    }
  });

  it("uses real validity dates, bounded INR prices and strict subsidized rows", () => {
    expect(sql).toContain("valid_from date not null");
    expect(sql).toContain("valid_until date not null");
    expect(sql).toContain("valid_until >= valid_from");
    expect(sql).toContain("price_min numeric(14, 2)");
    expect(sql).toContain("price_max numeric(14, 2)");
    expect(sql).toContain("price_min is null or price_min between 0.01 and 1000000000");
    expect(sql).toMatch(
      /price_model = 'subsidized'[\s\S]*?currency = 'inr'[\s\S]*?price_min is not null[\s\S]*?price_max is null/,
    );
    expect(sql).toMatch(
      /price_model_input = 'subsidized'[\s\S]*?currency_input = 'inr'[\s\S]*?price_min_input is not null[\s\S]*?price_max_input is null[\s\S]*?price_unit_input is not null/,
    );
  });

  it("derives high-risk moderation server-side and never trusts a downgrade", () => {
    const reviewFunction = sql.match(
      /create or replace function public\.offer_requires_human_review[\s\S]*?\$\$;/,
    )?.[0];
    expect(reviewFunction).toBeDefined();
    expect(reviewFunction).toContain("coalesce(caller_requires_review_input, false)");
    expect(reviewFunction).toContain("or kind_input in ('finance', 'insurance')");
    for (const slug of [
      "finance-credit-payments",
      "insurance-risk-services",
      "crop-protection-biologicals",
      "veterinary-animal-health",
      "certification-traceability",
    ]) {
      expect(reviewFunction).toContain(`'${slug}'`);
    }
    expect(reviewFunction).not.toMatch(
      /caller_requires_review_input\s+and|not\s+caller_requires_review_input/,
    );
  });

  it("keeps new organizations private until an authorized explicit publish", () => {
    const createFunction = sql.match(
      /create or replace function public\.create_organization_with_owner[\s\S]*?\$\$;/,
    )?.[0];
    expect(createFunction).toContain("publication_state, published_at");
    expect(createFunction).toContain("'draft', null");
    expect(createFunction).not.toContain("'published', now()");

    const publicationFunction = sql.match(
      /create or replace function public\.set_organization_publication[\s\S]*?\$\$;/,
    )?.[0];
    expect(publicationFunction).toContain(
      "publication_state_input not in ('published', 'unpublished')",
    );
    expect(publicationFunction).toContain(
      "public.can_manage_organization(organization_id_input, 'admin')",
    );
    expect(publicationFunction).toContain("detail = 'organization_revision_conflict'");
    expect(publicationFunction).toContain("category.domain = 'business_sector'");
    expect(publicationFunction).toContain("category.status = 'active'");
    expect(publicationFunction).toContain("category.selectable");
    expect(publicationFunction).toContain(
      "public.is_india_state_or_union_territory(service_area.state)",
    );
  });

  it("exposes the exact application RPC signatures", () => {
    for (const functionName of [
      "can_manage_organization",
      "can_respond_to_organization_enquiry",
      "create_organization_with_owner",
      "update_organization",
      "set_organization_publication",
      "create_business_offer",
      "update_business_offer",
      "set_business_offer_publication",
      "connect_to_business_offer",
      "finalize_onboarding",
    ]) {
      expect(sql).toContain(`function public.${functionName}(`);
    }
    expect(sql).toContain(
      "create or replace function public.finalize_onboarding(\n  expected_revision_input integer,\n  idempotency_key_input uuid",
    );
    expect(sql).toContain(
      "returns table(code text, revision integer, organization_id uuid)",
    );
  });

  it("enforces the extended-locale release boundary in every write path", () => {
    for (const functionName of [
      "create_business_offer",
      "update_business_offer",
      "finalize_onboarding",
      "complete_legacy_onboarding",
    ]) {
      const definition = sql.match(
        new RegExp(
          `create or replace function public\\.${functionName}[\\s\\S]*?\\$\\$;`,
        ),
      )?.[0];
      expect(definition).toContain(
        "public.is_ecosystem_release_enabled('extended_locales')",
      );
      expect(definition).toContain("detail = 'extended_locales_disabled'");
    }
    expect(sql).toContain("preferred_locale in ('en-in', 'hi-in', 'mr-in')");
    expect(sql).toContain("(draft_data ->> 'locale') in ('en-in', 'hi-in', 'mr-in')");
  });

  it("finalizes the exact six-step draft atomically with revision idempotency", () => {
    const finalize = sql.match(
      /create or replace function public\.finalize_onboarding[\s\S]*?\$\$;/,
    )?.[0];
    expect(finalize).toBeDefined();
    expect(finalize).toContain("progress_value.flow_version <> 1");
    expect(finalize).toContain("profile_value public.profiles%rowtype");
    expect(finalize).toContain("where id = actor_id\n  for update");
    expect(finalize).toContain("profile_value.onboarding_complete");
    expect(finalize).toContain("cardinality(progress_value.completed_steps) <> 6");
    for (const key of [
      "locale",
      "identity",
      "selectedcategoryslugs",
      "customcategorylabels",
      "companysectorslugs",
      "roledetails",
      "reviewvisibility",
    ]) {
      expect(finalize).toContain(key);
    }
    expect(finalize).toContain("'finalize:' || expected_revision_input::text");
    expect(finalize).toContain("last_idempotency_fingerprint");
    expect(finalize).toContain("'idempotency_conflict'");
    expect(finalize).toContain("'revision_conflict'");
    expect(finalize).toContain("and profile_visibility_value = 'public'");
    expect(finalize).toContain("account_role_value in ('customer', 'agri_business')");
    expect(finalize).toContain("organization_value -> 'servicestates'");
    expect(finalize).toContain("'district', null");
    expect(finalize).toContain("replace(category.slug, '-', ' ')");
    expect(finalize).toContain(
      "regexp_replace(category.slug, '[^[:alnum:]]', '', 'g')",
    );
    expect(finalize).toContain("public.create_organization_with_owner(");
    expect(finalize).not.toContain("publication_state = 'published'");
  });

  it("provides a strict non-business legacy fallback without direct role writes", () => {
    const legacy = sql.match(
      /create or replace function public\.complete_legacy_onboarding[\s\S]*?\$\$;/,
    )?.[0];
    expect(legacy).toBeDefined();
    expect(legacy).toContain("actor_id uuid := (select auth.uid())");
    expect(legacy).toContain("current_profile.onboarding_complete");
    expect(legacy).toContain("profile_input -> 'termsaccepted' <> 'true'::jsonb");
    expect(legacy).toContain(
      "account_role_value not in ('farmer', 'customer', 'wholesaler')",
    );
    expect(legacy).toContain("detail = 'legacy_role_not_supported'");
    expect(legacy).toContain("public.is_india_state_or_union_territory");
    expect(legacy).toContain("profile_completed");
    expect(legacy).not.toContain("'agri_business' then");
  });

  it("keeps eight legacy imports independent from three new pending requests", () => {
    const foundation = readFileSync(
      resolve(
        process.cwd(),
        "supabase/migrations/20260809120000_agriculture_ecosystem_foundation.sql",
      ),
      "utf8",
    ).toLowerCase();
    const pendingGuard = foundation.match(
      /create or replace function public\.enforce_custom_category_pending_limit[\s\S]*?\$\$;/,
    )?.[0];
    const capability = foundation.match(
      /create or replace function public\.can_submit_custom_category[\s\S]*?\$\$;/,
    )?.[0];
    expect(pendingGuard).toContain("new.source = 'onboarding_submission'");
    expect(pendingGuard).toContain("and source = 'onboarding_submission'");
    expect(capability).toContain("and source = 'onboarding_submission'");
    expect(sql).toContain("'legacy_import'");
    expect(sql).toContain("where legacy.mapped_slug is null and legacy.is_safe");
  });

  it("backfills legacy crops without rewriting them or leaking unsafe labels", () => {
    expect(sql).toContain("cross join lateral unnest(profile.crops)");
    for (const known of [
      "tomato",
      "onion",
      "grapes",
      "pomegranate",
      "okra",
      "millets",
    ]) {
      expect(sql).toContain(`'${known}'`);
    }
    expect(sql).toContain("'legacy_import'");
    expect(sql).toContain("unsafe_skipped_count");
    expect(sql).not.toMatch(/update\s+public\.profiles[\s\S]{0,200}set\s+crops\s*=/);
    expect(sql).not.toMatch(/agriculture_legacy_crop_backfill_audit[\s\S]{0,400}original_label/);
  });

  it("adds indexed deterministic discovery cursors", () => {
    expect(sql).toContain("organizations_public_cursor_idx");
    expect(sql).toContain("(published_at desc, id desc)");
    expect(sql).toContain("business_offers_public_cursor_idx");
    expect(sql).toContain("business_offers_kind_cursor_idx");
    expect(sql).toContain("business_offer_enquiries_org_queue_idx");
  });

  it("has balanced executable delimiters and guards prior SQL syntax regressions", () => {
    expect((migration.match(/\/\*/g) ?? []).length).toBe(
      (migration.match(/\*\//g) ?? []).length,
    );
    expect((executable.match(/\$\$/g) ?? []).length % 2).toBe(0);
    expect(sql).not.toMatch(/create\s+policy\s+create\s+policy/);
    expect(sql).not.toMatch(/price_unit_input\s+price_unit_input/);
    expect(sql).not.toMatch(/price_max_input\s+price_unit_input/);
    expect(sql).not.toMatch(/,\s*\)/);

    const policyNames = [...executable.matchAll(/create policy\s+"([^"]+)"/gi)].map(
      (match) => match[1],
    );
    expect(policyNames.length).toBeGreaterThan(30);
    expect(new Set(policyNames).size).toBe(policyNames.length);

    const profileGrantRepair = executable.match(
      /revoke update on table public\.profiles from authenticated;\s*do \$\$([\s\S]*?)\$\$;/i,
    )?.[1];
    expect(profileGrantRepair).toBeDefined();
    expect(profileGrantRepair?.match(/profile_column\s+record\s*;/gi)).toHaveLength(
      1,
    );

    const finalizationIndex = sql.indexOf(
      "create or replace function public.finalize_onboarding",
    );
    const executablePolicyIndex = sql.indexOf(
      'create policy "visitors browse published organizations"',
    );
    expect(finalizationIndex).toBeGreaterThan(-1);
    expect(executablePolicyIndex).toBeGreaterThan(finalizationIndex);
  });
});
