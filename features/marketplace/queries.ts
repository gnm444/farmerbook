import {
  isSellerRole,
  requireUser,
} from "@/features/auth/require-user";
import {
  loadCurrentProfile,
  loadProfilesByIds,
} from "@/features/profiles/queries";
import { createdLabel } from "@/lib/data-mappers";
import {
  DataUnavailableError,
  throwDataUnavailable,
} from "@/lib/data-errors";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type {
  FarmerProfile,
  LeadStatus,
  ListingStatus,
  MarketEnquiry,
  MarketUnit,
  ProduceListing,
  ReviewSummary,
} from "@/lib/types";

type ListingRow = {
  id: string;
  farmer_id: string;
  title: string;
  crop: string;
  variety: string;
  description: string;
  quantity: number;
  unit: MarketUnit;
  min_order: number;
  price: number;
  price_unit: MarketUnit;
  harvest_start: string;
  harvest_end: string;
  available_until: string;
  grade: string;
  delivery_options: string[];
  delivery_radius_km: number | null;
  certifications: string[];
  status: ListingStatus;
  view_count: number;
  save_count: number;
  enquiry_count: number;
  created_at: string;
};

type EnquiryRow = {
  id: string;
  listing_id: string;
  buyer_name: string;
  business_name: string;
  email: string;
  phone: string;
  location: string;
  quantity_needed: string;
  need_by: string;
  message: string;
  status: LeadStatus;
  buyer_id: string | null;
  conversation_id: string | null;
  created_at: string;
};

const listingColumns =
  "id, farmer_id, title, crop, variety, description, quantity, unit, min_order, price, price_unit, harvest_start, harvest_end, available_until, grade, delivery_options, delivery_radius_km, certifications, status, view_count, save_count, enquiry_count, created_at";

function imageVariantFor(crop: string): ProduceListing["imageVariant"] {
  const normalized = crop.toLowerCase();
  if (normalized.includes("grape")) return "grape-vines";
  if (normalized.includes("onion")) return "onion-sacks";
  if (normalized.includes("okra")) return "okra-basket";
  return "tomato-crates";
}

function mapListing(
  row: ListingRow,
  profile?: FarmerProfile,
  reviewSummary: ReviewSummary = { average: 0, count: 0 },
): ProduceListing {
  return {
    id: row.id,
    sellerId: row.farmer_id,
    title: row.title,
    crop: row.crop,
    variety: row.variety,
    description: row.description,
    quantity: Number(row.quantity),
    unit: row.unit,
    minOrder: Number(row.min_order),
    price: Number(row.price),
    priceUnit: row.price_unit,
    harvestStart: row.harvest_start,
    harvestEnd: row.harvest_end,
    availableUntil: row.available_until,
    grade: row.grade,
    deliveryOptions: row.delivery_options ?? [],
    deliveryRadiusKm: row.delivery_radius_km ?? undefined,
    certifications: row.certifications ?? [],
    status: row.status,
    viewCount: row.view_count ?? 0,
    saveCount: row.save_count ?? 0,
    enquiryCount: row.enquiry_count ?? 0,
    createdLabel: createdLabel(row.created_at),
    imageVariant: imageVariantFor(row.crop),
    seller: profile,
    reviewSummary,
  };
}

async function hydrateListings(rows: ListingRow[]) {
  if (!rows.length) return [];
  const sellerIds = [...new Set(rows.map((row) => row.farmer_id))];
  const supabase = await createClient();
  const [profiles, reviewResult] = await Promise.all([
    loadProfilesByIds(sellerIds),
    supabase
      .from("market_reviews")
      .select("seller_id, rating")
      .eq("status", "active")
      .in("seller_id", sellerIds),
  ]);
  if (reviewResult.error) {
    throwDataUnavailable("marketplace.review-summary");
  }
  const byId = new Map(profiles.map((profile) => [profile.id, profile]));
  const ratings = new Map<string, number[]>();
  for (const review of reviewResult.data ?? []) {
    const sellerId = review.seller_id as string;
    ratings.set(sellerId, [
      ...(ratings.get(sellerId) ?? []),
      Number(review.rating),
    ]);
  }

  return rows.map((row) => {
    const values = ratings.get(row.farmer_id) ?? [];
    return mapListing(row, byId.get(row.farmer_id), {
      count: values.length,
      average: values.length
        ? values.reduce((sum, value) => sum + value, 0) / values.length
        : 0,
    });
  });
}

