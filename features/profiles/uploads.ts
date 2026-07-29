"use client";

import { getPublicSupabaseConfig } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function uploadAvatar(file: File) {
  if (!allowedTypes.has(file.type)) {
    throw new Error("Choose a JPEG, PNG or WebP image.");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Avatar images must be 5 MB or smaller.");
  }
  if (!getPublicSupabaseConfig()) {
    return { path: undefined, url: URL.createObjectURL(file) };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in before uploading an avatar.");

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${user.id}/avatar-${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, file, { cacheControl: "3600", upsert: false });
  if (error) throw new Error(error.message);

  const { data } = await supabase.storage
    .from("avatars")
    .createSignedUrl(path, 60 * 60);
  return { path, url: data?.signedUrl };
}

export async function removeAvatar(path: string) {
  if (!getPublicSupabaseConfig()) return;
  const supabase = createClient();
  await supabase.storage.from("avatars").remove([path]);
}
