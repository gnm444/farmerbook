import { afterEach, describe, expect, it, vi } from "vitest";
import { requireAdmin } from "@/features/auth/require-admin";
import { requireUser } from "@/features/auth/require-user";
import { loadMessagesData } from "@/features/messages/queries";
import { loadPendingReports } from "@/features/moderation/queries";
import { loadFeedPosts } from "@/features/posts/queries";
import {
  loadDiscoverProfiles,
  loadNetworkProfiles,
  loadPublicFarmerProfile,
} from "@/features/profiles/queries";

describe("explicit demonstration mode", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("never substitutes community fixtures merely because Supabase is absent", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "false");

    await expect(loadFeedPosts()).resolves.toEqual([]);
    await expect(loadDiscoverProfiles()).resolves.toEqual([]);
    await expect(loadNetworkProfiles()).resolves.toEqual({
      following: [],
      followers: [],
    });
    await expect(loadPendingReports()).resolves.toEqual([]);
    await expect(loadPublicFarmerProfile("meera_kulkarni")).resolves.toBeNull();
    await expect(requireUser()).rejects.toThrow(/not configured/i);
    await expect(requireAdmin()).rejects.toThrow(/not configured/i);
    await expect(loadMessagesData()).rejects.toThrow(/not configured/i);
  });

  it("allows fixtures only after the non-production demo flag is explicit", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "true");

    await expect(loadFeedPosts()).resolves.not.toEqual([]);
    await expect(loadDiscoverProfiles()).resolves.not.toEqual([]);
    await expect(loadPendingReports()).resolves.not.toEqual([]);
    await expect(loadPublicFarmerProfile("meera_kulkarni")).resolves.not.toBeNull();
    await expect(requireUser()).resolves.toMatchObject({ demo: true });
    await expect(requireAdmin()).resolves.toMatchObject({ demo: true });
  });
});
