import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const serverModule = "raitunestham-research.server";

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(?:ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

describe("Raitu Nestham snapshot source boundary", () => {
  it("loads the dataset after the owner gate and keeps it out of client modules", () => {
    const pagePath = "app/(product)/admin/sourced-farmers/raitunestham/page.tsx";
    const pageSource = readFileSync(pagePath, "utf8");
    const accessIndex = pageSource.indexOf("requireSourcedFarmerResearchOwner()");
    const importIndex = pageSource.indexOf(`await import(\n    \"@/features/sourced-farmers/${serverModule}\"`);

    expect(pageSource).toContain('export const dynamic = "force-dynamic"');
    expect(pageSource).toContain("index: false");
    expect(accessIndex).toBeGreaterThan(-1);
    expect(importIndex).toBeGreaterThan(accessIndex);

    for (const path of sourceFiles("app").concat(sourceFiles("features"))) {
      const source = readFileSync(path, "utf8");
      if (!source.includes(serverModule)) continue;
      expect(source.trimStart().startsWith('"use client"')).toBe(false);
    }
  });
});
