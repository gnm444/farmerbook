import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const rawMigration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260809130000_agriculture_organizations_and_offers.sql",
  ),
  "utf8",
);
const migration = rawMigration
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/--[^\n\r]*/g, "")
  .toLowerCase();

const protectedTables = [
  "ecosystem_release_controls",
  "agriculture_legacy_crop_backfill_audit",
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
];

describe("organization and offer authorization guards", () => {
  it.each(protectedTables)("enables RLS on %s", (table) => {
    expect(migration).toContain(
      `alter table public.${table} enable row level security`,
    );
  });

  it("revokes browser defaults only after RLS is enabled", () => {
    const rlsIndex = migration.indexOf(
      "alter table public.organizations enable row level security",
    );
    const revokeIndex = migration.indexOf(
      "revoke all on table\n  public.agriculture_legacy_crop_backfill_audit",
    );
    expect(rlsIndex).toBeGreaterThan(-1);
    expect(revokeIndex).toBeGreaterThan(rlsIndex);
    for (const table of protectedTables.filter(
      (value) => value !== "ecosystem_release_controls",
    )) {
      expect(migration.slice(revokeIndex, revokeIndex + 1_500)).toContain(
        `public.${table}`,
      );
    }
    expect(migration).toContain(
      "revoke all on public.ecosystem_release_controls from public, anon, authenticated",
    );
  });

  it("exposes only active published organization and offer rows", () => {
    expect(migration).toContain(
      'policy "visitors browse published organizations"',
    );
    expect(migration).toContain("using (public.is_public_organization(id))");
    expect(migration).toContain(
      'policy "visitors browse current published business offers"',
    );
    expect(migration).toContain("public.is_public_business_offer(id)");
    expect(migration).toContain("offer.valid_from <= current_date");
    expect(migration).toContain("offer.valid_until >= current_date");
    expect(migration).toContain("organization.publication_state = 'published'");
  });

  it("defaults every database-owned release gate off and keeps controls private", () => {
    expect(migration).toContain("create table public.ecosystem_release_controls");
    for (const control of [
      "resumable_onboarding",
      "agri_businesses",
      "business_offers",
      "extended_locales",
    ]) {
      expect(migration).toContain(`('${control}', false)`);
    }
    expect(migration).toContain(
      "revoke all on public.ecosystem_release_controls from public, anon, authenticated",
    );
    expect(migration).toContain(
      "grant select, update (enabled) on public.ecosystem_release_controls to service_role",
    );
    expect(migration).toContain(
      "function public.is_ecosystem_release_enabled(\n  control_key_input text",
    );
    expect(migration).toContain("to anon, authenticated");

    for (const detail of [
      "resumable_onboarding_disabled",
      "agri_businesses_disabled",
      "business_offers_disabled",
      "extended_locales_disabled",
    ]) {
      expect(migration).toContain(`detail = '${detail}'`);
    }
  });

  it("keeps registration, contact, verification and evidence away from anon", () => {
    for (const table of [
      "organization_private_details",
      "organization_verification_requests",
      "organization_memberships",
      "organization_membership_audit",
      "business_offer_enquiries",
      "business_offer_enquiry_events",
      "business_offer_enquiry_assignments",
      "agriculture_legacy_crop_backfill_audit",
    ]) {
      expect(migration).not.toMatch(
        new RegExp(`grant\\s+select[\\s\\S]{0,240}on public\\.${table} to anon`),
      );
    }
    const certificationGrant = migration.match(
      /grant select \(([^;]*?)\) on public\.certification_claims to anon, authenticated/,
    )?.[1];
    expect(certificationGrant).toBeDefined();
    expect(certificationGrant).not.toContain("evidence_path");
    expect(certificationGrant).not.toContain("reviewed_by");
    expect(certificationGrant).not.toContain("reviewer_note");
  });

  it("requires active memberships and prevents hierarchy/provenance abuse", () => {
    expect(migration).toContain("membership.status = 'active'");
    expect(migration).toContain("actor.status = 'active'");
    expect(migration).toContain("actor.onboarding_complete");
    expect(migration).toContain("invited_by = (select auth.uid())");
    const updatePolicy = migration.match(
      /policy "organization administrators update members"[\s\S]*?;/,
    )?.[0];
    const deletePolicy = migration.match(
      /policy "organization administrators remove members"[\s\S]*?;/,
    )?.[0];
    expect(updatePolicy).toContain(
      "role <> 'owner' or public.can_manage_organization(organization_id, 'owner')",
    );
    expect(deletePolicy).toContain(
      "role <> 'owner' or public.can_manage_organization(organization_id, 'owner')",
    );
    expect(migration).toContain("pg_advisory_xact_lock(");
    expect(migration).toContain("detail = 'last_owner_required'");
  });

  it("locks every SECURITY DEFINER browser RPC to its intended role", () => {
    const rpcSignatures = [
      "public.create_organization_with_owner(\n  text, text, text, text, text, text, text, text[], jsonb\n)",
      "public.update_organization(\n  text, text, text, text, text, text, text, text[], jsonb, uuid, timestamptz\n)",
      "public.set_organization_publication(\n  uuid, text, timestamptz\n)",
      "public.create_business_offer(\n  uuid, text, text, text, text, text, date, date, text, text, numeric,\n  numeric, text, text[], jsonb, text, boolean\n)",
      "public.update_business_offer(\n  uuid, text, text, text, text, text, date, date, text, text, numeric,\n  numeric, text, text[], jsonb, text, boolean, uuid, timestamptz\n)",
      "public.set_business_offer_publication(\n  uuid, text, timestamptz\n)",
      "public.connect_to_business_offer(\n  uuid, text, text, text, uuid\n)",
      "public.finalize_onboarding(integer, uuid)",
      "public.complete_legacy_onboarding(jsonb)",
    ];
    for (const signature of rpcSignatures) {
      expect(migration).toContain(`revoke all on function ${signature}`);
      expect(migration).toContain(`grant execute on function ${signature}`);
    }
    expect(migration).not.toMatch(
      /grant execute on function public\.(?:create_organization_with_owner|update_organization|set_organization_publication|create_business_offer|update_business_offer|set_business_offer_publication|connect_to_business_offer|finalize_onboarding|complete_legacy_onboarding)[\s\S]{0,260}to anon/,
    );
  });

  it("allows every active completed role to enquire but rejects own organizations", () => {
    const connect = migration.match(
      /create or replace function public\.connect_to_business_offer[\s\S]*?\$\$;/,
    )?.[0];
    expect(connect).toContain(
      "account_role in ('farmer', 'customer', 'wholesaler', 'agri_business')",
    );
    expect(connect).toContain("and status = 'active'");
    expect(connect).toContain("and onboarding_complete");
    expect(connect).toContain("own_organization_enquiry");
    expect(connect).toContain("organization_blocked");
    expect(connect).toContain("idempotency_conflict");
  });

  it("uses private scoped storage buckets with no anonymous object policy", () => {
    expect(migration).toContain(
      "'organization-verification', 'organization-verification', false, 10485760",
    );
    expect(migration).toContain(
      "'offer-images', 'offer-images', false, 5242880",
    );
    expect(migration).toContain(
      "array['application/pdf', 'image/jpeg', 'image/png']",
    );
    expect(migration).toContain(
      "array['image/jpeg', 'image/png', 'image/webp']",
    );
    expect(migration).not.toMatch(
      /on storage\.objects for (?:select|insert|update|delete) to anon[\s\S]{0,500}bucket_id = '(?:organization-verification|offer-images)'/,
    );
    expect(migration).toContain(
      "organization.id::text = (storage.foldername(storage.objects.name))[1]",
    );
  });

  it("disables anonymous produce enquiries until the external abuse gate exists", () => {
    expect(migration).toContain(
      'drop policy if exists "visitors send enquiries for active listings"',
    );
    expect(migration).toContain(
      'drop policy if exists "visitors send unlinked enquiries for active listings"',
    );
    expect(migration).toContain(
      "revoke insert on public.market_enquiries from anon",
    );
    expect(migration).not.toMatch(
      /create policy[^;]+on public\.market_enquiries for insert to anon/,
    );
  });

  it("prevents clients from completing drafts or changing authorization roles", () => {
    expect(migration).toContain(
      'policy "participants update own incomplete onboarding progress"',
    );
    expect(migration).toContain(
      "public.is_ecosystem_release_enabled('resumable_onboarding')",
    );
    expect(migration).toContain(
      "preferred_locale in ('en-in', 'hi-in', 'mr-in')",
    );
    expect(migration).toContain(
      "public.is_ecosystem_release_enabled('extended_locales')",
    );
    expect(migration).toContain("and status <> 'complete'");
    expect(migration).toContain("and status in ('not_started', 'in_progress')");
    expect(migration).toContain("revoke update on table public.profiles from authenticated");
    const safeProfileGrant = migration.match(
      /grant update \(([^;]*?)\) on public\.profiles to authenticated;/,
    )?.[1];
    expect(safeProfileGrant).toBeDefined();
    expect(safeProfileGrant).not.toContain("account_role");
    expect(safeProfileGrant).not.toContain("participant_type");
    expect(safeProfileGrant).not.toContain("onboarding_complete");
  });

  it("validates certification offer ownership at the database boundary", () => {
    expect(migration).toContain(
      "function public.validate_certification_claim_offer_owner()",
    );
    expect(migration).toContain(
      "offer.organization_id = new.organization_id",
    );
    expect(migration).toContain(
      "trigger certification_claims_validate_offer_owner",
    );
    expect(migration).toContain(
      "detail = 'certification_offer_organization_mismatch'",
    );
  });

  it("invalidates reviewed certification trust after material edits", () => {
    const invalidationFunction = migration.match(
      /create or replace function public\.invalidate_edited_certification_claim_trust[\s\S]*?\$\$;/,
    )?.[0];

    expect(invalidationFunction).toBeDefined();
    expect(invalidationFunction).toContain(
      "new.claim_text is distinct from old.claim_text",
    );
    expect(invalidationFunction).toContain(
      "new.evidence_path is distinct from old.evidence_path",
    );
    expect(invalidationFunction).toContain(
      "when new.risk_level = 'high' then 'pending'",
    );
    expect(invalidationFunction).toContain("else 'self_declared'");
    expect(invalidationFunction).toContain("new.publication_state := 'draft'");
    expect(invalidationFunction).toContain("new.reviewed_by := null");
    expect(invalidationFunction).toContain("new.reviewed_at := null");
    expect(migration).toContain(
      "trigger certification_claims_invalidate_edited_trust",
    );
    expect(migration).toContain(
      "revoke all on function public.invalidate_edited_certification_claim_trust()",
    );
  });

  it("synchronizes verification decisions and invalidates trust on edits", () => {
    expect(migration).toContain(
      "function public.sync_organization_verification_state()",
    );
    expect(migration).toContain("when 'approved' then 'verified'");
    expect(migration).toContain("when 'rejected' then 'rejected'");
    expect(migration).toContain("when 'withdrawn' then 'unverified'");
    expect(migration).toContain(
      "trigger organization_verification_requests_sync_organization",
    );
    expect(migration).toContain("organization_verification_one_active_idx");
    expect(migration).toContain(
      "where status in ('submitted', 'in_review')",
    );
    expect(migration).toContain("detail = 'invalid_verification_transition'");
    const updateOrganization = migration.match(
      /create or replace function public\.update_organization[\s\S]*?\$\$;/,
    )?.[0];
    expect(updateOrganization).toContain("verification_state = 'unverified'");
    expect(updateOrganization).toContain(
      "when publication_state = 'published' then 'unpublished'",
    );
    expect(updateOrganization).toContain("set status = 'withdrawn'");
  });

  it("keeps organization verification review provenance server-owned", () => {
    const reviewFunction = migration.match(
      /create or replace function public\.review_organization_verification_request[\s\S]*?\$\$;/,
    )?.[0];
    const directUpdateGrant = migration.match(
      /grant update \(\s*status, evidence_path[\s\S]*?\) on public\.organization_verification_requests to authenticated;/,
    )?.[0];

    expect(reviewFunction).toBeDefined();
    expect(reviewFunction).toContain("actor_id uuid := (select auth.uid())");
    expect(reviewFunction).toContain("not public.is_admin()");
    expect(reviewFunction).toContain(
      "decision_input not in ('in_review', 'approved', 'rejected')",
    );
    expect(reviewFunction).toContain("reviewed_by = actor_id");
    expect(reviewFunction).toContain("reviewed_at = now()");
    expect(reviewFunction).toContain("for update");
    expect(migration).not.toContain(
      'policy "platform administrators review verification requests"',
    );
    expect(migration).toContain("with check (status = 'withdrawn');");
    expect(directUpdateGrant).toBeDefined();
    expect(directUpdateGrant).toContain("status, evidence_path");
    expect(directUpdateGrant).not.toContain("moderator_note");
    expect(directUpdateGrant).not.toContain("reviewed_by");
    expect(directUpdateGrant).not.toContain("reviewed_at");
    expect(migration).toContain(
      "revoke all on function public.review_organization_verification_request(\n  uuid, text, text\n) from public, anon, authenticated;",
    );
    expect(migration).toContain(
      "grant execute on function public.review_organization_verification_request(\n  uuid, text, text\n) to authenticated;",
    );
  });

  it("atomically applies profile moderation and verification state", () => {
    const moderationFunction = migration.match(
      /create or replace function public\.apply_moderation_action[\s\S]*?\$\$;/,
    )?.[0];

    expect(moderationFunction).toBeDefined();
    expect(moderationFunction).toContain("when action_input = 'suspend' then 'suspended'");
    expect(moderationFunction).toContain("when action_input in ('restore', 'unsuspend') then 'active'");
    expect(moderationFunction).toContain("verification_status = case");
    expect(moderationFunction).toContain("when action_input = 'verify' then 'verified'");
    expect(moderationFunction).toContain("when action_input = 'reject' then 'rejected'");
    expect(moderationFunction).toContain("else verification_status");
  });
});
