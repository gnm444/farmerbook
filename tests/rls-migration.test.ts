import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260729160000_initial_farmerbook.sql",
  ),
  "utf8",
).toLowerCase();

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
});
