import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260825130000_featured_farmer_engagement.sql",
  ),
  "utf8",
).toLowerCase();

describe("Featured Farmer engagement migration", () => {
  it("is standalone and seeds only the approved Sandeep subject", () => {
    expect(migration).toContain("sandeep-dasari-avani-van-farms");
    expect(migration).toContain("avanivanfarms@gmail.com");
    expect(migration).not.toContain("references public.featured_farmer_research");
    expect(migration).not.toContain("references public.featured_farmer_drafts");
    expect(migration).not.toContain("featured_farmer_research");
  });

  it("forces RLS and exposes no raw table to browser roles", () => {
    for (const table of [
      "featured_farmer_engagement_subjects",
      "featured_farmer_question_deliveries",
      "featured_farmer_recommendations",
      "featured_farmer_recommendation_events",
    ]) {
      expect(migration).toContain(`alter table public.${table} force row level security`);
      expect(migration).toContain(`revoke all on table public.${table}`);
    }
    expect(migration).toContain("grant execute on function public.get_featured_farmer_public_engagement(text)");
    expect(migration).toContain("to anon, authenticated");
  });

  it("keeps private messages out of storage and rate-limits keyed senders", () => {
    expect(migration).toContain("sender_hash text not null");
    expect(migration).toContain("sender_rate_limited");
    expect(migration).toContain("subject_rate_limited");
    expect(migration).toContain(") >= 3 then");
    expect(migration).toContain(") >= 100 then");
    expect(migration).not.toContain("sender_email");
    expect(migration).not.toContain("visitor_email");
    expect(migration).not.toContain("message_body");
  });

  it("keeps recommendations Customer-bound, moderated and approved-only", () => {
    expect(migration).toContain("profile.account_role = 'customer'");
    expect(migration).toContain("profile.onboarding_complete");
    expect(migration).toContain("recommendation.status = 'approved'");
    expect(migration).toContain("public.is_admin()");
    expect(migration).toContain("featured_farmer_recommendation_events");
    expect(migration).not.toContain("verified purchase");
  });

  it("allows only service role to reserve delivery and increment views", () => {
    expect(migration).toContain("coalesce((select auth.role()), '') <> 'service_role'");
    expect(migration).toContain("grant execute on function public.reserve_featured_farmer_question_delivery");
    expect(migration).toContain("grant execute on function public.increment_featured_farmer_profile_view(text)");
    expect(migration).toContain("to service_role");
  });
});
