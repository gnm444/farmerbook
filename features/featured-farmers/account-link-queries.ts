import { isDemoMode, isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import {
  featuredFarmerLinkableProfileSchema,
  featuredFarmerPublicAccountSchema,
  type FeaturedFarmerLinkableProfile,
  type FeaturedFarmerPublicAccount,
} from "./account-link-schemas";

export async function searchFeaturedFarmerLinkableProfiles(
  query: string,
): Promise<FeaturedFarmerLinkableProfile[]> {
  if (!isSupabaseConfigured() || isDemoMode()) return [];
  const supabase = await createClient();
  const result = await supabase.rpc("search_featured_farmer_linkable_profiles", {
    query_input: query,
    limit_input: 12,
  });
  if (result.error) throw new Error("Account search is temporarily unavailable.");
  return featuredFarmerLinkableProfileSchema.array().parse(result.data ?? []);
}

export async function loadFeaturedFarmerPublicAccount(
  slug: string,
): Promise<FeaturedFarmerPublicAccount | null> {
  if (!isSupabaseConfigured() || isDemoMode()) return null;
  const supabase = await createClient();
  const result = await supabase.rpc("get_featured_farmer_public_account", {
    slug_input: slug,
  });
  if (result.error) return null;
  const row = Array.isArray(result.data) ? result.data[0] : result.data;
  return row ? featuredFarmerPublicAccountSchema.parse(row) : null;
}
