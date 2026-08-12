"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { canManageOrganization } from "@/features/auth/capabilities";
import { requireUser } from "@/features/auth/require-user";
import { loadActiveOrganizationMembership } from "@/features/organizations/queries";
import { isSupabaseConfigured } from "@/lib/env";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { createClient } from "@/lib/supabase/server";
import { INC_SOURCING_RPCS, INC_SOURCING_TABLES } from "./database-contract";
import {
  createIncSourcingRequestSchema,
  incSourcingPublicationSchema,
  incSourcingResponseSchema,
  incVerificationSubmissionSchema,
  type CreateIncSourcingRequestInput,
} from "./schemas";
import type { IncSourcingActionResult } from "./types";

type FailureCode = Extract<IncSourcingActionResult<never>, { ok: false }>["code"];
const failureMessages: Record<FailureCode, string> = {
  FEATURE_DISABLED: "Inc sourcing is not available yet.",
  INVALID_INPUT: "Check the sourcing details and try again.",
  NOT_CONFIGURED: "Inc sourcing is temporarily unavailable.",
  FORBIDDEN: "You do not have permission to perform this Inc sourcing action.",
  NOT_FOUND: "This sourcing request is no longer available.",
  CONFLICT: "This sourcing request changed. Refresh before trying again.",
  VERIFICATION_REQUIRED: "Verify the Inc, its authorized representative and any required facility licence before publishing.",
  DATA_UNAVAILABLE: "The sourcing request could not be completed. Please try again.",
};

function fail(code: FailureCode, fieldErrors?: Record<string, string[]>) {
  return {
    ok: false as const,
    code,
    message: failureMessages[code],
    ...(fieldErrors ? { fieldErrors } : {}),
  };
}

function databaseFailure(error: unknown) {
  const object = typeof error === "object" && error ? error as Record<string, unknown> : {};
  const code = String(object.code ?? "");
  const detail = String(object.details ?? object.detail ?? "");
  if (detail.includes("VERIFICATION_REQUIRED")) return fail("VERIFICATION_REQUIRED");
  if (code === "23505" || code === "40001") return fail("CONFLICT");
  if (code === "42501") return fail("FORBIDDEN");
  if (code === "P0002" || code === "PGRST116") return fail("NOT_FOUND");
  if (code === "22023" || code === "22007" || code === "23514") return fail("INVALID_INPUT");
  return fail("DATA_UNAVAILABLE");
}

function enabled() {
  return isFeatureEnabled("ENABLE_AGRI_BUSINESSES") &&
    isFeatureEnabled("ENABLE_INC_SOURCING");
}

function rpcRow<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

async function canManage(organizationId: string, profileId: string) {
  try {
    const membership = await loadActiveOrganizationMembership(organizationId, profileId);
    return Boolean(membership && canManageOrganization(membership.role));
  } catch {
    return null;
  }
}

function priceArgs(input: CreateIncSourcingRequestInput) {
  if (input.priceModel === "quote") {
    return { currency_input: null, price_min_input: null, price_max_input: null, price_unit_input: null };
  }
  return {
    currency_input: input.currency,
    price_min_input: input.priceMin,
    price_max_input: input.priceModel === "range" ? input.priceMax : null,
    price_unit_input: input.priceUnit,
  };
}

export async function createIncSourcingRequestAction(input: unknown): Promise<IncSourcingActionResult<{ sourcingRequestId: string; publicationState: string; moderationState: string }>> {
  if (!enabled()) return fail("FEATURE_DISABLED");
  const parsed = createIncSourcingRequestSchema.safeParse(input);
  if (!parsed.success) return fail("INVALID_INPUT", z.flattenError(parsed.error).fieldErrors);
  if (!isSupabaseConfigured()) return fail("NOT_CONFIGURED");
  const user = await requireUser();
  if (user.demo) return fail("NOT_CONFIGURED");
  const permission = await canManage(parsed.data.organizationId, user.id);
  if (permission === null) return fail("DATA_UNAVAILABLE");
  if (!permission || user.profile.accountRole !== "agri_business") return fail("FORBIDDEN");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc(INC_SOURCING_RPCS.create, {
    organization_id_input: parsed.data.organizationId,
    content_locale_input: parsed.data.contentLocale,
    product_name_input: parsed.data.productName,
    variety_or_grade_input: parsed.data.varietyOrGrade,
    quality_requirements_input: parsed.data.qualityRequirements,
    quantity_min_input: parsed.data.quantityMin,
    quantity_max_input: parsed.data.quantityMax ?? null,
    quantity_unit_input: parsed.data.quantityUnit,
    cadence_input: parsed.data.cadence,
    delivery_mode_input: parsed.data.deliveryMode,
    destination_state_input: parsed.data.destinationState,
    destination_district_input: parsed.data.destinationDistrict ?? "",
    opens_on_input: parsed.data.opensOn,
    closes_on_input: parsed.data.closesOn,
    need_by_input: parsed.data.needBy,
    price_model_input: parsed.data.priceModel,
    ...priceArgs(parsed.data),
    payment_terms_input: parsed.data.paymentTerms,
    required_licence_scope_input: parsed.data.requiredLicenceScope,
    category_slugs_input: parsed.data.categorySlugs,
    publication_intent_input: parsed.data.publicationIntent,
  });
  if (error) return databaseFailure(error);
  const result = z.object({
    sourcing_request_id: z.uuid(),
    publication_state: z.string(),
    moderation_state: z.string(),
  }).safeParse(rpcRow(data));
  if (!result.success) return fail("DATA_UNAVAILABLE");
  revalidatePath("/sourcing");
  revalidatePath("/company");
  return { ok: true, code: "CREATED", data: {
    sourcingRequestId: result.data.sourcing_request_id,
    publicationState: result.data.publication_state,
    moderationState: result.data.moderation_state,
  } };
}

