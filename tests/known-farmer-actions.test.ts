import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  enabled: true,
  requireAdmin: vi.fn(),
  userRpc: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers({ host: "localhost:3000" })),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/feature-flags", () => ({
  isFeatureEnabled: () => mocks.enabled,
}));
vi.mock("@/lib/env", () => ({
  getSiteUrl: () => "https://farmerbook.in",
  isDemoMode: () => false,
  isProductionSite: () => false,
  isSupabaseConfigured: () => true,
}));
vi.mock("@/features/auth/require-admin", () => ({
  requireAdmin: mocks.requireAdmin,
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ rpc: mocks.userRpc })),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ rpc: vi.fn(), from: vi.fn() })),
}));
vi.mock("@/lib/cloudflare-bindings", () => ({
  getCloudflareBindings: vi.fn(async () => undefined),
}));

import { createKnownFarmerIntakeAction } from "@/features/profile-agent/known-farmer-actions";

const actionInput = {
  fullName: "Anita Patil",
  locationHint: "Nashik Maharashtra",
  farmingHint: "grapes natural farming",
  preferredLocale: "mr-IN",
  relationshipBasis: "team_known",
  relationshipConfirmed: true,
  idempotencyKey: "00000000-0000-4000-8000-000000000801",
} as const;

describe("Known Farmer Intake actions", () => {
  beforeEach(() => {
    mocks.enabled = true;
    mocks.requireAdmin.mockReset();
    mocks.userRpc.mockReset();
    mocks.requireAdmin.mockResolvedValue({
      id: "00000000-0000-4000-8000-000000000802",
      demo: false,
    });
    mocks.userRpc.mockResolvedValue({
      data: [{
        code: "CREATED",
        intake_id: "00000000-0000-4000-8000-000000000803",
        revision: 0,
      }],
      error: null,
    });
  });

  it("does no auth, provider or database work when the release gate is off", async () => {
    mocks.enabled = false;
    await expect(createKnownFarmerIntakeAction(actionInput)).resolves.toMatchObject({
      ok: false,
      code: "FEATURE_DISABLED",
    });
    expect(mocks.requireAdmin).not.toHaveBeenCalled();
    expect(mocks.userRpc).not.toHaveBeenCalled();
  });

  it("stores only a hash of the bounded Google query and returns the browser link", async () => {
    await expect(createKnownFarmerIntakeAction(actionInput)).resolves.toMatchObject({
      ok: true,
      data: {
        intakeId: "00000000-0000-4000-8000-000000000803",
        googleResearchUrl: expect.stringMatching(
          /^https:\/\/www\.google\.com\/search\?/,
        ),
      },
    });
    expect(mocks.userRpc).toHaveBeenCalledWith(
      "create_known_farmer_intake",
      expect.objectContaining({
        intake_input: expect.objectContaining({
          fullName: "Anita Patil",
          googleQueryHash: expect.stringMatching(/^[0-9a-f]{64}$/),
          relationshipConfirmed: true,
        }),
      }),
    );
    const payload = mocks.userRpc.mock.calls[0]?.[1]?.intake_input;
    expect(payload).not.toHaveProperty("googleQuery");
  });
});
