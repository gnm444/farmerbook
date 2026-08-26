import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  "supabase/migrations/20260825120000_optional_featured_farmer_professional_sources.sql",
  "utf8",
).toLowerCase();

describe("Featured Farmer professional-source control migration", () => {
  it("defaults the private control to optional mode", () => {
    expect(sql).toContain("'featured_farmer_professional_sources_required'");
    expect(sql).toMatch(
      /values\s*\(\s*'featured_farmer_professional_sources_required'\s*,\s*false\s*\)/,
    );
    expect(sql).toContain("on conflict (control_key) do nothing");
  });

  it("guards only the two professional-source blockers", () => {
    expect(sql).toContain(
      "if require_professional_sources and professional_domains < 2 then",
    );
    expect(sql).toContain(
      "if require_professional_sources and authoritative_sources < 1 then",
    );
    expect(sql).toContain("if approved_claims < 2 then");
    expect(sql).toContain("if uncited_claims > 0 then");
    expect(sql).toContain("if social_links < 1 then");
    expect(sql).toContain(
      "if jsonb_array_length(draft.story_sections) < 3 then",
    );
    expect(sql).toContain("if media_unapproved > 0 then");
    expect(sql).not.toContain(
      "if require_professional_sources and approved_claims < 2 then",
    );
  });
});
