import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requireAdmin: vi.fn() }));

vi.mock("@/features/auth/require-admin", () => ({
  requireAdmin: mocks.requireAdmin,
}));
vi.mock("@/lib/env", () => ({
  isDemoMode: () => false,
  isSupabaseConfigured: () => true,
}));

import { requireSourcedFarmerResearchOwner } from "@/features/sourced-farmers/access";

describe("sourced Farmer research owner access", () => {
  const ownerId = "00000000-0000-4000-8000-000000000901";

  beforeEach(() => {
    vi.unstubAllEnvs();
    mocks.requireAdmin.mockReset();
    vi.stubEnv("ENABLE_SOURCED_FARMER_RESEARCH", "true");
    vi.stubEnv("FARMER_CONTACT_OWNER_ID", ownerId);
    mocks.requireAdmin.mockResolvedValue({ id: ownerId, demo: false });
  });

  it("fails before authentication when the release flag is disabled", async () => {
    vi.stubEnv("ENABLE_SOURCED_FARMER_RESEARCH", "false");
    await expect(requireSourcedFarmerResearchOwner()).resolves.toEqual({
      ok: false,
      code: "FEATURE_DISABLED",
    });
    expect(mocks.requireAdmin).not.toHaveBeenCalled();
  });

  it("does not require the private contact encryption key", async () => {
    vi.stubEnv("FARMER_CONTACT_ENCRYPTION_KEY", "");
    await expect(requireSourcedFarmerResearchOwner()).resolves.toMatchObject({
      ok: true,
      administrator: { id: ownerId },
    });
  });

  it("rejects a different administrator without exposing the owner", async () => {
    mocks.requireAdmin.mockResolvedValue({
      id: "00000000-0000-4000-8000-000000000902",
      demo: false,
    });
    await expect(requireSourcedFarmerResearchOwner()).resolves.toEqual({
      ok: false,
      code: "FORBIDDEN",
    });
  });

  it("passes the release flag into the generated Worker configuration", () => {
    expect(readFileSync("vite.config.ts", "utf8")).toContain(
      "ENABLE_SOURCED_FARMER_RESEARCH:\n    process.env.ENABLE_SOURCED_FARMER_RESEARCH",
    );
  });
});
