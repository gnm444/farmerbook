"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/features/auth/require-admin";
import { isDemoMode, isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { loadFeaturedFarmerPublication } from "./queries";
import {
  featuredFarmerAccountLinkSchema,
  featuredFarmerAccountUnlinkSchema,
} from "./account-link-schemas";
import { searchFeaturedFarmerLinkableProfiles } from "./account-link-queries";

function unavailable() {
  return { ok: false as const, message: "Featured Farmer account links are temporarily unavailable." };
}

export async function searchFeaturedFarmerAccountLinkAction(query: string) {
  await requireAdmin();
  if (!isSupabaseConfigured() || isDemoMode()) return unavailable();
  if (query.trim().length < 2) {
    return { ok: false as const, message: "Enter at least two characters to search." };
  }
  try {
    return { ok: true as const, profiles: await searchFeaturedFarmerLinkableProfiles(query) };
  } catch (error) {
    return { ok: false as const, message: error instanceof Error ? error.message : "Account search is temporarily unavailable." };
  }
}

export async function linkFeaturedFarmerAccountAction(input: unknown) {
  await requireAdmin();
  if (!isSupabaseConfigured() || isDemoMode()) return unavailable();
  const parsed = featuredFarmerAccountLinkSchema.safeParse(input);
  if (!parsed.success || !(await loadFeaturedFarmerPublication(parsed.data?.slug ?? ""))) {
    return { ok: false as const, message: "Choose a valid Featured Farmer profile and FarmerBook account." };
  }
  const supabase = await createClient();
  const result = await supabase.rpc("link_featured_farmer_account", {
    slug_input: parsed.data.slug,
    profile_id_input: parsed.data.profileId,
    note_input: parsed.data.note,
  });
  if (result.error) return { ok: false as const, message: "The account link could not be saved." };
  revalidatePath(`/featured-farmers/${parsed.data.slug}`);
  revalidatePath("/admin/featured-farmer-links");
  return { ok: true as const };
}

export async function unlinkFeaturedFarmerAccountAction(input: unknown) {
  await requireAdmin();
  if (!isSupabaseConfigured() || isDemoMode()) return unavailable();
  const parsed = featuredFarmerAccountUnlinkSchema.safeParse(input);
  if (!parsed.success || !(await loadFeaturedFarmerPublication(parsed.data?.slug ?? ""))) {
    return { ok: false as const, message: "Choose a valid Featured Farmer profile." };
  }
  const supabase = await createClient();
  const result = await supabase.rpc("unlink_featured_farmer_account", {
    slug_input: parsed.data.slug,
    note_input: parsed.data.note,
  });
  if (result.error || result.data !== true) {
    return { ok: false as const, message: "The account link could not be removed." };
  }
  revalidatePath(`/featured-farmers/${parsed.data.slug}`);
  revalidatePath("/admin/featured-farmer-links");
  return { ok: true as const };
}
