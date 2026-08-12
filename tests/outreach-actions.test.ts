import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  enabled: false,
  requireAdmin: vi.fn(),
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers({ host: "localhost:3000" })),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/feature-flags", () => ({
  isFeatureEnabled: () => mocks.enabled,
}));
vi.mock("@/features/auth/require-admin", () => ({
  requireAdmin: mocks.requireAdmin,
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: mocks.createAdminClient,
}));
vi.mock("@/lib/cloudflare-bindings", () => ({
  getCloudflareBindings: vi.fn(async () => null),
}));
vi.mock("@/lib/env", () => ({
  isDemoMode: () => false,
  isSupabaseConfigured: () => true,
  isProductionSite: () => true,
  getSiteUrl: () => "https://farmerbook.in",
}));

import {
  privacyDeleteOutreachProspectAction,
  researchOutreachSourceAction,
  retryOutreachFailureAction,
  setOutreachDeliveryPauseAction,
  submitAcquisitionConsentAction,
  suppressOutreachProspectAction,
} from "@/features/outreach/actions";

describe("outreach server action gates", () => {
  beforeEach(() => {
    mocks.enabled = false;
    mocks.requireAdmin.mockReset();
    mocks.createClient.mockReset();
    mocks.createAdminClient.mockReset();
  });

  it("performs no auth, AI, fetch or database work while the rollout flag is off", async () => {
    await expect(researchOutreachSourceAction({})).resolves.toMatchObject({
      ok: false,
      code: "FEATURE_DISABLED",
    });
    await expect(submitAcquisitionConsentAction({})).resolves.toMatchObject({
      ok: false,
      code: "FEATURE_DISABLED",
    });
    expect(mocks.requireAdmin).not.toHaveBeenCalled();
    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(mocks.createAdminClient).not.toHaveBeenCalled();

    const operation = {
      targetId: crypto.randomUUID(),
      reason: "Safety review requested.",
      idempotencyKey: crypto.randomUUID(),
    };
    for (const action of [
      suppressOutreachProspectAction,
      privacyDeleteOutreachProspectAction,
      retryOutreachFailureAction,
    ]) {
      await expect(action(operation)).resolves.toMatchObject({
        ok: false,
        code: "FEATURE_DISABLED",
      });
    }
    await expect(
      setOutreachDeliveryPauseAction({
        paused: true,
        reason: operation.reason,
        idempotencyKey: operation.idempotencyKey,
      }),
    ).resolves.toMatchObject({ ok: false, code: "FEATURE_DISABLED" });
    expect(mocks.requireAdmin).not.toHaveBeenCalled();
  });

  it("requires operator-supplied evidence for social sources and never fetches them", async () => {
    mocks.enabled = true;
    mocks.requireAdmin.mockResolvedValue({ id: "admin", demo: false });
    await expect(
      researchOutreachSourceAction({
        sourceUrl: "https://youtube.com/@farm",
        sourcePermissionConfirmed: true,
        idempotencyKey: crypto.randomUUID(),
      }),
    ).resolves.toMatchObject({ ok: false, code: "EVIDENCE_REQUIRED" });
    expect(mocks.createClient).not.toHaveBeenCalled();
  });
});
