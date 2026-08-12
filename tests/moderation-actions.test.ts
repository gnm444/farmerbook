import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

function mockModerationAction(error: { message: string } | null = null) {
  const rpc = vi.fn(async () => ({ data: null, error }));
  const requireAdmin = vi.fn(async () => ({ id: "admin-1", demo: false }));
  vi.doMock("@/features/auth/require-admin", () => ({ requireAdmin }));
  vi.doMock("@/features/auth/require-user", () => ({ requireUser: vi.fn() }));
  vi.doMock("@/features/analytics/events", () => ({ recordProductEvent: vi.fn() }));
  vi.doMock("@/lib/supabase/admin", () => ({
    createAdminClient: vi.fn(() => ({ rpc })),
  }));
  vi.doMock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
  return { requireAdmin, rpc };
}

describe("participant moderation transaction boundary", () => {
  it("delegates the participant mutation and audit to one database RPC", async () => {
    const mocks = mockModerationAction();
    const { moderateUserAction } = await import("@/features/moderation/actions");

    await expect(
      moderateUserAction({
        userId: "profile-1",
        action: "verify",
        note: "Identity evidence reviewed.",
      }),
    ).resolves.toEqual({ ok: true, demo: false });
    expect(mocks.rpc).toHaveBeenCalledWith("apply_moderation_action", {
      report_id_input: null,
      action_input: "verify",
      target_id_input: "profile-1",
      target_type_input: "profile",
      note_input: "Identity evidence reviewed.",
      moderator_id_input: "admin-1",
    });
  });

  it("returns a stable failure without exposing database detail", async () => {
    mockModerationAction({ message: "private transaction detail" });
    const { moderateUserAction } = await import("@/features/moderation/actions");

    const result = await moderateUserAction({
      userId: "profile-1",
      action: "suspend",
      note: "Policy review.",
    });
    expect(result).toEqual({
      ok: false,
      message: "The participant action could not be saved. Please try again.",
    });
    expect(JSON.stringify(result)).not.toContain("private transaction");
  });
});
