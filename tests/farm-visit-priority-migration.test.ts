import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260827120000_farm_visit_priority_enquiries.sql"),
  "utf8",
).toLowerCase();

describe("Farm Visit priority migration", () => {
  it("classifies schools and corporates as high priority while preserving private RPC-only access", () => {
    expect(migration).toContain("add column visitor_type text not null default 'individual'");
    expect(migration).toContain("add column priority text not null default 'normal'");
    expect(migration).toContain("farm_visit_requests_priority_matches_visitor_type_check");
    expect(migration).toContain("create function public.create_farm_visit_request_v2");
    expect(migration).toContain("invalid_visitor_classification");
    expect(migration).toContain("grant execute on function public.create_farm_visit_request_v2");
    expect(migration).toContain("to authenticated");
    expect(migration).not.toContain("grant select on table public.farm_visit_requests");
  });
});
