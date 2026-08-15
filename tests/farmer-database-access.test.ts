import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  enabled: true,
  requireAdmin: vi.fn(),
  configuration: vi.fn(),
}));

vi.mock("@/lib/feature-flags", () => ({
  isFeatureEnabled: () => mocks.enabled,
}));
vi.mock("@/lib/env", () => ({
  isDemoMode: () => false,
  isSupabaseConfigured: () => true,
}));
vi.mock("@/features/auth/require-admin", () => ({
  requireAdmin: mocks.requireAdmin,
}));
vi.mock("@/features/farmer-database/crypto", () => ({
  privateFarmerContactConfiguration: mocks.configuration,
}));

import { requirePrivateFarmerDatabaseOwner } from "@/features/farmer-database/access";

describe("private Farmer database owner boundary", () => {
  beforeEach(() => {
    mocks.enabled = true;
    mocks.requireAdmin.mockReset();
    mocks.configuration.mockReset();
    mocks.configuration.mockReturnValue({
      configured: true,
      ownerId: "00000000-0000-4000-8000-000000000901",
      encryptionKey: "not-exposed-to-the-browser",
    });
  });

  it("does no authentication or configuration work when disabled", async () => {
    mocks.enabled = false;
    await expect(requirePrivateFarmerDatabaseOwner()).resolves.toEqual({
      ok: false,
      code: "FEATURE_DISABLED",
    });
    expect(mocks.requireAdmin).not.toHaveBeenCalled();
    expect(mocks.configuration).not.toHaveBeenCalled();
  });

  it("rejects a different administrator without exposing the owner", async () => {
    mocks.requireAdmin.mockResolvedValue({
      id: "00000000-0000-4000-8000-000000000902",
      demo: false,
    });
    await expect(requirePrivateFarmerDatabaseOwner()).resolves.toEqual({
      ok: false,
      code: "FORBIDDEN",
    });
  });

  it("admits only the configured founder administrator", async () => {
    mocks.requireAdmin.mockResolvedValue({
      id: "00000000-0000-4000-8000-000000000901",
      demo: false,
    });
    await expect(requirePrivateFarmerDatabaseOwner()).resolves.toMatchObject({
      ok: true,
      administrator: {
        id: "00000000-0000-4000-8000-000000000901",
      },
    });
  });
});
