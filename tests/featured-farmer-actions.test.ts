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

import { createFeaturedFarmerResearchAction } from "@/features/featured-farmers/actions";

const actionInput = {
  fullName: "Anita Patil",
  districtHint: "Nashik",
  stateHint: "Maharashtra",
  farmingHint: "grapes and water stewardship",
  significanceHypothesis:
    "Public sources indicate sustained farmer-led work worth careful editorial review.",
  preferredLocale: "mr-IN",
  idempotencyKey: "00000000-0000-4000-8000-000000000711",
} as const;

describe("Featured Farmer actions", () => {
  beforeEach(() => {
    mocks.enabled = true;
    mocks.requireAdmin.mockReset();
    mocks.userRpc.mockReset();
    mocks.requireAdmin.mockResolvedValue({
      id: "00000000-0000-4000-8000-000000000712",
      demo: false,
    });
    mocks.userRpc.mockResolvedValue({
      data: [
        {
          code: "CREATED",
          research_id: "00000000-0000-4000-8000-000000000713",
          revision: 0,
        },
      ],
      error: null,
    });
  });

  it("does no auth, search, or database work when the release gate is off", async () => {
    mocks.enabled = false;
    await expect(
      createFeaturedFarmerResearchAction(actionInput),
    ).resolves.toMatchObject({ ok: false, code: "FEATURE_DISABLED" });
    expect(mocks.requireAdmin).not.toHaveBeenCalled();
    expect(mocks.userRpc).not.toHaveBeenCalled();
  });

  it("stores only hashes for five bounded Google research routes", async () => {
    await expect(
      createFeaturedFarmerResearchAction(actionInput),
    ).resolves.toMatchObject({
      ok: true,
      data: {
        researchId: "00000000-0000-4000-8000-000000000713",
        queries: expect.arrayContaining([
          expect.objectContaining({ purpose: "identity" }),
          expect.objectContaining({ purpose: "social" }),
        ]),
      },
    });
    const payload = mocks.userRpc.mock.calls[0]?.[1]?.research_input;
    expect(Object.keys(payload.queryFingerprints).sort()).toEqual([
      "current",
      "identity",
      "institutions",
      "significance",
      "social",
    ]);
    expect(Object.values(payload.queryFingerprints)).toEqual(
      expect.arrayContaining([expect.stringMatching(/^[0-9a-f]{64}$/)]),
    );
    expect(payload).not.toHaveProperty("queries");
    expect(mocks.userRpc).toHaveBeenCalledWith(
      "create_featured_farmer_research",
      expect.any(Object),
    );
  });
});
