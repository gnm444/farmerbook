"use server";

import { requireUser } from "@/features/auth/require-user";
import { recordProductEvent } from "@/features/analytics/events";
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
        }, {
          onConflict: "follower_id,followed_id",
          ignoreDuplicates: true,
        })
    : supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("followed_id", parsed.data.profileId);
  const { error } = await query;

  if (!error && parsed.data.active) {
    await recordProductEvent(user.id, "profile_followed");
  }

  return error
    ? {
        ok: false as const,
        message: "The follow setting could not be changed. Please try again.",
      }
    : { ok: true as const, demo: false };
}

export async function setBlockAction(profileId: string, active: boolean) {
  const user = await requireUser();
  if (profileId === user.id) {
    return { ok: false as const, message: "You cannot block yourself." };
  }
  if (user.demo) {
    return { ok: true as const, demo: true };
  }

  const supabase = await createClient();
  const query = active
    ? supabase.from("blocks").upsert(
        {
          blocker_id: user.id,
          blocked_id: profileId,
        },
        {
          onConflict: "blocker_id,blocked_id",
          ignoreDuplicates: true,
        },
      )
    : supabase
        .from("blocks")
        .delete()
        .eq("blocker_id", user.id)
        .eq("blocked_id", profileId);
  const { error } = await query;

  return error
    ? {
        ok: false as const,
        message: "The block setting could not be changed. Please try again.",
      }
    : { ok: true as const, demo: false };
}
