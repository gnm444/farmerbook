import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  flagsEnabled: true,
  requireAdmin: vi.fn(),
  userRpc: vi.fn(),
  adminRpc: vi.fn(),
  search: vi.fn(),
  analyze: vi.fn(),
  generateSample: vi.fn(),
  beginApproval: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers({ host: "localhost:3000" })),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/feature-flags", () => ({
  isFeatureEnabled: () => mocks.flagsEnabled,
}));
vi.mock("@/lib/env", () => ({
  getSiteUrl: () => "https://farmerbook.in",
  isDemoMode: () => false,
  isSupabaseConfigured: () => true,
}));
vi.mock("@/features/auth/require-admin", () => ({
  requireAdmin: mocks.requireAdmin,
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ rpc: mocks.userRpc })),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ rpc: mocks.adminRpc, from: vi.fn() })),
}));
vi.mock("@/lib/cloudflare-bindings", () => ({
  getCloudflareBindings: vi.fn(async () => ({
    FARMER_PROFILE_AGENT: {},
  })),
}));
vi.mock("@/features/outreach/agent", () => ({
  createOutreachAgent: () => ({ analyze: mocks.analyze }),
}));

vi.mock("@/features/profile-agent/brave-search", () => ({
  BraveSearchError: class BraveSearchError extends Error {
    constructor(public readonly code: string) {
      super(code);
    }
  },
  braveSearchConfiguration: () => ({ configured: true }),
  buildBraveFarmerQuery: () => '"Anita Patil" farmer agriculture India',
  searchFarmerByName: mocks.search,
}));
vi.mock("agents", () => ({
  getAgentByName: vi.fn(async () => ({
    generateSample: mocks.generateSample,
    beginApproval: mocks.beginApproval,
  })),
}));

import { discoverManagedFarmerProfileByNameAction } from "@/features/profile-agent/actions";

const actionInput = {
  fullName: "Anita Patil",
  locationHint: "Nashik Maharashtra",
  farmingHint: "grapes",
  idempotencyKey: "00000000-0000-4000-8000-000000000301",
};

const sample = {
  fullName: "Anita Patil",
  headline: "Grape farmer",
  state: "Maharashtra" as const,
  bio: "A private FarmerBook profile draft supported by public evidence.",
  categorySlugs: ["grapes"],
  farmingMethod: "natural" as const,
  experienceYears: 12,
  socialLinks: {
    linkedin: "https://www.linkedin.com/in/anita-patil",
  },
  claims: [
    {
      field: "fullName" as const,
      value: "Anita Patil",
      sourceUrl: "https://www.linkedin.com/in/anita-patil",
      excerpt: "Anita Patil is a grape farmer near Nashik.",
      confidence: 0.9,
    },
  ],
  limitations: ["Identity and Farmer role remain unverified."],
};

