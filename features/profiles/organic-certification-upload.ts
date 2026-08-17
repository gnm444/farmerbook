"use client";

import { getPublicSupabaseConfig } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";

const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);

export async function uploadOrganicCertificate(file: File) {
  if (!allowedTypes.has(file.type) || file.size < 1 || file.size > 10 * 1024 * 1024) {
    throw new Error("Choose a PDF, JPEG or PNG file up to 10 MB.");
  }
  const extension = file.type === "application/pdf"
    ? "pdf"
    : file.type === "image/png" ? "png" : "jpg";
  if (!getPublicSupabaseConfig()) {
    return { path: `demo/organic-${crypto.randomUUID()}.${extension}` };
  }
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Sign in before uploading certification paperwork.");
  const path = `${auth.user.id}/organic-${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from("organic-certificates")
    .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
  if (error) throw new Error("The certificate file could not be uploaded. Please try again.");
  return { path };
}

export async function removeOrganicCertificate(path: string) {
  if (!getPublicSupabaseConfig()) return;
  await createClient().storage.from("organic-certificates").remove([path]);
}
