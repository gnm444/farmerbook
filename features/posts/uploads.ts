"use client";

import { getPublicSupabaseConfig } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function uploadPostImage(file: File) {
  if (!allowedTypes.has(file.type)) {
    throw new Error("Choose a JPEG, PNG or WebP image.");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Post images must be 5 MB or smaller.");
  }

  if (!getPublicSupabaseConfig()) {
    return {
      path: undefined,
      url: URL.createObjectURL(file),
    };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in before uploading an image.");

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from("post-images")
    .upload(path, file, { cacheControl: "3600", upsert: false });
  if (error) {
    throw new Error("The post image could not be uploaded. Please try again.");
  }

  const { data } = await supabase.storage
    .from("post-images")
    .createSignedUrl(path, 60 * 60);
  return { path, url: data?.signedUrl };
}

export async function removePostImage(path: string) {
  if (!getPublicSupabaseConfig()) return;
  const supabase = createClient();
  await supabase.storage.from("post-images").remove([path]);
}
