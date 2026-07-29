import { afterEach, describe, expect, it, vi } from "vitest";
import { createdLabel, mapProfile } from "@/lib/data-mappers";

afterEach(() => {
  vi.useRealTimers();
});

describe("Supabase record mapping", () => {
  it("maps a database profile into the public FarmerBook shape", () => {
    const profile = mapProfile(
      {
        id: "profile-id",
        handle: "asha_grows",
        full_name: "Asha Rao",
        participant_type: "farmer",
        district: "Nashik",
        state: "Maharashtra",
        crops: ["Tomato"],
        bio: "Learning with nearby growers.",
        verification_status: "verified",
        experience_years: 9,
        avatar_path: "profile-id/avatar.webp",
        created_at: "2026-07-01T00:00:00.000Z",
      },
      { followers: 12, following: 8, isFollowing: true },
    );

    expect(profile).toMatchObject({
      id: "profile-id",
      fullName: "Asha Rao",
      initials: "AR",
      verified: true,
      followers: 12,
      isFollowing: true,
      avatarPath: "profile-id/avatar.webp",
    });
  });

  it("turns recent timestamps into readable feed labels", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-29T12:30:00.000Z"));
    expect(createdLabel("2026-07-29T12:12:00.000Z")).toBe("18 min ago");
  });
});
