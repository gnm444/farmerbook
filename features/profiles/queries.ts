import { requireUser } from "@/features/auth/require-user";
import {
  currentUserId,
  getProfile,
  profiles as demoProfiles,
} from "@/lib/demo-data";
import { mapProfile, type ProfileRow } from "@/lib/data-mappers";
import { throwDataUnavailable } from "@/lib/data-errors";
import { isDemoMode, isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type {
  CategoryRelationship,
  FarmerProfile,
  ProfileCategoryAffinity,
} from "@/lib/types";
import { trustedOAuthAvatarForUser } from "./oauth-avatar";

const profileColumns =
  "id, handle, full_name, participant_type, account_role, district, state, crops, bio, verification_status, experience_years, farming_method, website_url, linkedin_url, instagram_url, facebook_url, youtube_url, avatar_path, cover_path, public_profile_enabled, created_at";

function isMissingAffinitySchema(error: { code?: string } | null) {
  return error?.code === "PGRST205" || error?.code === "42P01";
}

async function hydrateProfiles(
  rows: ProfileRow[],
  optionsFor: (row: ProfileRow) => {
    followers?: number;
    following?: number;
    isFollowing?: boolean;
    avatarUrl?: string;
    avatarSource?: "oauth" | "uploaded";
    categoryAffinities?: ProfileCategoryAffinity[];
  } = () => ({}),
) {
  if (!rows.length) return [];
  const supabase = await createClient();
  const avatarUrls = new Map<string, string>();
  const coverUrls = new Map<string, string>();
  const affinitiesByProfile = new Map<string, ProfileCategoryAffinity[]>();

  const { data: affinityRows, error: affinityError } = await supabase
    .from("profile_category_affinities")
    .select("profile_id, category_slug, relationship, is_primary")
    .in("profile_id", rows.map((row) => row.id));
  if (affinityError && !isMissingAffinitySchema(affinityError)) {
    throw new Error("Agriculture profile details are temporarily unavailable.");
  }
  for (const affinity of affinityRows ?? []) {
    const profileId = affinity.profile_id as string;
    affinitiesByProfile.set(profileId, [
      ...(affinitiesByProfile.get(profileId) ?? []),
      {
        categorySlug: affinity.category_slug as string,
        relationship: affinity.relationship as CategoryRelationship,
        isPrimary: Boolean(affinity.is_primary),
      },
    ]);
  }

  await Promise.all(
    rows.flatMap((row) => {
      const media: Promise<void>[] = [];
      if (row.avatar_path) {
        media.push(
          supabase.storage
            .from("avatars")
            .createSignedUrl(row.avatar_path, 60 * 60)
            .then(({ data }) => {
              if (data?.signedUrl) avatarUrls.set(row.id, data.signedUrl);
            }),
        );
      }
      if (row.cover_path) {
        media.push(
          supabase.storage
            .from("avatars")
            .createSignedUrl(row.cover_path, 60 * 60)
            .then(({ data }) => {
              if (data?.signedUrl) coverUrls.set(row.id, data.signedUrl);
            }),
        );
      }
      return media;
    }),
  );

  return rows.map((row) => {
    const options = optionsFor(row);
    const uploadedAvatar = avatarUrls.get(row.id);
    return mapProfile(row, {
      ...options,
      avatarUrl: uploadedAvatar ?? options.avatarUrl,
      avatarSource: uploadedAvatar ? "uploaded" : options.avatarSource,
      coverUrl: coverUrls.get(row.id),
      categoryAffinities: affinitiesByProfile.get(row.id) ?? [],
    });
  });
}

export async function loadPublicFarmerProfile(handle: string) {
  if (!isSupabaseConfigured()) {
    if (!isDemoMode()) return null;
    return (
      demoProfiles.find(
        (profile) =>
          profile.handle === handle &&
          profile.accountRole === "farmer" &&
          profile.publicProfileEnabled,
      ) ?? null
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(profileColumns)
    .eq("handle", handle)
    .eq("account_role", "farmer")
    .eq("public_profile_enabled", true)
    .maybeSingle();

  if (error) {
    console.error("Public Farmer profile query failed:", error.message);
    return null;
  }
  if (!data) return null;

  const [profile] = await hydrateProfiles([data as ProfileRow]);
  return profile ?? null;
}

export async function loadCurrentProfile(
  options: { allowIncomplete?: boolean } = {},
): Promise<FarmerProfile> {
  if (!isSupabaseConfigured()) {
    if (!isDemoMode()) throwDataUnavailable("profiles.current");
    return getProfile(currentUserId);
  }

  const user = await requireUser(options);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(profileColumns)
    .eq("id", user.id)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Your FarmerBook profile was not found.");
  }

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  const oauthAvatar =
    !(data as ProfileRow).avatar_path && authUser
      ? trustedOAuthAvatarForUser(authUser)
      : undefined;
  const [profile] = await hydrateProfiles([data as ProfileRow], () => ({
    avatarUrl: oauthAvatar?.url,
    avatarSource: oauthAvatar ? "oauth" : undefined,
  }));
  return profile;
}

export async function loadProfilesByIds(
  ids: string[],
): Promise<FarmerProfile[]> {
  if (!ids.length) return [];
  if (!isSupabaseConfigured()) {
    if (!isDemoMode()) return [];
    const selected = new Set(ids);
    return demoProfiles.filter((profile) => selected.has(profile.id));
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(profileColumns)
    .in("id", ids);

  if (error) throw new Error(error.message);
  return hydrateProfiles(data as ProfileRow[]);
}

export async function loadDiscoverProfiles(): Promise<FarmerProfile[]> {
  if (!isSupabaseConfigured()) return isDemoMode() ? demoProfiles : [];

  const user = await requireUser();
  const supabase = await createClient();
  const [{ data, error }, { data: followRows, error: followError }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select(profileColumns)
        .eq("status", "active")
        .neq("id", user.id)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("follows")
        .select("followed_id")
        .eq("follower_id", user.id),
    ]);

  if (error || followError) {
    throw new Error(error?.message ?? followError?.message);
  }

  const following = new Set(
    (followRows ?? []).map((row) => row.followed_id as string),
  );
  return hydrateProfiles(
    data as ProfileRow[],
    (row) => ({ isFollowing: following.has(row.id) }),
  );
}

export async function loadNetworkProfiles() {
  if (!isSupabaseConfigured()) {
    if (!isDemoMode()) return { following: [], followers: [] };
    return {
      following: demoProfiles.filter((profile) =>
        ["ramesh", "anjali", "vikram"].includes(profile.id),
      ),
      followers: demoProfiles.filter((profile) =>
        ["ramesh", "suresh", "priya", "vikram"].includes(profile.id),
      ),
    };
  }

  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("follows")
    .select("follower_id, followed_id")
    .or(`follower_id.eq.${user.id},followed_id.eq.${user.id}`);

  if (error) throw new Error(error.message);

  const followingIds = (data ?? [])
    .filter((row) => row.follower_id === user.id)
    .map((row) => row.followed_id as string);
  const followerIds = (data ?? [])
    .filter((row) => row.followed_id === user.id)
    .map((row) => row.follower_id as string);
  const directory = await loadProfilesByIds([
    ...new Set([...followingIds, ...followerIds]),
  ]);
  const byId = new Map(directory.map((profile) => [profile.id, profile]));

  return {
    following: followingIds
      .map((id) => byId.get(id))
      .filter((profile): profile is FarmerProfile => Boolean(profile)),
    followers: followerIds
      .map((id) => byId.get(id))
      .filter((profile): profile is FarmerProfile => Boolean(profile)),
  };
}

export async function loadProfileByHandle(handle: string) {
  if (!isSupabaseConfigured()) {
    if (!isDemoMode()) return null;
    return (
      demoProfiles.find((profile) => profile.handle === handle) ?? null
    );
  }

  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(profileColumns)
    .eq("handle", handle)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const [{ count: followers }, { count: following }, { data: relation }] =
    await Promise.all([
      supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("followed_id", data.id),
      supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", data.id),
      supabase
        .from("follows")
        .select("followed_id")
        .eq("follower_id", user.id)
        .eq("followed_id", data.id)
        .maybeSingle(),
    ]);

  const [profile] = await hydrateProfiles(
    [data as ProfileRow],
    () => ({
      followers: followers ?? 0,
      following: following ?? 0,
      isFollowing: Boolean(relation),
    }),
  );
  return profile;
}
