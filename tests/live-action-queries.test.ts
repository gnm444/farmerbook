import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  flag: false,
  rpc: vi.fn(),
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
vi.mock("@/lib/cloudflare-bindings", () => ({
  getCloudflareBindings: vi.fn(async () => ({
    LIVE_ACTION_COORDINATOR_AGENT: {},
    LIVE_ACTION_EXECUTION_WORKFLOW: {},
  })),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ rpc: mocks.rpc })),
}));

import { loadLiveActionConsole } from "@/features/action-control/queries";

describe("live-action console query", () => {
  beforeEach(() => {
    mocks.flag = false;
    mocks.rpc.mockReset();
    mocks.rpc.mockImplementation(async (name: string) => {
      if (name === "live_agent_executor_controls") {
        return {
          data: [{
            release_enabled: false,
            executor: "consent_outreach",
            paused: true,
            shadow_only: true,
            daily_action_limit: 10,
            monthly_action_limit: 300,
            daily_spend_limit_paise: 0,
            monthly_spend_limit_paise: 0,
            canary_stage: 0,
            revision: 0,
            pause_reason_code: "DEFAULT_OFF",
            updated_at: "2026-08-20T00:00:00.000Z",
          }],
          error: null,
        };
      }
      return { data: [], error: null };
    });
  });

  it("loads redacted controls while reporting all release gates independently", async () => {
    await expect(loadLiveActionConsole()).resolves.toMatchObject({
      available: true,
      applicationEnabled: false,
      releaseEnabled: false,
      runtimeBound: true,
      canaryReady: false,
      controls: [{ executor: "consent_outreach", paused: true }],
    });
    expect(mocks.rpc).toHaveBeenCalledWith("live_agent_action_dashboard", {
      limit_input: 100,
    });
  });

  it("requires both the application and database release gates", async () => {
    mocks.flag = true;
    mocks.rpc.mockImplementation(async (name: string) => {
      if (name === "live_agent_executor_controls") {
        return {
          data: [{
            release_enabled: true,
            executor: "owned_site_publish",
            paused: true,
            shadow_only: true,
            daily_action_limit: 1,
            monthly_action_limit: 30,
            daily_spend_limit_paise: 0,
            monthly_spend_limit_paise: 0,
            canary_stage: 0,
            revision: 0,
            pause_reason_code: "DEFAULT_OFF",
            updated_at: "2026-08-20T00:00:00.000Z",
          }],
          error: null,
        };
      }
      return { data: [], error: null };
    });
    await expect(loadLiveActionConsole()).resolves.toMatchObject({
      applicationEnabled: true,
      releaseEnabled: true,
      canaryReady: false,
    });
  });
});
