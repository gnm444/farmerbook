import { throwDataUnavailable } from "@/lib/data-errors";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { ProduceListing } from "@/lib/types";
import type { MarketplaceMatchDocument } from "./matching-contracts";

const publicMatchListingColumns =
  "id, farmer_id, title, crop, variety, description, quantity, unit, price, price_unit, delivery_options, delivery_radius_km, status";
const publicMatchProfileColumns =
  "id, handle, full_name, district, state, crops, bio";

type PublicMatchListingRow = {
  id: string;
  farmer_id: string;
  title: string;
  crop: string;
  variety: string;
  description: string;
  quantity: number;
  unit: string;
  price: number;
  price_unit: string;
  delivery_options: string[];
  delivery_radius_km: number | null;
  status: string;
};

type PublicMatchProfileRow = {
  id: string;
  handle: string;
  full_name: string;
  district: string;
  state: string;
  crops: string[];
  bio: string;
};

export function marketplaceDocumentsFromListings(
  listings: ProduceListing[],
): MarketplaceMatchDocument[] {
  return listings
    .filter((listing) => listing.status === "active" && listing.seller)
    .map((listing) => ({
      listingId: listing.id,
      title: listing.title,
      crop: listing.crop,
      variety: listing.variety,
      description: listing.description,
      quantity: listing.quantity,
      unit: listing.unit,
      price: listing.price,
      priceUnit: listing.priceUnit,
      deliveryOptions: listing.deliveryOptions,
      ...(listing.deliveryRadiusKm ? { deliveryRadiusKm: listing.deliveryRadiusKm } : {}),
      profileName: listing.seller!.fullName,
      profileHandle: listing.seller!.handle,
      district: listing.seller!.district,
      state: listing.seller!.state,
      profileCrops: listing.seller!.crops,
      profileBio: listing.seller!.bio,
    }));
}

/**
 * Retrieve the small, public-only corpus needed by the matcher. This avoids
 * optional reviews, media, and profile-affinity joins so a missing enrichment
 * table cannot make product discovery unavailable.
 */
export async function loadPublicMarketplaceMatchDocuments() {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data: listingRows, error: listingError } = await supabase
    .from("produce_listings")
    .select(publicMatchListingColumns)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(100);
  if (listingError) {
    throwDataUnavailable("marketplace.match-listings");
  }
  const listings = (listingRows ?? []) as PublicMatchListingRow[];
  if (!listings.length) return [];

  const farmerIds = [...new Set(listings.map((listing) => listing.farmer_id))];
  const { data: profileRows, error: profileError } = await supabase
    .from("profiles")
    .select(publicMatchProfileColumns)
    .in("id", farmerIds);
  if (profileError) {
    throwDataUnavailable("marketplace.match-profiles");
  }
  const profilesById = new Map(
    ((profileRows ?? []) as PublicMatchProfileRow[]).map((profile) => [profile.id, profile]),
  );

  return marketplaceDocumentsFromPublicRows(listings, profilesById);
}

function marketplaceDocumentsFromPublicRows(
  listings: PublicMatchListingRow[],
  profilesById: Map<string, PublicMatchProfileRow>,
): MarketplaceMatchDocument[] {
  return listings.flatMap((listing) => {
    const profile = profilesById.get(listing.farmer_id);
    if (listing.status !== "active" || !profile) return [];
    return [{
      listingId: listing.id,
      title: listing.title,
      crop: listing.crop,
      variety: listing.variety,
      description: listing.description,
      quantity: Number(listing.quantity),
      unit: listing.unit,
      price: Number(listing.price),
      priceUnit: listing.price_unit,
      deliveryOptions: listing.delivery_options ?? [],
      ...(listing.delivery_radius_km
        ? { deliveryRadiusKm: listing.delivery_radius_km }
        : {}),
      profileName: profile.full_name,
      profileHandle: profile.handle,
      district: profile.district,
      state: profile.state,
      profileCrops: profile.crops ?? [],
      profileBio: profile.bio,
    } satisfies MarketplaceMatchDocument];
  });
}