export async function loadPublicListings(): Promise<ProduceListing[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("produce_listings")
    .select(listingColumns)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    throwDataUnavailable("marketplace.public-listings");
  }

  if (!data?.length) return [];

  try {
    return await hydrateListings(data as ListingRow[]);
  } catch (error) {
    if (error instanceof DataUnavailableError) throw error;
    throwDataUnavailable("marketplace.public-listing-hydration");
  }
}

export async function loadPublicListingsForSeller(
  sellerId: string,
): Promise<ProduceListing[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("produce_listings")
    .select(listingColumns)
    .eq("farmer_id", sellerId)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) {
    throwDataUnavailable("marketplace.profile-listings");
  }

  try {
    return await hydrateListings(data as ListingRow[]);
  } catch (error) {
    if (error instanceof DataUnavailableError) throw error;
    throwDataUnavailable("marketplace.profile-listing-hydration");
  }
}

export async function loadListingById(id: string) {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("produce_listings")
    .select(listingColumns)
    .eq("id", id)
    .eq("status", "active")
    .maybeSingle();

  if (error) throwDataUnavailable("marketplace.listing-detail");
  if (!data) return null;

  try {
    const [listing] = await hydrateListings([data as ListingRow]);
    return listing ?? null;
  } catch (error) {
    if (error instanceof DataUnavailableError) throw error;
    throwDataUnavailable("marketplace.listing-detail-hydration");
  }
}

export async function loadStorefront(handle: string) {
  if (!isSupabaseConfigured()) {
    return { profile: null, listings: [] };
  }

  const supabase = await createClient();
  const { data: profileRow, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("handle", handle)
    .maybeSingle();
  if (profileError) throwDataUnavailable("marketplace.storefront-profile");
  if (!profileRow) return { profile: null, listings: [] };

  const [profile] = await loadProfilesByIds([profileRow.id as string]);
  const { data, error } = await supabase
    .from("produce_listings")
    .select(listingColumns)
    .eq("farmer_id", profileRow.id)
    .eq("status", "active")
    .order("created_at", { ascending: false });
  if (error) {
    throwDataUnavailable("marketplace.storefront-listings");
  }

  try {
    return {
      profile: profile ?? null,
      listings: await hydrateListings(data as ListingRow[]),
    };
  } catch (error) {
    if (error instanceof DataUnavailableError) throw error;
    throwDataUnavailable("marketplace.storefront-hydration");
  }
}

export async function loadSellerMarketData(): Promise<{
  currentUser: FarmerProfile;
  listings: ProduceListing[];
  enquiries: MarketEnquiry[];
}> {
  if (!isSupabaseConfigured()) {
    return {
      currentUser: await loadCurrentProfile(),
      listings: [],
      enquiries: [],
    };
  }

  const user = await requireUser();
  if (!isSellerRole(user.profile.accountRole)) {
    throw new Error("A Farmer or Wholesaler account is required.");
  }
  const currentUser = await loadCurrentProfile();
  const supabase = await createClient();
  const [{ data: listingRows, error: listingError }, { data: enquiryRows, error: enquiryError }] =
    await Promise.all([
      supabase
        .from("produce_listings")
        .select(listingColumns)
        .eq("farmer_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("market_enquiries")
        .select(
          "id, listing_id, buyer_id, conversation_id, buyer_name, business_name, email, phone, location, quantity_needed, need_by, message, status, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

  if (listingError || enquiryError) {
    throwDataUnavailable("marketplace.seller-dashboard");
  }

  const listings = (listingRows as ListingRow[]).map((row) =>
    mapListing(row, currentUser),
  );
  const listingTitles = new Map(
    listings.map((listing) => [listing.id, listing.title]),
  );
  const enquiries = (enquiryRows as EnquiryRow[]).map((row) => ({
    id: row.id,
    listingId: row.listing_id,
    buyerName: row.buyer_name,
    businessName: row.business_name,
    email: row.email,
    phone: row.phone,
    location: row.location,
    quantityNeeded: row.quantity_needed,
    needBy: row.need_by,
    message: row.message,
    status: row.status,
    createdLabel: createdLabel(row.created_at),
    listingTitle: listingTitles.get(row.listing_id),
    buyerId: row.buyer_id ?? undefined,
    conversationId: row.conversation_id ?? undefined,
    seller: currentUser,
  }));

  return { currentUser, listings, enquiries };
}
