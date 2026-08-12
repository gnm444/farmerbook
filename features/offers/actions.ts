"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { canManageOrganization } from "@/features/auth/capabilities";
import { requireUser } from "@/features/auth/require-user";
import { isSupabaseConfigured } from "@/lib/env";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { createClient } from "@/lib/supabase/server";
import { actionFailure, databaseActionFailure } from "@/features/organizations/action-result";
import {
  OFFER_RPCS,
  OFFER_TABLES,
  type ConnectToBusinessOfferRpcArgs,
  type ConnectToBusinessOfferRpcResult,
  type CreateBusinessOfferRpcArgs,
  type CreateBusinessOfferRpcResult,
  type DatabaseServiceAreaInput,
  type SetBusinessOfferPublicationRpcArgs,
  type SetBusinessOfferPublicationRpcResult,
  type UpdateBusinessOfferRpcArgs,
  type UpdateBusinessOfferRpcResult,
} from "@/features/organizations/database-contract";
import { loadActiveOrganizationMembership } from "@/features/organizations/queries";
import {
  createOfferSchema,
  offerEnquirySchema,
  offerPublicationSchema,
  requiresOfferModerationReview,
  updateOfferSchema,
  type CreateOfferInput,
} from "./schemas";

const offerMutationResultSchema = z.object({
  offer_id: z.uuid(),
  publication_state: z.string().min(1),
  moderation_state: z.string().min(1),
});
const offerUpdateResultSchema = offerMutationResultSchema.extend({
  updated_at: z.string().min(1),
});
const enquiryResultSchema = z.object({
  enquiry_id: z.uuid(),
  event_id: z.uuid(),
});

function offersEnabled() {
  return (
    isFeatureEnabled("ENABLE_AGRI_BUSINESSES") &&
    isFeatureEnabled("ENABLE_BUSINESS_OFFERS")
  );
}

function rpcRow<T>(data: T | T[] | null): T | null {
  return Array.isArray(data) ? (data[0] ?? null) : data;
}

function databaseServiceAreas(
  input: CreateOfferInput["serviceAreas"],
): DatabaseServiceAreaInput[] {
  return input.map((area) => ({
    state: area.state,
    district: area.district ?? null,
    service_radius_km: area.serviceRadiusKm ?? null,
  }));
}

function priceInputs(input: CreateOfferInput) {
  if (input.priceModel === "free" || input.priceModel === "quote") {
    return {
      currency_input: null,
      price_min_input: null,
      price_max_input: null,
      price_unit_input: null,
    } as const;
  }
  return {
    currency_input: input.currency,
    price_min_input: input.priceMin,
    price_max_input: input.priceModel === "range" ? input.priceMax : null,
    price_unit_input: input.priceUnit,
  } as const;
}

function createRpcArgs(input: CreateOfferInput): CreateBusinessOfferRpcArgs {
  return {
    organization_id_input: input.organizationId,
    kind_input: input.kind,
    content_locale_input: input.contentLocale,
    title_input: input.title,
    description_input: input.description,
    terms_input: input.terms,
    valid_from_input: input.validFrom,
    valid_until_input: input.validUntil,
    price_model_input: input.priceModel,
    ...priceInputs(input),
    category_slugs_input: input.categorySlugs,
    service_areas_input: databaseServiceAreas(input.serviceAreas),
    publication_intent_input: input.publicationIntent,
    requires_moderation_review_input: requiresOfferModerationReview(input),
  };
}

async function canManageOfferOrganization(
  organizationId: string,
  profileId: string,
) {
  try {
    const membership = await loadActiveOrganizationMembership(
      organizationId,
      profileId,
    );
    return Boolean(membership && canManageOrganization(membership.role));
  } catch {
    return null;
  }
}

export async function createBusinessOfferAction(input: unknown) {
  if (!offersEnabled()) return actionFailure("FEATURE_DISABLED");
  const parsed = createOfferSchema.safeParse(input);
  if (!parsed.success) return actionFailure("INVALID_INPUT");
  if (!isSupabaseConfigured()) return actionFailure("NOT_CONFIGURED");

  const user = await requireUser();
  if (user.demo) return actionFailure("NOT_CONFIGURED");
  const permission = await canManageOfferOrganization(
    parsed.data.organizationId,
    user.id,
  );
  if (permission === null) return actionFailure("DATA_UNAVAILABLE");
  if (!permission) return actionFailure("FORBIDDEN");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    OFFER_RPCS.create,
    createRpcArgs(parsed.data),
  );
  if (error) return databaseActionFailure(error);

  const result = offerMutationResultSchema.safeParse(
    rpcRow(data as CreateBusinessOfferRpcResult | CreateBusinessOfferRpcResult[] | null),
  );
  if (!result.success) return actionFailure("DATA_UNAVAILABLE");
  revalidatePath("/company");
  revalidatePath("/companies");
  return {
    ok: true as const,
    code: "CREATED" as const,
    data: {
      offerId: result.data.offer_id,
      publicationState: result.data.publication_state,
      moderationState: result.data.moderation_state,
    },
  };
}

