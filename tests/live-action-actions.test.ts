import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  flag: false,
  rpc: vi.fn(),
  revalidate: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mocks.revalidate(...args),
}));
vi.mock("@/features/auth/require-admin", () => ({
  requireAdmin: vi.fn(async () => ({ id: "admin", demo: false })),
}));
vi.mock("@/lib/feature-flags", () => ({
  isFeatureEnabled: () => mocks.flag,
}));
vi.mock("@/lib/env", () => ({
  isDemoMode: () => false,
  isSupabaseConfigured: () => true,
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ rpc: mocks.rpc })),
}));

import {
  reviewLiveActionAuthorizationAction,
  revokeLiveActionAuthorizationAction,
  setLiveAgentExecutorPauseAction,
} from "@/features/action-control/actions";

const controlInput = {
  executor: "consent_outreach",
  paused: false,
  dailyActionLimit: 10,
  monthlyActionLimit: 300,
  dailySpendLimitPaise: 0,
  monthlySpendLimitPaise: 0,
  canaryStage: 1,
  reason: "Reviewed synthetic executor control.",
  idempotencyKey: "00000000-0000-4000-8000-000000003001",
} as const;

describe("live-action administrator actions", () => {
  beforeEach(() => {
    mocks.flag = false;
    mocks.rpc.mockReset();
    mocks.revalidate.mockReset();
    mocks.rpc.mockResolvedValue({ data: [], error: null });
  });

  it("fails closed when asked to resume while the application gate is off", async () => {
    await expect(setLiveAgentExecutorPauseAction(controlInput)).resolves.toMatchObject({
      ok: false,
      message: expect.stringMatching(/gate is off/i),
    });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("allows an emergency pause even when the application gate is off", async () => {
    await expect(setLiveAgentExecutorPauseAction({
      ...controlInput,
      paused: true,
    })).resolves.toMatchObject({ ok: true });
    expect(mocks.rpc).toHaveBeenCalledWith(
      "set_live_agent_executor_pause",
      expect.objectContaining({
        executor_input: "consent_outreach",
        paused_input: true,
        daily_action_limit_input: 10,
      }),
    );
  });

  it("keeps resume closed while Phase 1 has no external executor registry", async () => {
    mocks.flag = true;
    await expect(setLiveAgentExecutorPauseAction(controlInput)).resolves.toMatchObject({
      ok: false,
      message: expect.stringMatching(/not implemented/i),
    });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("keeps authorization review disabled until the application gate is on", async () => {
    await expect(reviewLiveActionAuthorizationAction({
      authorizationId: "00000000-0000-4000-8000-000000003002",
      expectedRevision: 0,
      decision: "approved",
      reason: "Reviewed exact synthetic authorization.",
      idempotencyKey: "00000000-0000-4000-8000-000000003003",
    })).resolves.toMatchObject({ ok: false });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("allows emergency revocation while the application gate is off", async () => {
    await expect(revokeLiveActionAuthorizationAction({
      authorizationId: "00000000-0000-4000-8000-000000003002",
      expectedRevision: 0,
      reason: "Emergency revocation during synthetic validation.",
      idempotencyKey: "00000000-0000-4000-8000-000000003004",
    })).resolves.toMatchObject({ ok: true });
    expect(mocks.rpc).toHaveBeenCalledWith(
      "revoke_live_agent_action_authorization",
      expect.objectContaining({ expected_revision_input: 0 }),
    );
  });
});
