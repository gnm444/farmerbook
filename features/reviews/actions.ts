"use server";

import { requireUser } from "@/features/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import {
  reviewIdSchema,
  reviewSchema,
  reviewUpdateSchema,
} from "./schemas";

export async function createReviewAction(input: unknown) {
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      message: parsed.error.issues[0]?.message ?? "Check your review.",
    };
  }

  const user = await requireUser();
  if (user.profile.accountRole !== "customer") {
    return {
      ok: false as const,
      message: "Only Customers can review seller-confirmed completed enquiries.",
    };
  }
  if (user.demo) {
    return { ok: true as const, demo: true, reviewId: "demo-review" };
  }

  const supabase = await createClient();
  const { data: enquiry, error: enquiryError } = await supabase
    .from("market_enquiries")
    .select("id, listing_id, buyer_id, status")
    .eq("id", parsed.data.enquiryId)
    .eq("buyer_id", user.id)
    .single();
  if (enquiryError || !enquiry || enquiry.status !== "won") {
    return {
      ok: false as const,
      message: "A completed purchase is required before reviewing.",
    };
  }

  const { data: listing, error: listingError } = await supabase
    .from("produce_listings")
    .select("farmer_id")
    .eq("id", enquiry.listing_id)
    .single();
  if (listingError || !listing) {
    return { ok: false as const, message: "The seller could not be verified." };
  }

  const { data, error } = await supabase
    .from("market_reviews")
    .insert({
      enquiry_id: enquiry.id,
      listing_id: enquiry.listing_id,
      reviewer_id: user.id,
      seller_id: listing.farmer_id,
      rating: parsed.data.rating,
      body: parsed.data.body,
    })
    .select("id")
    .single();

  return error
    ? {
        ok: false as const,
        message: "The review could not be saved. Please try again.",
      }
    : {
        ok: true as const,
        demo: false,
        reviewId: data.id as string,
      };
}

export async function updateReviewAction(input: unknown) {
  const parsed = reviewUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      message: parsed.error.issues[0]?.message ?? "Check your review.",
    };
  }

  const user = await requireUser();
  if (user.profile.accountRole !== "customer") {
    return { ok: false as const, message: "A Customer account is required." };
  }
  if (user.demo) return { ok: true as const, demo: true };

  const supabase = await createClient();
  const { error } = await supabase
    .from("market_reviews")
    .update({
      rating: parsed.data.rating,
      body: parsed.data.body,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.reviewId)
    .eq("reviewer_id", user.id);

  return error
    ? {
        ok: false as const,
        message: "The review could not be updated. Please try again.",
      }
    : { ok: true as const, demo: false };
}

export async function deleteReviewAction(reviewId: string) {
  const parsed = reviewIdSchema.safeParse(reviewId);
  if (!parsed.success) {
    return { ok: false as const, message: "Invalid review." };
  }

  const user = await requireUser();
  if (user.profile.accountRole !== "customer") {
    return { ok: false as const, message: "A Customer account is required." };
  }
  if (user.demo) return { ok: true as const, demo: true };

  const supabase = await createClient();
  const { error } = await supabase
    .from("market_reviews")
    .delete()
    .eq("id", parsed.data)
    .eq("reviewer_id", user.id);

  return error
    ? {
        ok: false as const,
        message: "The review could not be removed. Please try again.",
      }
    : { ok: true as const, demo: false };
}
