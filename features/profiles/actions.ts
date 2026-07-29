"use server";

import { profileSchema } from "./schemas";
import { requireUser } from "@/features/auth/require-user";
import { createClient } from "@/lib/supabase/server";

export async function saveProfileAction(input: unknown) {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, message: parsed.error.issues[0]?.message };
  }

  const user = await requireUser();
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

  return error
    ? { ok: false as const, message: error.message }
    : { ok: true as const, demo: false };
}
