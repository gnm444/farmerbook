"use server";

import { requireUser } from "@/features/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { demoCommentSchema, postSchema } from "./schemas";

export async function createPostAction(input: unknown) {
  const parsed = postSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, message: parsed.error.issues[0]?.message };
  }

  const user = await requireUser();
  if (user.demo) {
    return { ok: true as const, demo: true, postId: "demo-new-post" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .insert({
      author_id: user.id,
      body: parsed.data.body,
      category: parsed.data.category,
      image_path: parsed.data.imagePath ?? null,
    })
    .select("id")
    .single();

  return error
    ? { ok: false as const, message: error.message }
    : { ok: true as const, demo: false, postId: data.id };
}

export async function createCommentAction(input: unknown) {
  const parsed = demoCommentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, message: parsed.error.issues[0]?.message };
  }

  const user = await requireUser();
  if (user.demo) {
    return { ok: true as const, demo: true };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("comments").insert({
    post_id: parsed.data.postId,
    author_id: user.id,
    body: parsed.data.body,
  });

  return error
    ? { ok: false as const, message: error.message }
    : { ok: true as const, demo: false };
}

export async function toggleHelpfulAction(postId: string) {
  const user = await requireUser();
  if (user.demo) {
    return { ok: true as const, demo: true };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("post_reactions")
    .select("post_id")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .maybeSingle();

  const query = existing
    ? supabase
        .from("post_reactions")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", user.id)
    : supabase
        .from("post_reactions")
        .insert({ post_id: postId, user_id: user.id });
  const { error } = await query;

  return error
    ? { ok: false as const, message: error.message }
    : { ok: true as const, demo: false };
}
