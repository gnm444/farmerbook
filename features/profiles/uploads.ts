"use client";

import { getPublicSupabaseConfig } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

async function uploadProfileImage(file: File, kind: "avatar" | "cover") {
  if (!allowedTypes.has(file.type)) {
    throw new Error("Choose a JPEG, PNG or WebP image.");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error(
      `${kind === "avatar" ? "Avatar" : "Background"} images must be 5 MB or smaller.`,
    );
  }
  if (!getPublicSupabaseConfig()) {
    return { path: undefined, url: URL.createObjectURL(file) };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in before uploading a profile image.");

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${user.id}/${kind}-${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, file, { cacheControl: "3600", upsert: false });
  if (error) {
    throw new Error("The profile image could not be uploaded. Please try again.");
  }

  const { data } = await supabase.storage
    .from("avatars")
    .createSignedUrl(path, 60 * 60);
  return { path, url: data?.signedUrl };
}

export function uploadAvatar(file: File) {
  return uploadProfileImage(file, "avatar");
}

export function uploadProfileCover(file: File) {
  return uploadProfileImage(file, "cover");
}

export async function removeProfileImage(path: string) {
  if (!getPublicSupabaseConfig()) return;
  const supabase = createClient();
  await supabase.storage.from("avatars").remove([path]);
}

export const removeAvatar = removeProfileImage;