export async function updateBusinessOfferAction(input: unknown) {
  if (!offersEnabled()) return actionFailure("FEATURE_DISABLED");
  const parsed = updateOfferSchema.safeParse(input);
  if (!parsed.success) return actionFailure("INVALID_INPUT");
  if (!isSupabaseConfigured()) return actionFailure("NOT_CONFIGURED");

  const user = await requireUser();
  if (user.demo) return actionFailure("NOT_CONFIGURED");
  const permission = await canManageOfferOrganization(
    parsed.data.organizationId,
    user.id,
  );
  if (permission === null) return actionFailure("DATA_UNAVAILABLE");
  if (!permission) return actionFailure("FORBIDDEN");

  const args: UpdateBusinessOfferRpcArgs = {
    ...createRpcArgs(parsed.data),
    offer_id_input: parsed.data.offerId,
    expected_updated_at_input: parsed.data.expectedUpdatedAt,
  };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(OFFER_RPCS.update, args);
  if (error) return databaseActionFailure(error);

  const result = offerUpdateResultSchema.safeParse(
    rpcRow(data as UpdateBusinessOfferRpcResult | UpdateBusinessOfferRpcResult[] | null),
  );
  if (!result.success) return actionFailure("DATA_UNAVAILABLE");
  revalidatePath("/company");
  revalidatePath(`/offers/${result.data.offer_id}`);
  return {
    ok: true as const,
    code: "UPDATED" as const,
    data: {
      offerId: result.data.offer_id,
      publicationState: result.data.publication_state,
      moderationState: result.data.moderation_state,
      updatedAt: result.data.updated_at,
    },
  };
}

export async function setBusinessOfferPublicationAction(input: unknown) {
  if (!offersEnabled()) return actionFailure("FEATURE_DISABLED");
  const parsed = offerPublicationSchema.safeParse(input);
  if (!parsed.success) return actionFailure("INVALID_INPUT");
  if (!isSupabaseConfigured()) return actionFailure("NOT_CONFIGURED");

  const user = await requireUser();
  if (user.demo) return actionFailure("NOT_CONFIGURED");
  const lookupClient = await createClient();
  const { data: offer, error: lookupError } = await lookupClient
    .from(OFFER_TABLES.offers)
    .select("organization_id")
    .eq("id", parsed.data.offerId)
    .maybeSingle();
  if (lookupError) return databaseActionFailure(lookupError);
  if (!offer) return actionFailure("NOT_FOUND");
  const permission = await canManageOfferOrganization(
    offer.organization_id as string,
    user.id,
  );
  if (permission === null) return actionFailure("DATA_UNAVAILABLE");
  if (!permission) return actionFailure("FORBIDDEN");

  const args: SetBusinessOfferPublicationRpcArgs = {
    offer_id_input: parsed.data.offerId,
    publication_state_input: parsed.data.publicationState,
    expected_updated_at_input: parsed.data.expectedUpdatedAt,
  };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    OFFER_RPCS.setPublication,
    args,
  );
  if (error) return databaseActionFailure(error);

  const result = offerUpdateResultSchema.safeParse(
    rpcRow(
      data as
        | SetBusinessOfferPublicationRpcResult
        | SetBusinessOfferPublicationRpcResult[]
        | null,
    ),
  );
  if (!result.success) return actionFailure("DATA_UNAVAILABLE");
  revalidatePath("/company");
  revalidatePath(`/offers/${result.data.offer_id}`);
  return {
    ok: true as const,
    code: "PUBLICATION_UPDATED" as const,
    data: {
      offerId: result.data.offer_id,
      publicationState: result.data.publication_state,
      moderationState: result.data.moderation_state,
      updatedAt: result.data.updated_at,
    },
  };
}

export async function connectToBusinessOfferAction(input: unknown) {
  if (!offersEnabled()) return actionFailure("FEATURE_DISABLED");
  const parsed = offerEnquirySchema.safeParse(input);
  if (!parsed.success) return actionFailure("INVALID_INPUT");
  if (!isSupabaseConfigured()) return actionFailure("NOT_CONFIGURED");

  const user = await requireUser();
  if (user.demo) return actionFailure("NOT_CONFIGURED");

  const args: ConnectToBusinessOfferRpcArgs = {
    offer_id_input: parsed.data.offerId,
    message_input: parsed.data.message,
    quantity_needed_input: parsed.data.quantityNeeded ?? null,
    need_by_input: parsed.data.needBy ?? null,
    idempotency_key_input: parsed.data.idempotencyKey,
  };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(OFFER_RPCS.connect, args);
  if (error) return databaseActionFailure(error);

  const result = enquiryResultSchema.safeParse(
    rpcRow(data as ConnectToBusinessOfferRpcResult | ConnectToBusinessOfferRpcResult[] | null),
  );
  if (!result.success) return actionFailure("DATA_UNAVAILABLE");
  revalidatePath("/company");
  return {
    ok: true as const,
    code: "CONNECTED" as const,
    data: {
      enquiryId: result.data.enquiry_id,
      eventId: result.data.event_id,
    },
  };
}
