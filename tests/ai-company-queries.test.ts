import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  flags: new Map<string, boolean>(),
  controlsEnabled: false,
  rpc: vi.fn(),
}));

vi.mock("@/features/auth/require-admin", () => ({
  requireAdmin: vi.fn(async () => ({ id: "admin", demo: false })),
}));
vi.mock("@/lib/feature-flags", () => ({
  isFeatureEnabled: (name: string) => mocks.flags.get(name) ?? false,
}));
vi.mock("@/lib/env", () => ({
  isDemoMode: () => false,
  isSupabaseConfigured: () => true,
}));
vi.mock("@/lib/cloudflare-bindings", () => ({
  getCloudflareBindings: vi.fn(async () => ({
    COMPANY_OPERATIONS_AGENT: {},
    NEXT_PUBLIC_SITE_URL: "https://farmerbook.invalid",
    MANAGED_AGENT_PROCESSOR_SECRET: "x".repeat(32),
  })),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ rpc: mocks.rpc })),
}));

import { loadCompanyCommandCenter } from "@/features/company-agents/queries";

describe("AI company command-center query", () => {
  beforeEach(() => {
    mocks.flags.clear();
    mocks.flags.set("ENABLE_MANAGED_OPERATIONS_AGENTS", true);
    mocks.flags.set("ENABLE_AI_COMPANY", true);
    mocks.controlsEnabled = false;
    mocks.rpc.mockReset();
    mocks.rpc.mockImplementation(async (name: string) => {
      if (name === "ai_company_control_status") {
        return {
          data: [{
            managed_operations_enabled: mocks.controlsEnabled,
            ai_company_enabled: mocks.controlsEnabled,
          }],
          error: null,
        };
      }
      if (name === "list_ai_company_objectives") {
        return {
          data: [{
            id: "00000000-0000-4000-8000-000000001001",
            metric_key: "registered_users",
            display_name: "Registered users",
            target_value: 100_000,
            starts_at: "2026-08-19T00:00:00.000Z",
            deadline_at: "2027-02-15T00:00:00.000Z",
            status: "active",
          }],
          error: null,
        };
      }
      return { data: [], error: null };
    });
  });

  it("keeps review controls off until both database controls are enabled", async () => {
    await expect(loadCompanyCommandCenter()).resolves.toMatchObject({
      configured: false,
    });
    expect(mocks.rpc).toHaveBeenCalledWith("ai_company_control_status");
  });

  it("reports configured only after application, binding and database gates pass", async () => {
    mocks.controlsEnabled = true;
    await expect(loadCompanyCommandCenter()).resolves.toMatchObject({
      configured: true,
      objectives: [{ metricKey: "registered_users", targetValue: 100_000 }],
    });
  });
});
