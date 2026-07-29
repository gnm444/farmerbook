"use server";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export type ProductEventName =
  | "signup_completed"
  | "profile_completed"
  | "post_created"
  | "comment_created"
  | "reaction_added"
  | "profile_followed"
  | "conversation_started"
  | "message_sent"
  | "content_reported"
  | "account_deleted";

export async function recordProductEvent(
  userId: string,
  eventName: ProductEventName,
  metadata: Record<string, string | number | boolean | null> = {},
) {
  if (!isSupabaseConfigured()) return;

  try {
    const supabase = await createClient();
    await supabase.from("product_events").insert({
      user_id: userId,
      event_name: eventName,
      metadata,
    });
  } catch {
    // Product analytics is best-effort and never blocks the participant action.
  }
}
