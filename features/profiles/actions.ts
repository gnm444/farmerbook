"use server";

import { profileSchema } from "./schemas";
import { recordProductEvent } from "@/features/analytics/events";
import { requireUser } from "@/features/auth/require-user";
import { createClient } from "@/lib/supabase/server";

export async function saveProfileAction(input: unknown) {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, message: parsed.error.issues[0]?.message };
  }

  const user = await requireUser({ allowIncomplete: true });
  if (user.demo) {
    return { ok: true as const, demo: true };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({
    full_name: parsed.data.fullName,
    handle: parsed.data.handle,
    participant_type: parsed.data.participantType,
    district: parsed.data.district,
    state: parsed.data.state,
    crops: parsed.data.crops,
    bio: parsed.data.bio,
    preferred_language: parsed.data.preferredLanguage,
    experience_years: parsed.data.experienceYears,
    onboarding_complete: true,
    updated_at: new Date().toISOString(),
  }).eq("id", user.id);

  if (!error) {
    await recordProductEvent(user.id, "profile_completed");
  }

  return error
    ? { ok: false as const, message: error.message }
    : { ok: true as const, demo: false };
}

export async function saveAvatarAction(path: string | undefined) {
  const user = await requireUser({ allowIncomplete: true });
  if (user.demo) {
    return { ok: true as const, demo: true, previousPath: undefined };
  }
  if (!path || !path.startsWith(`${user.id}/`) || path.length > 500) {
    return { ok: false as const, message: "The avatar path is invalid." };
  }

  const supabase = await createClient();
  const { data: current, error: currentError } = await supabase
    .from("profiles")
    .select("avatar_path")
    .eq("id", user.id)
    .single();
  if (currentError) {
    return { ok: false as const, message: currentError.message };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_path: path, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  return error
    ? { ok: false as const, message: error.message }
    : {
        ok: true as const,
        demo: false,
        previousPath: current.avatar_path as string | undefined,
      };
}
