"use server";

import { requireUser } from "@/features/auth/require-user";
import { recordProductEvent } from "@/features/analytics/events";
import { getSiteUrl } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function deleteAccountAction() {
  const user = await requireUser();
  if (user.demo) {
    return { ok: true as const, demo: true };
  }

  const supabase = createAdminClient();

  const { error: postError } = await supabase
    .from("posts")
    .update({ status: "removed", updated_at: new Date().toISOString() })
    .eq("author_id", user.id);

  if (postError) {
    return { ok: false as const, message: postError.message };
  }

  const { error: commentError } = await supabase
    .from("comments")
    .update({ status: "removed", updated_at: new Date().toISOString() })
    .eq("author_id", user.id);

  if (commentError) {
    return { ok: false as const, message: commentError.message };
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ status: "deleted", updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (profileError) {
    return { ok: false as const, message: profileError.message };
  }

  await recordProductEvent(user.id, "account_deleted");
  const sessionClient = await createClient();
  await sessionClient.auth.signOut();
  return { ok: true as const, demo: false };
}

export async function requestCurrentPasswordResetAction() {
  const user = await requireUser();
  if (user.demo) return { ok: true as const, demo: true };
  if (!user.email) {
    return { ok: false as const, message: "No email is attached to this account." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
    redirectTo: `${getSiteUrl()}/auth/callback?next=/settings/account`,
  });

  return error
    ? { ok: false as const, message: error.message }
    : { ok: true as const, demo: false };
}
