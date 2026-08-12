"use server";

import { requireAdmin } from "@/features/auth/require-admin";
import { requireUser } from "@/features/auth/require-user";
import { recordProductEvent } from "@/features/analytics/events";
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

  if (!error) {
    await recordProductEvent(user.id, "content_reported", {
      targetType: parsed.data.targetType,
      reason: parsed.data.reason,
    });
  }

  return error
    ? {
        ok: false as const,
        message: "The report could not be submitted. Please try again.",
      }
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
    ? {
        ok: false as const,
        message: "The moderation action could not be saved. Please try again.",
      }
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
  const { error } = await supabase.rpc("apply_moderation_action", {
    report_id_input: null,
    action_input: action === "restore" ? "unsuspend" : action,
    target_id_input: userId,
    target_type_input: "profile",
    note_input: note || `Participant action: ${action}.`,
    moderator_id_input: admin.id,
  });

  return error
    ? {
        ok: false as const,
        message: "The participant action could not be saved. Please try again.",
      }
    : { ok: true as const, demo: false };
}
