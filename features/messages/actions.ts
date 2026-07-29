"use server";

import { requireUser } from "@/features/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { messageSchema } from "./schemas";

export async function startConversationAction(otherUserId: string) {
  const user = await requireUser();
  if (otherUserId === user.id) {
    return { ok: false as const, message: "Choose another participant." };
  }
  if (user.demo) {
    return {
      ok: true as const,
      demo: true,
      conversationId: `demo-${otherUserId}`,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "get_or_create_direct_conversation",
    { other_user_id: otherUserId },
  );

  return error
    ? { ok: false as const, message: error.message }
    : { ok: true as const, demo: false, conversationId: data };
}

export async function sendMessageAction(input: unknown) {
  const parsed = messageSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, message: parsed.error.issues[0]?.message };
  }

  const user = await requireUser();
  if (user.demo) {
    return { ok: true as const, demo: true };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("messages").insert({
    conversation_id: parsed.data.conversationId,
    sender_id: user.id,
    body: parsed.data.body,
  });

  return error
    ? { ok: false as const, message: error.message }
    : { ok: true as const, demo: false };
}
