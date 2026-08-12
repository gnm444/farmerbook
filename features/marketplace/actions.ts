"use server";

import {
  isSellerRole,
  requireUser,
} from "@/features/auth/require-user";
import { canSource } from "@/features/auth/capabilities";
import { isDemoMode, isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import {
  enquirySchema,
  leadStatusSchema,
  listingSchema,
  listingStatusSchema,
} from "./schemas";

export async function createListingAction(input: unknown) {
  const parsed = listingSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      message: parsed.error.issues[0]?.message ?? "Check the listing details.",
    };
  }

  const user = await requireUser();
  if (!isSellerRole(user.profile.accountRole)) {
    return {
      ok: false as const,
      message: "Only Farmers and Wholesalers can publish produce.",
    };
  }
  if (user.demo) {
    return {
      ok: true as const,
      demo: true,
      listingId: `demo-${Date.now()}`,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("produce_listings")
    .insert({
      farmer_id: user.id,
      title: parsed.data.title,
      crop: parsed.data.crop,
      variety: parsed.data.variety,
      description: parsed.data.description,
      quantity: parsed.data.quantity,
      unit: parsed.data.unit,
      min_order: parsed.data.minOrder,
      price: parsed.data.price,
      price_unit: parsed.data.priceUnit,
      harvest_start: parsed.data.harvestStart,
      harvest_end: parsed.data.harvestEnd,
      available_until: parsed.data.availableUntil,
      grade: parsed.data.grade,
      delivery_options: parsed.data.deliveryOptions,
      delivery_radius_km: parsed.data.deliveryRadiusKm ?? null,
      certifications: parsed.data.certifications,
      status: "active",
    })
    .select("id")
    .single();

  return error
    ? {
        ok: false as const,
        message: "The listing could not be created. Please try again.",
      }
    : { ok: true as const, demo: false, listingId: data.id as string };
}

export async function updateListingStatusAction(input: unknown) {
  const parsed = listingStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, message: "Invalid listing update." };
  }

  const user = await requireUser();
  if (!isSellerRole(user.profile.accountRole)) {
    return {
      ok: false as const,
      message: "Only Farmers and Wholesalers can manage listings.",
    };
  }
  if (user.demo) return { ok: true as const, demo: true };

  const supabase = await createClient();
  const { error } = await supabase
    .from("produce_listings")
    .update({
      status: parsed.data.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.listingId)
    .eq("farmer_id", user.id);

  return error
    ? {
        ok: false as const,
        message: "The listing status could not be changed. Please try again.",
      }
    : { ok: true as const, demo: false };
}

export async function createMarketEnquiryAction(input: unknown) {
  const parsed = enquirySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      message: parsed.error.issues[0]?.message ?? "Check your enquiry details.",
    };
  }
  if (!isSupabaseConfigured()) {
    if (!isDemoMode()) {
      return {
        ok: false as const,
        message: "Marketplace enquiries are temporarily unavailable.",
      };
    }
    return {
      ok: true as const,
      demo: true,
      conversationId: "conversation-anjali",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("account_role, onboarding_complete, status")
      .eq("id", user.id)
      .single();
    if (
      profileError ||
      profile?.status !== "active" ||
      !profile.onboarding_complete ||
      !canSource(profile.account_role)
    ) {
      return {
        ok: false as const,
        message: "Use a completed active account to connect with this seller.",
      };
    }

    const { data, error } = await supabase.rpc("connect_to_listing", {
      listing_id_input: parsed.data.listingId,
      business_name_input: parsed.data.businessName,
      email_input: parsed.data.email,
      phone_input: parsed.data.phone,
      location_input: parsed.data.location,
      quantity_needed_input: parsed.data.quantityNeeded,
      need_by_input: parsed.data.needBy,
      message_input: parsed.data.message,
    });
    const connection = data as
      | { conversation_id?: string; enquiry_id?: string }
      | null;
    return error
      ? {
          ok: false as const,
          message: "The seller connection could not be created. Please try again.",
        }
      : {
          ok: true as const,
          demo: false,
          conversationId: connection?.conversation_id,
          enquiryId: connection?.enquiry_id,
        };
  }

  return {
    ok: false as const,
    message: "Sign in with an active FarmerBook account to contact this seller.",
  };
}

export async function updateLeadStatusAction(input: unknown) {
  const parsed = leadStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, message: "Invalid enquiry update." };
  }

  const user = await requireUser();
  if (!isSellerRole(user.profile.accountRole)) {
    return {
      ok: false as const,
      message: "Only the listing seller can update this enquiry.",
    };
  }
  if (user.demo) return { ok: true as const, demo: true };

  const supabase = await createClient();
  const { error } = await supabase
    .from("market_enquiries")
    .update({
      status: parsed.data.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.enquiryId);

  return error
    ? {
        ok: false as const,
        message: "The enquiry status could not be changed. Please try again.",
      }
    : { ok: true as const, demo: false };
}
