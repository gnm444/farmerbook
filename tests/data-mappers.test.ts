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
        account_role: "farmer",
        preferred_locale: "mr-IN",
        district: "Nashik",
        state: "Maharashtra",
        crops: ["Tomato"],
        bio: "Learning with nearby growers.",
        verification_status: "verified",
        experience_years: 9,
        farming_method: "organic",
        website_url: "https://asha.example",
        linkedin_url: null,
        instagram_url: null,
        facebook_url: null,
        youtube_url: null,
        avatar_path: "profile-id/avatar.webp",
        cover_path: "profile-id/cover.webp",
        public_profile_enabled: true,
        created_at: "2026-07-01T00:00:00.000Z",
      },
      {
        followers: 12,
        following: 8,
        isFollowing: true,
        categoryAffinities: [
          { categorySlug: "tomato", relationship: "grows", isPrimary: true },
        ],
      },
    );

    expect(profile).toMatchObject({
      id: "profile-id",
      fullName: "Asha Rao",
      initials: "AR",
      verified: true,
      followers: 12,
      isFollowing: true,
      avatarPath: "profile-id/avatar.webp",
      accountRole: "farmer",
      farmingMethod: "organic",
      roleLabel: "Farmer",
      coverPath: "profile-id/cover.webp",
      publicProfileEnabled: true,
      preferredLocale: "mr-IN",
      categoryAffinities: [
        { categorySlug: "tomato", relationship: "grows", isPrimary: true },
      ],
    });
  });

  it("turns recent timestamps into readable feed labels", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-29T12:30:00.000Z"));
    expect(createdLabel("2026-07-29T12:12:00.000Z")).toBe("18 min ago");
  });

  it("defaults profiles from the pre-locale schema to Indian English", () => {
    const profile = mapProfile({
      id: "legacy-profile",
      handle: "legacy_farmer",
      full_name: "Legacy Farmer",
      participant_type: "farmer",
      account_role: "farmer",
      district: "Nashik",
      state: "Maharashtra",
      crops: ["Tomato"],
      bio: "A production profile created before locale preferences.",
      verification_status: "unverified",
      experience_years: 4,
      farming_method: "natural",
      website_url: null,
      linkedin_url: null,
      instagram_url: null,
      facebook_url: null,
      youtube_url: null,
      avatar_path: null,
      cover_path: null,
      public_profile_enabled: true,
      created_at: "2026-07-01T00:00:00.000Z",
    });

    expect(profile.preferredLocale).toBe("en-IN");
  });
});
