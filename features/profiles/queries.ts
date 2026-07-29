import { requireUser } from "@/features/auth/require-user";
import {
  currentUserId,
  getProfile,
  profiles as demoProfiles,
} from "@/lib/demo-data";
import { mapProfile, type ProfileRow } from "@/lib/data-mappers";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { FarmerProfile } from "@/lib/types";

const profileColumns =
  "id, handle, full_name, participant_type, district, state, crops, bio, verification_status, experience_years, avatar_path, created_at";

async function hydrateProfiles(
  rows: ProfileRow[],
  optionsFor: (row: ProfileRow) => {
    followers?: number;
    following?: number;
    isFollowing?: boolean;
  } = () => ({}),
) {
  if (!rows.length) return [];
  const supabase = await createClient();
  const avatarUrls = new Map<string, string>();

  await Promise.all(
    rows
      .filter((row) => row.avatar_path)
      .map(async (row) => {
        const { data } = await supabase.storage
          .from("avatars")
          .createSignedUrl(row.avatar_path as string, 60 * 60);
        if (data?.signedUrl) avatarUrls.set(row.id, data.signedUrl);
      }),
  );

  return rows.map((row) =>
    mapProfile(row, {
      ...optionsFor(row),
      avatarUrl: avatarUrls.get(row.id),
    }),
  );
}

export async function loadCurrentProfile(
  options: { allowIncomplete?: boolean } = {},
): Promise<FarmerProfile> {
  if (!isSupabaseConfigured()) {
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

  const [profile] = await hydrateProfiles([data as ProfileRow]);
  return profile;
}

export async function loadProfilesByIds(
  ids: string[],
): Promise<FarmerProfile[]> {
  if (!ids.length) return [];
  if (!isSupabaseConfigured()) {
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
  if (!isSupabaseConfigured()) return demoProfiles;

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
