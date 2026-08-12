import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = [
  "supabase/migrations/20260729160000_initial_farmerbook.sql",
  "supabase/migrations/20260730120000_marketplace_growth.sql",
  "supabase/migrations/20260731120000_roles_connections_reviews.sql",
  "supabase/migrations/20260804090000_anon_marketplace_policy_access.sql",
  "supabase/migrations/20260807110000_public_farmer_profiles.sql",
]
  .map((path) => readFileSync(resolve(process.cwd(), path), "utf8"))
  .join("\n")
  .toLowerCase();

const exposedTables = [
  "profiles",
  "posts",
  "comments",
  "post_reactions",
  "follows",
  "blocks",
  "conversations",
  "direct_conversation_pairs",
  "conversation_members",
  "messages",
  "reports",
  "moderation_actions",
  "product_events",
  "produce_listings",
  "market_enquiries",
  "market_reviews",
];

describe("database authorization migration", () => {
  it.each(exposedTables)("enables RLS on %s", (table) => {
    expect(migration).toContain(
      `alter table public.${table} enable row level security`,
    );
  });

  it("defines the canonical direct-conversation function", () => {
    expect(migration).toContain(
      "function public.get_or_create_direct_conversation",
    );
    expect(migration).toContain("unique (user_low, user_high)");
    expect(migration).toContain("pg_advisory_xact_lock");
  });

  it("keeps moderation execution away from normal authenticated users", () => {
    expect(migration).toContain(
      "revoke all on function public.apply_moderation_action",
    );
    expect(migration).toContain("to service_role");
  });

  it("scopes uploads to the authenticated user's top-level folder", () => {
    expect(migration).toContain(
      "(storage.foldername(name))[1] = (select auth.uid())::text",
    );
  });

  it("keeps buyer contact details private to linked buyers and listing owners", () => {
    expect(migration).toContain(
      'policy "buyers and sellers view their marketplace enquiries"',
    );
    expect(migration).not.toContain(
      "grant select on public.market_enquiries to anon",
    );
  });

  it("enforces the three marketplace roles and seller-only listings", () => {
    expect(migration).toContain(
      "account_role in ('farmer', 'customer', 'wholesaler')",
    );
    expect(migration).toContain(
      "account_role in ('farmer', 'wholesaler')",
    );
    expect(migration).toContain(
      'policy "active sellers create own listings"',
    );
  });

  it("links customer enquiries to a canonical conversation", () => {
    expect(migration).toContain("function public.connect_to_listing");
    expect(migration).toContain("buyer_id uuid references public.profiles");
    expect(migration).toContain(
      "public.get_or_create_direct_conversation(seller_id_value)",
    );
  });

  it("permits one review only for a completed owned enquiry", () => {
    expect(migration).toContain("enquiry_id uuid not null unique");
    expect(migration).toContain("function public.can_review_enquiry");
    expect(migration).toContain(
      "public.market_enquiries.status = 'won'",
    );
    expect(migration).toContain(
      'policy "customers review completed purchases"',
    );
  });

  it("keeps customer profiles out of anonymous supplier reads", () => {
    expect(migration).toContain(
      "and account_role in ('farmer', 'wholesaler')",
    );
  });

  it("lets the anonymous listing policy inspect supplier status", () => {
    expect(migration).toContain(
      "grant select (status) on public.profiles to anon",
    );
  });

  it("limits anonymous profile media to active published Farmers", () => {
    expect(migration).toContain(
      'policy "visitors view published farmer profile media"',
    );
    expect(migration).toContain("profile.account_role = 'farmer'");
    expect(migration).toContain("profile.public_profile_enabled");
    expect(migration).toContain(
      "profile.avatar_path = storage.objects.name",
    );
    expect(migration).toContain(
      "profile.cover_path = storage.objects.name",
    );
  });
});