describe("managed profile name discovery action", () => {
  beforeEach(() => {
    mocks.flagsEnabled = true;
    mocks.requireAdmin.mockReset();
    mocks.userRpc.mockReset();
    mocks.adminRpc.mockReset();
    mocks.search.mockReset();
    mocks.analyze.mockReset();
    mocks.generateSample.mockReset();
    mocks.beginApproval.mockReset();
    mocks.requireAdmin.mockResolvedValue({ id: "admin", demo: false });
    mocks.search.mockResolvedValue({
      query: '"Anita Patil" farmer agriculture India',
      results: [
        {
          sourceUrl: "https://www.linkedin.com/in/anita-patil",
          sourceType: "linkedin",
          sourceTitle: "Anita Patil - Farmer",
          sourceText: "Anita Patil is a grape farmer near Nashik.",
          discoveryProvider: "brave_search",
          usageRightsBasis: "provider_storage_plan",
        },
      ],
    });
    mocks.analyze.mockResolvedValue({
      suggestedRole: "farmer",
      preferredLocale: "en-IN",
      categorySlugs: ["grapes"],
      rationale: "The supplied results explicitly describe farming.",
      introductionDraft:
        "FarmerBook can help this Farmer build a professional agriculture profile.",
      run: {
        model: "deterministic-template",
        promptVersion: "outreach-2026-08-11.1",
        status: "fallback",
        failureCode: "AI_NOT_CONFIGURED",
        durationMs: 0,
      },
    });
    mocks.generateSample.mockResolvedValue({
      sample,
      run: {
        model: "deterministic-template",
        promptVersion: "farmer-profile-sample-2026-08-11.1",
        status: "fallback",
        failureCode: "AI_NOT_CONFIGURED",
        durationMs: 0,
      },
    });
    mocks.beginApproval.mockResolvedValue({
      workflowId: "workflow-301",
      code: "STARTED",
    });
    mocks.userRpc.mockImplementation(async (name: string) => {
      if (name === "reserve_managed_profile_search") {
        return {
          data: [{
            code: "RESERVED",
            search_request_id: "00000000-0000-4000-8000-000000000302",
            prospect_id: null,
            sample_id: null,
          }],
          error: null,
        };
      }
      if (name === "create_outreach_prospect") {
        return {
          data: [{
            code: "CREATED",
            prospect_id: "00000000-0000-4000-8000-000000000303",
            revision: 0,
          }],
          error: null,
        };
      }
      return { data: [{ code: "RECORDED", state: "succeeded" }], error: null };
    });
    mocks.adminRpc.mockImplementation(async (name: string) => {
      if (name === "save_managed_profile_sample") {
        return {
          data: [{
            code: "CREATED",
            sample_id: "00000000-0000-4000-8000-000000000304",
            revision: 0,
          }],
          error: null,
        };
      }
      return { data: [{ code: "WORKFLOW_LINKED", revision: 1 }], error: null };
    });
  });

  it("does no auth, provider or database work while the rollout flag is off", async () => {
    mocks.flagsEnabled = false;
    await expect(
      discoverManagedFarmerProfileByNameAction(actionInput),
    ).resolves.toMatchObject({ ok: false, code: "FEATURE_DISABLED" });
    expect(mocks.requireAdmin).not.toHaveBeenCalled();
    expect(mocks.search).not.toHaveBeenCalled();
    expect(mocks.userRpc).not.toHaveBeenCalled();
  });

  it("reserves quota, stores provider provenance and builds the private sample", async () => {
    await expect(
      discoverManagedFarmerProfileByNameAction(actionInput),
    ).resolves.toMatchObject({
      ok: true,
      data: {
        prospectId: "00000000-0000-4000-8000-000000000303",
        sampleId: "00000000-0000-4000-8000-000000000304",
        sourcesFound: 1,
      },
    });
    expect(mocks.userRpc).toHaveBeenCalledWith(
      "reserve_managed_profile_search",
      expect.objectContaining({ idempotency_key_input: actionInput.idempotencyKey }),
    );
    expect(mocks.adminRpc).toHaveBeenCalledWith(
      "save_managed_profile_sample",
      expect.objectContaining({
        sources_input: [
          expect.objectContaining({
            discoveryProvider: "brave_search",
            usageRightsBasis: "provider_storage_plan",
            providerQueryHash: expect.stringMatching(/^[0-9a-f]{64}$/),
          }),
        ],
      }),
    );
    expect(mocks.userRpc).toHaveBeenCalledWith(
      "complete_managed_profile_search",
      expect.objectContaining({
        outcome_input: expect.objectContaining({ state: "succeeded" }),
      }),
    );
  });

  it("records a no-match outcome without creating a prospect or sample", async () => {
    mocks.search.mockResolvedValue({ query: "query", results: [] });
    await expect(
      discoverManagedFarmerProfileByNameAction(actionInput),
    ).resolves.toMatchObject({ ok: false, code: "SEARCH_NO_MATCH" });
    expect(mocks.userRpc).toHaveBeenCalledWith(
      "complete_managed_profile_search",
      expect.objectContaining({
        outcome_input: expect.objectContaining({
          state: "failed",
          failureCode: "SEARCH_NO_MATCH",
        }),
      }),
    );
    expect(mocks.adminRpc).not.toHaveBeenCalled();
  });
});