export async function setIncSourcingPublicationAction(input: unknown): Promise<IncSourcingActionResult<{ sourcingRequestId: string; publicationState: string; moderationState: string; updatedAt: string }>> {
  if (!enabled()) return fail("FEATURE_DISABLED");
  const parsed = incSourcingPublicationSchema.safeParse(input);
  if (!parsed.success) return fail("INVALID_INPUT");
  if (!isSupabaseConfigured()) return fail("NOT_CONFIGURED");
  const user = await requireUser();
  if (user.demo) return fail("NOT_CONFIGURED");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(INC_SOURCING_RPCS.setPublication, {
    sourcing_request_id_input: parsed.data.sourcingRequestId,
    publication_state_input: parsed.data.publicationState,
    expected_updated_at_input: parsed.data.expectedUpdatedAt,
  });
  if (error) return databaseFailure(error);
  const result = z.object({
    sourcing_request_id: z.uuid(), publication_state: z.string(),
    moderation_state: z.string(), updated_at: z.string(),
  }).safeParse(rpcRow(data));
  if (!result.success) return fail("DATA_UNAVAILABLE");
  revalidatePath("/sourcing");
  revalidatePath("/company");
  return { ok: true, code: "PUBLICATION_UPDATED", data: {
    sourcingRequestId: result.data.sourcing_request_id,
    publicationState: result.data.publication_state,
    moderationState: result.data.moderation_state,
    updatedAt: result.data.updated_at,
  } };
}

export async function respondToIncSourcingRequestAction(input: unknown): Promise<IncSourcingActionResult<{ responseId: string }>> {
  if (!enabled()) return fail("FEATURE_DISABLED");
  const parsed = incSourcingResponseSchema.safeParse(input);
  if (!parsed.success) return fail("INVALID_INPUT", z.flattenError(parsed.error).fieldErrors);
  if (!isSupabaseConfigured()) return fail("NOT_CONFIGURED");
  const user = await requireUser();
  if (user.demo) return fail("NOT_CONFIGURED");
  if (user.profile.accountRole !== "farmer") return fail("FORBIDDEN");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(INC_SOURCING_RPCS.respond, {
    sourcing_request_id_input: parsed.data.sourcingRequestId,
    message_input: parsed.data.message,
    quantity_available_input: parsed.data.quantityAvailable ?? null,
    quantity_unit_input: parsed.data.quantityUnit ?? null,
    available_from_input: parsed.data.availableFrom ?? null,
    indicative_price_input: parsed.data.indicativePrice ?? null,
    price_unit_input: parsed.data.priceUnit ?? null,
    idempotency_key_input: parsed.data.idempotencyKey,
  });
  if (error) return databaseFailure(error);
  const result = z.object({ response_id: z.uuid() }).safeParse(rpcRow(data));
  if (!result.success) return fail("DATA_UNAVAILABLE");
  revalidatePath(`/sourcing/${parsed.data.sourcingRequestId}`);
  return { ok: true, code: "RESPONDED", data: { responseId: result.data.response_id } };
}

export async function submitIncVerificationAction(input: unknown): Promise<IncSourcingActionResult<{ verificationRequestId: string }>> {
  if (!enabled()) return fail("FEATURE_DISABLED");
  const parsed = incVerificationSubmissionSchema.safeParse(input);
  if (!parsed.success) return fail("INVALID_INPUT", z.flattenError(parsed.error).fieldErrors);
  if (!isSupabaseConfigured()) return fail("NOT_CONFIGURED");
  const user = await requireUser();
  if (user.demo) return fail("NOT_CONFIGURED");
  const permission = await canManage(parsed.data.organizationId, user.id);
  if (permission === null) return fail("DATA_UNAVAILABLE");
  if (!permission) return fail("FORBIDDEN");
  const supabase = await createClient();
  const { data: active, error: activeError } = await supabase
    .from(INC_SOURCING_TABLES.verificationRequests)
    .select("id")
    .eq("organization_id", parsed.data.organizationId)
    .in("status", ["submitted", "in_review"])
    .maybeSingle();
  if (activeError) return databaseFailure(activeError);
  if (active) return fail("CONFLICT");
  const { data, error } = await supabase
    .from(INC_SOURCING_TABLES.verificationRequests)
    .insert({
      organization_id: parsed.data.organizationId,
      requested_by: user.id,
      requested_claim_types: parsed.data.requestedClaimTypes,
      official_domain: parsed.data.officialDomain ?? null,
      applicant_note: parsed.data.applicantNote,
    })
    .select("id")
    .single();
  if (error) return databaseFailure(error);
  const result = z.object({ id: z.uuid() }).safeParse(data);
  if (!result.success) return fail("DATA_UNAVAILABLE");
  revalidatePath("/company");
  return { ok: true, code: "VERIFICATION_SUBMITTED", data: { verificationRequestId: result.data.id } };
}
