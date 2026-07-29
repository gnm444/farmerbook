"use server";

import { requireUser } from "@/features/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { relationshipSchema } from "./schemas";

export async function setFollowAction(input: unknown) {
  const parsed = relationshipSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, message: "Invalid follow request." };
  }

  const user = await requireUser();
  if (parsed.data.profileId === user.id) {
    return { ok: false as const, message: "You cannot follow yourself." };
  }
  if (user.demo) {
    return { ok: true as const, demo: true };
  }

  const supabase = await createClient();
  const query = parsed.data.active
    ? supabase
        .from("follows")
        .upsert({
          follower_id: user.id,
          followed_id: parsed.data.profileId,
        })
    : supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("followed_id", parsed.data.profileId);
  const { error } = await query;

  return error
    ? { ok: false as const, message: error.message }
    : { ok: true as const, demo: false };
}

export async function blockProfileAction(profileId: string) {
  const user = await requireUser();
  if (profileId === user.id) {
    return { ok: false as const, message: "You cannot block yourself." };
  }
  if (user.demo) {
    return { ok: true as const, demo: true };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("blocks").upsert({
    blocker_id: user.id,
    blocked_id: profileId,
  });

  return error
    ? { ok: false as const, message: error.message }
    : { ok: true as const, demo: false };
}
