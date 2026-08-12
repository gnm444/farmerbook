import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  requireUser: vi.fn(),
  cookieSet: vi.fn(),
  disabledFlag: null as string | null,
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ set: mocks.cookieSet })),
}));
vi.mock("@/features/auth/require-user", () => ({
  requireUser: mocks.requireUser,
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));
vi.mock("@/lib/feature-flags", () => ({
  isFeatureEnabled: (name: string) => name !== mocks.disabledFlag,
}));

import {
  finalizeOnboardingAction,
  saveOnboardingStepAction,
} from "@/features/onboarding/actions";

const profileId = "00000000-0000-4000-8000-000000000010";
const idempotencyKey = "00000000-0000-4000-8000-000000000011";

function progressRow(
  overrides: Record<string, unknown> = {},
) {
  return {
    account_role: "farmer",
    current_step: "role",
    completed_steps: ["language"],
    draft_data: { locale: "en-IN" },
    revision: 1,
    last_idempotency_key: null,
    last_idempotency_fingerprint: null,
    status: "in_progress",
    ...overrides,
  };
}

function readOnlyClient(row: ReturnType<typeof progressRow>) {
  const maybeSingle = vi.fn(async () => ({ data: row, error: null }));
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  return { from, rpc: vi.fn() };
}

describe("onboarding mutation integrity", () => {
  beforeEach(() => {
    mocks.disabledFlag = null;
    mocks.createClient.mockReset();
    mocks.cookieSet.mockReset();
    mocks.requireUser.mockReset().mockResolvedValue({
      id: profileId,
      demo: false,
      profile: {
        accountRole: "farmer",
        onboardingComplete: false,
        status: "active",
      },
    });
  });

  it("rejects direct mutations while resumable onboarding is disabled", async () => {
    mocks.disabledFlag = "ENABLE_RESUMABLE_ONBOARDING";

    await expect(
      saveOnboardingStepAction({
        flowVersion: 1,
        expectedRevision: 0,
        idempotencyKey,
        step: "language",
        data: { locale: "en-IN" },
      }),
    ).resolves.toEqual({
      ok: false,
      code: "FEATURE_DISABLED",
      revision: null,
    });
    await expect(
      finalizeOnboardingAction({ expectedRevision: 0, idempotencyKey }),
    ).resolves.toEqual({
      ok: false,
      code: "FEATURE_DISABLED",
      revision: null,
    });
    expect(mocks.requireUser).not.toHaveBeenCalled();
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("enforces canonical, company-role and extended-locale release dependencies", async () => {
    mocks.disabledFlag = "ENABLE_CANONICAL_AGRICULTURE_TAXONOMY";
    await expect(
      saveOnboardingStepAction({
        flowVersion: 1,
        expectedRevision: 0,
        idempotencyKey,
        step: "language",
        data: { locale: "en-IN" },
      }),
    ).resolves.toMatchObject({ ok: false, code: "FEATURE_DISABLED" });

    mocks.disabledFlag = "ENABLE_EXTENDED_LOCALES";
    await expect(
      saveOnboardingStepAction({
        flowVersion: 1,
        expectedRevision: 0,
        idempotencyKey,
        step: "language",
        data: { locale: "ta-IN" },
      }),
    ).resolves.toMatchObject({ ok: false, code: "FEATURE_DISABLED" });

    mocks.disabledFlag = "ENABLE_AGRI_BUSINESSES";
    await expect(
      saveOnboardingStepAction({
        flowVersion: 1,
        expectedRevision: 1,
        idempotencyKey,
        step: "role",
        data: { accountRole: "agri_business" },
      }),
    ).resolves.toMatchObject({ ok: false, code: "FEATURE_DISABLED" });

    expect(mocks.requireUser).not.toHaveBeenCalled();
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("rejects an out-of-order step before any database write", async () => {
    const client = readOnlyClient(progressRow());
    mocks.createClient.mockResolvedValue(client);

    await expect(
      saveOnboardingStepAction({
        flowVersion: 1,
        expectedRevision: 1,
        idempotencyKey,
        step: "agriculture",
        data: {
          selectedCategorySlugs: ["tomato"],
          customCategoryLabels: [],
        },
      }),
    ).resolves.toEqual({
      ok: false,
      code: "INVALID_INPUT",
      revision: 1,
    });
    expect(client.from).toHaveBeenCalledOnce();
  });

  it("rejects role details that do not match the saved role", async () => {
    const client = readOnlyClient(
      progressRow({
        account_role: "customer",
        current_step: "role_details",
        completed_steps: ["language", "role", "identity_location", "agriculture"],
      }),
    );
    mocks.createClient.mockResolvedValue(client);

    const result = await saveOnboardingStepAction({
      flowVersion: 1,
      expectedRevision: 1,
      idempotencyKey,
      step: "role_details",
      data: {
        accountRole: "farmer",
        farmingMethod: "mixed",
        experienceYears: 2,
      },
    });
    expect(result).toMatchObject({ ok: false, code: "INVALID_INPUT" });
  });

  it("binds an idempotency key to one mutation payload", async () => {
    const client = readOnlyClient(
      progressRow({
        current_step: "identity_location",
        completed_steps: ["language", "role"],
        last_idempotency_key: idempotencyKey,
        last_idempotency_fingerprint: "a".repeat(64),
      }),
    );
    mocks.createClient.mockResolvedValue(client);

    const result = await saveOnboardingStepAction({
      flowVersion: 1,
      expectedRevision: 1,
      idempotencyKey,
      step: "role",
      data: { accountRole: "wholesaler" },
    });
    expect(result).toEqual({
      ok: false,
      code: "IDEMPOTENCY_CONFLICT",
      revision: 1,
    });
  });

  it("maps finalization conflicts and delegates atomic completion to the RPC", async () => {
    const conflictRpc = vi.fn(async () => ({
      data: [{ code: "REVISION_CONFLICT", revision: 5, organization_id: null }],
      error: null,
    }));
    mocks.createClient.mockResolvedValue({ rpc: conflictRpc });
    await expect(
      finalizeOnboardingAction({ expectedRevision: 4, idempotencyKey }),
    ).resolves.toEqual({
      ok: false,
      code: "REVISION_CONFLICT",
      revision: 5,
    });

    const completedRpc = vi.fn(async () => ({
      data: [{ code: "COMPLETED", revision: 5, organization_id: null }],
      error: null,
    }));
    mocks.createClient.mockResolvedValue({ rpc: completedRpc });
    await expect(
      finalizeOnboardingAction({ expectedRevision: 4, idempotencyKey }),
    ).resolves.toMatchObject({ ok: true, code: "COMPLETED", revision: 5 });
    expect(completedRpc).toHaveBeenCalledWith("finalize_onboarding", {
      expected_revision_input: 4,
      idempotency_key_input: idempotencyKey,
    });
  });
});
