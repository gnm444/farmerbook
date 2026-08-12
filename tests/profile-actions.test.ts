import { afterEach, describe, expect, it, vi } from "vitest";

const profileInput = {
  fullName: "Meera Kulkarni",
  handle: "meera_kulkarni",
  participantType: "farmer",
  accountRole: "farmer",
  district: "Nashik",
  state: "Maharashtra",
  crops: ["Tomato"],
  bio: "Second-generation farmer.",
  preferredLanguage: "en",
  preferredLocale: "en-IN",
  experienceYears: 8,
  farmingMethod: "natural",
  socialLinks: {},
  termsAccepted: true,
} as const;

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

function mockProfileAction(options: {
  onboardingComplete: boolean;
  accountRole?: string;
  rpcError?: { code?: string; message: string } | null;
  updateError?: { message: string } | null;
}) {
  const requireUser = vi.fn(async () => ({
    id: "profile-1",
    demo: false,
    profile: {
      handle: "meera_kulkarni",
      fullName: "Meera Kulkarni",
      status: "active",
      onboardingComplete: options.onboardingComplete,
      accountRole: options.accountRole ?? "farmer",
    },
  }));
  const rpc = vi.fn(async () => ({ data: { code: "COMPLETED" }, error: options.rpcError ?? null }));
  const eq = vi.fn(async () => ({ error: options.updateError ?? null }));
  const update = vi.fn((values: Record<string, unknown>) => {
    void values;
    return { eq };
  });
  const from = vi.fn(() => ({ update }));
  const createClient = vi.fn(async () => ({ rpc, from }));
  const recordProductEvent = vi.fn(async () => undefined);

  vi.doMock("@/features/auth/require-user", () => ({ requireUser }));
  vi.doMock("@/lib/supabase/server", () => ({ createClient }));
  vi.doMock("@/features/analytics/events", () => ({ recordProductEvent }));

  return { createClient, eq, from, recordProductEvent, requireUser, rpc, update };
}

describe("profile action role and completion boundary", () => {
  it("completes a legacy onboarding profile only through the validated RPC", async () => {
    const mocks = mockProfileAction({ onboardingComplete: false });
    const { saveProfileAction } = await import("@/features/profiles/actions");

    await expect(saveProfileAction(profileInput)).resolves.toEqual({
      ok: true,
      demo: false,
    });
    expect(mocks.rpc).toHaveBeenCalledWith("complete_legacy_onboarding", {
      profile_input: profileInput,
    });
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("does not expose legacy RPC failures", async () => {
    const mocks = mockProfileAction({
      onboardingComplete: false,
      rpcError: { message: "private database policy detail" },
    });
    const { saveProfileAction } = await import("@/features/profiles/actions");

    const result = await saveProfileAction(profileInput);
    expect(result).toEqual({
      ok: false,
      message: "The profile could not be completed. Please check the details and try again.",
    });
    expect(JSON.stringify(result)).not.toContain("private database");
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("uses the validated legacy write when production has not installed the completion RPC", async () => {
    const mocks = mockProfileAction({
      onboardingComplete: false,
      rpcError: {
        code: "PGRST202",
        message: "Could not find the function in the schema cache",
      },
    });
    const { saveProfileAction } = await import("@/features/profiles/actions");

    await expect(saveProfileAction(profileInput)).resolves.toEqual({
      ok: true,
      demo: false,
    });
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        account_role: "farmer",
        onboarding_complete: true,
        participant_type: "farmer",
      }),
    );
    expect(mocks.eq).toHaveBeenCalledWith("id", "profile-1");
    expect(mocks.recordProductEvent).toHaveBeenCalledWith(
      "profile-1",
      "profile_completed",
    );
  });

  it("rejects incomplete legacy onboarding without explicit legal consent", async () => {
    const mocks = mockProfileAction({ onboardingComplete: false });
    const { saveProfileAction } = await import("@/features/profiles/actions");
    const withoutConsent = { ...profileInput, termsAccepted: undefined };

    await expect(saveProfileAction(withoutConsent)).resolves.toEqual({
      ok: false,
      message: "Accept the terms, privacy notice and community rules to continue.",
    });
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("rejects a role change on a completed profile before opening a client", async () => {
    const mocks = mockProfileAction({
      onboardingComplete: true,
      accountRole: "customer",
    });
    const { saveProfileAction } = await import("@/features/profiles/actions");

    await expect(saveProfileAction(profileInput)).resolves.toEqual({
      ok: false,
      message: "Account roles cannot be changed from profile settings.",
    });
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("never sends restricted role or completion columns in settings updates", async () => {
    const mocks = mockProfileAction({ onboardingComplete: true });
    const { saveProfileAction } = await import("@/features/profiles/actions");

    await expect(saveProfileAction(profileInput)).resolves.toEqual({
      ok: true,
      demo: false,
    });
    expect(mocks.update).toHaveBeenCalledOnce();
    const updatePayload = mocks.update.mock.calls[0]?.[0];
    expect(updatePayload).not.toHaveProperty("account_role");
    expect(updatePayload).not.toHaveProperty("participant_type");
    expect(updatePayload).not.toHaveProperty("onboarding_complete");
    expect(updatePayload).toMatchObject({
      full_name: profileInput.fullName,
      handle: profileInput.handle,
      district: profileInput.district,
      state: profileInput.state,
    });
    expect(mocks.eq).toHaveBeenCalledWith("id", "profile-1");
  });
});
