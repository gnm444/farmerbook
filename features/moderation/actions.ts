"use server";

import { requireAdmin } from "@/features/auth/require-admin";
import { requireUser } from "@/features/auth/require-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  moderationActionSchema,
  reportSchema,
  userModerationSchema,
} from "./schemas";

export async function createReportAction(input: unknown) {
  const parsed = reportSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, message: parsed.error.issues[0]?.message };
  }

  const user = await requireUser();
  if (user.demo) {
    return { ok: true as const, demo: true };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    target_type: parsed.data.targetType,
    target_id: parsed.data.targetId,
    reason: parsed.data.reason,
    details: parsed.data.details,
  });

  return error
    ? { ok: false as const, message: error.message }
    : { ok: true as const, demo: false };
}

export async function moderateReportAction(input: unknown) {
  const parsed = moderationActionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, message: "Invalid moderation action." };
  }

  const admin = await requireAdmin();
  if (admin.demo) {
    return { ok: true as const, demo: true };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.rpc("apply_moderation_action", {
    report_id_input: parsed.data.reportId,
    action_input: parsed.data.action,
    target_id_input: parsed.data.targetId,
    target_type_input: parsed.data.targetType,
    note_input: parsed.data.note,
    moderator_id_input: admin.id,
  });

  return error
    ? { ok: false as const, message: error.message }
    : { ok: true as const, demo: false };
}

export async function moderateUserAction(input: unknown) {
  const parsed = userModerationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, message: "Invalid participant action." };
  }

  const admin = await requireAdmin();
  if (admin.demo) {
    return { ok: true as const, demo: true };
  }

  const supabase = createAdminClient();
  const { action, userId, note } = parsed.data;
  const profileUpdate =
    action === "verify"
      ? { verification_status: "verified" }
      : action === "reject"
        ? { verification_status: "rejected" }
        : action === "suspend"
          ? { status: "suspended" }
          : { status: "active" };

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ ...profileUpdate, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (profileError) {
    return { ok: false as const, message: profileError.message };
  }

  const auditAction =
    action === "restore" ? "unsuspend" : action;
  const { error: auditError } = await supabase
    .from("moderation_actions")
    .insert({
      moderator_id: admin.id,
      action: auditAction,
      target_type: "profile",
      target_id: userId,
      note: note || `Participant action: ${action}.`,
    });

  return auditError
    ? { ok: false as const, message: auditError.message }
    : { ok: true as const, demo: false };
}
