import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  requireUser: vi.fn(),
  recordProductEvent: vi.fn(),
  from: vi.fn(),
  upsert: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));
vi.mock("@/features/auth/require-user", () => ({
  requireUser: mocks.requireUser,
}));
vi.mock("@/features/analytics/events", () => ({
  recordProductEvent: mocks.recordProductEvent,
}));

import {
  setBlockAction,
  setFollowAction,
} from "@/features/network/actions";

describe("network relationship actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      demo: false,
      profile: {
        handle: "current_farmer",
        fullName: "Current Farmer",
        status: "active",
        onboardingComplete: true,
        accountRole: "farmer",
      },
    });
    mocks.upsert.mockResolvedValue({ error: null });
    mocks.from.mockReturnValue({ upsert: mocks.upsert });
    mocks.createClient.mockResolvedValue({ from: mocks.from });
  });

  it("creates a follow with insert-or-ignore semantics that need no UPDATE grant", async () => {
    const result = await setFollowAction({
      profileId: "22222222-2222-4222-8222-222222222222",
      active: true,
    });

    expect(result).toEqual({ ok: true, demo: false });
    expect(mocks.from).toHaveBeenCalledWith("follows");
    expect(mocks.upsert).toHaveBeenCalledWith(
      {
        follower_id: "11111111-1111-4111-8111-111111111111",
        followed_id: "22222222-2222-4222-8222-222222222222",
      },
      {
        onConflict: "follower_id,followed_id",
        ignoreDuplicates: true,
      },
    );
    expect(mocks.recordProductEvent).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111",
      "profile_followed",
    );
  });

  it("uses the same immutable insert-or-ignore contract for blocking", async () => {
    const result = await setBlockAction(
      "22222222-2222-4222-8222-222222222222",
      true,
    );

    expect(result).toEqual({ ok: true, demo: false });
    expect(mocks.from).toHaveBeenCalledWith("blocks");
    expect(mocks.upsert).toHaveBeenCalledWith(
      {
        blocker_id: "11111111-1111-4111-8111-111111111111",
        blocked_id: "22222222-2222-4222-8222-222222222222",
      },
      {
        onConflict: "blocker_id,blocked_id",
        ignoreDuplicates: true,
      },
    );
  });

  it("keeps database details private when relationship creation fails", async () => {
    mocks.upsert.mockResolvedValue({
      error: {
        code: "42501",
        message: "permission denied for table follows",
      },
    });

    const result = await setFollowAction({
      profileId: "22222222-2222-4222-8222-222222222222",
      active: true,
    });

    expect(result).toEqual({
      ok: false,
      message: "The follow setting could not be changed. Please try again.",
    });
    expect(JSON.stringify(result)).not.toContain("permission denied");
    expect(mocks.recordProductEvent).not.toHaveBeenCalled();
  });
});
