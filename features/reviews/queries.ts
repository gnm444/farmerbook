import { requireUser } from "@/features/auth/require-user";
import {
  loadCurrentProfile,
  loadProfilesByIds,
} from "@/features/profiles/queries";
import { createdLabel } from "@/lib/data-mappers";
import { throwDataUnavailable } from "@/lib/data-errors";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type {
  MarketEnquiry,
  MarketReview,
  ParticipantProfile,
} from "@/lib/types";

type ReviewRow = {
  id: string;
  enquiry_id: string;
  listing_id: string;
  seller_id: string;
  rating: number;
  body: string;
  created_at: string;
};

function mapReview(
  row: ReviewRow,
  listingTitle?: string,
): MarketReview {
  return {
    id: row.id,
    enquiryId: row.enquiry_id,
    listingId: row.listing_id,
    sellerId: row.seller_id,
    rating: row.rating as MarketReview["rating"],
    body: row.body,
    createdLabel: createdLabel(row.created_at),
    listingTitle,
  };
}

export async function loadReviewsForSeller(
  sellerId: string,
): Promise<MarketReview[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("market_reviews")
    .select("id, enquiry_id, listing_id, seller_id, rating, body, created_at")
    .eq("seller_id", sellerId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) {
    throwDataUnavailable("reviews.public-seller");
  }

  const rows = data as ReviewRow[];
  if (!rows.length) return [];
  const listingIds = [...new Set(rows.map((row) => row.listing_id))];
  const { data: listings, error: listingError } = listingIds.length
    ? await supabase
        .from("produce_listings")
        .select("id, title")
        .in("id", listingIds)
    : { data: [], error: null };
  if (listingError) {
    throwDataUnavailable("reviews.public-listing-titles");
  }
  const titles = new Map(
    (listings ?? []).map((listing) => [
      listing.id as string,
      listing.title as string,
    ]),
  );
  return rows.map((row) => mapReview(row, titles.get(row.listing_id)));
}

export async function loadReviewsForListing(listingId: string) {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("market_reviews")
    .select("id, enquiry_id, listing_id, seller_id, rating, body, created_at")
    .eq("listing_id", listingId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) {
    throwDataUnavailable("reviews.public-listing");
  }
  return (data as ReviewRow[]).map((row) => mapReview(row));
}

export async function loadCustomerPurchases(): Promise<{
  customer: ParticipantProfile;
  enquiries: MarketEnquiry[];
}> {
  if (!isSupabaseConfigured()) {
    return {
      customer: await loadCurrentProfile(),
      enquiries: [],
    };
  }

  const user = await requireUser();
  if (user.profile.accountRole !== "customer") {
    throw new Error("A Customer account is required.");
  }

  const supabase = await createClient();
  const [{ data: enquiryRows, error: enquiryError }, { data: reviewRows, error: reviewError }] =
    await Promise.all([
      supabase
        .from("market_enquiries")
        .select(
          "id, listing_id, buyer_id, conversation_id, buyer_name, business_name, email, phone, location, quantity_needed, need_by, message, status, created_at",
        )
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("market_reviews")
        .select("id, enquiry_id, listing_id, seller_id, rating, body, created_at")
        .eq("reviewer_id", user.id),
    ]);
  if (enquiryError || reviewError) {
    throwDataUnavailable("reviews.customer-purchases");
  }

  const listingIds = [
    ...new Set((enquiryRows ?? []).map((row) => row.listing_id as string)),
  ];
  const { data: listings, error: listingError } = listingIds.length
    ? await supabase
        .from("produce_listings")
        .select("id, title, farmer_id")
        .in("id", listingIds)
    : { data: [], error: null };
  if (listingError) throwDataUnavailable("reviews.customer-purchase-listings");

  const sellerIds = [
    ...new Set((listings ?? []).map((row) => row.farmer_id as string)),
  ];
  const sellers = await loadProfilesByIds(sellerIds);
  const sellersById = new Map(sellers.map((profile) => [profile.id, profile]));
  const listingById = new Map(
    (listings ?? []).map((listing) => [
      listing.id as string,
      {
        title: listing.title as string,
        seller: sellersById.get(listing.farmer_id as string),
      },
    ]),
  );
  const reviewsByEnquiry = new Map(
    (reviewRows as ReviewRow[]).map((row) => [
      row.enquiry_id,
      mapReview(row, listingById.get(row.listing_id)?.title),
    ]),
  );

  const customerProfiles = await loadProfilesByIds([user.id]);
  const customer = customerProfiles[0];
  if (!customer) throw new Error("Your Customer profile was not found.");

  const enquiries: MarketEnquiry[] = (enquiryRows ?? []).map((row) => ({
    id: row.id as string,
    listingId: row.listing_id as string,
    buyerId: row.buyer_id as string,
    conversationId: (row.conversation_id as string | null) ?? undefined,
    buyerName: row.buyer_name as string,
    businessName: row.business_name as string,
    email: row.email as string,
    phone: row.phone as string,
    location: row.location as string,
    quantityNeeded: row.quantity_needed as string,
    needBy: row.need_by as string,
    message: row.message as string,
    status: row.status as MarketEnquiry["status"],
    createdLabel: createdLabel(row.created_at as string),
    listingTitle: listingById.get(row.listing_id as string)?.title,
    seller: listingById.get(row.listing_id as string)?.seller,
    review: reviewsByEnquiry.get(row.id as string),
  }));

  return { customer, enquiries };
}
