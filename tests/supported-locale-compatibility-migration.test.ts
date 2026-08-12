import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260809135000_supported_locale_compatibility.sql",
  ),
  "utf8",
).toLowerCase();

describe("supported locale compatibility migration", () => {
  it("keeps locale_tag canonical while providing a generated FK-safe alias", () => {
    expect(sql).toContain(
      "locale_code text generated always as (locale_tag) stored",
    );
    expect(sql).toContain(
      "constraint supported_locales_locale_code_key unique (locale_code)",
    );
    expect(sql).not.toContain("update public.supported_locales");
    expect(sql).not.toContain("drop column locale_tag");
  });
});
