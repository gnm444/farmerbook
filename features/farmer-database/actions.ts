"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { sha256 } from "@/features/outreach/crypto";
import { createConfiguredOutreachProvider } from "@/features/outreach/providers";
import { getSiteUrl } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePrivateFarmerDatabaseOwner } from "./access";
import {
  decryptPrivateContactValue,
  encryptPrivateContactValue,
  privateContactValueHash,
} from "./crypto";
import {
  farmerContactListSchema,
  farmerContactOperationSchema,
  parsePrivateFarmerContactCsv,
  privateFarmerContactSchema,
  youtubeDiscoveryInputSchema,
} from "./schemas";
import type { FarmerDatabaseActionResult } from "./types";
import {
  discoverFarmerChannelsOnYouTube,
  YouTubeDiscoveryError,
} from "./youtube-discovery";

const messages = {
  FEATURE_DISABLED: "The private Farmer database is disabled.",
  NOT_CONFIGURED: "The private Farmer database is not configured.",
  FORBIDDEN: "This database is private to its owner administrator.",
  INVALID_INPUT: "Check the supplied information and try again.",
  DUPLICATE: "That contact is already in your private database.",
  NOT_FOUND: "That private contact is no longer available.",
  CONSENT_REQUIRED: "Confirmed active email consent is required.",
  SEARCH_QUOTA_EXCEEDED: "The private YouTube discovery quota has been reached.",
  SEARCH_UNAVAILABLE: "YouTube discovery is temporarily unavailable.",
  DATA_UNAVAILABLE: "The private Farmer database request could not be completed.",
} as const;

function failure(
  code: keyof typeof messages,
  fieldErrors?: Record<string, readonly string[]>,
): FarmerDatabaseActionResult<never> {
  return { ok: false, code, message: messages[code], ...(fieldErrors ? { fieldErrors } : {}) };
}

function databaseFailure(error: unknown) {
  const details = typeof error === "object" && error && "details" in error
    ? String(error.details)
    : "";
  const code = typeof error === "object" && error && "code" in error
    ? String(error.code)
    : "";
  if (details === "FEATURE_DISABLED") return failure("FEATURE_DISABLED");
  if (details === "CONSENT_REQUIRED") return failure("CONSENT_REQUIRED");
  if (details === "SEARCH_QUOTA_EXCEEDED") return failure("SEARCH_QUOTA_EXCEEDED");
  if (details.includes("NOT_FOUND")) return failure("NOT_FOUND");
  if (code === "23505") return failure("DUPLICATE");
  if (code === "42501") return failure("FORBIDDEN");
  if (code === "22023") return failure("INVALID_INPUT");
  return failure("DATA_UNAVAILABLE");
}

async function ownerAccess() {
  const access = await requirePrivateFarmerDatabaseOwner();
  return access.ok ? access : { ...access, error: failure(access.code) };
}

export async function createFarmerContactListAction(rawInput: unknown) {
  const parsed = farmerContactListSchema.safeParse(rawInput);
  if (!parsed.success) return failure("INVALID_INPUT", z.flattenError(parsed.error).fieldErrors);
  const access = await ownerAccess();
  if (!access.ok) return access.error;
  const result = await createAdminClient()
    .from("farmer_contact_lists")
    .insert({
      owner_id: access.administrator.id,
      name: parsed.data.name,
      purpose: parsed.data.purpose,
      creation_idempotency_key: parsed.data.idempotencyKey,
    })
    .select("id")
    .single();
  if (result.error || !result.data) return databaseFailure(result.error);
  revalidatePath("/admin/farmer-database");
  return { ok: true as const, code: "LIST_CREATED", data: { id: String(result.data.id) } };
}

export async function addPrivateFarmerContactAction(rawInput: unknown) {
  const parsed = privateFarmerContactSchema.safeParse(rawInput);
  if (!parsed.success) return failure("INVALID_INPUT", z.flattenError(parsed.error).fieldErrors);
  const access = await ownerAccess();
  if (!access.ok) return access.error;
  const supabase = createAdminClient();
  const list = await supabase.from("farmer_contact_lists")
    .select("id")
    .eq("id", parsed.data.listId)
    .eq("owner_id", access.administrator.id)
    .maybeSingle();
  if (list.error || !list.data) return failure("NOT_FOUND");
  const [displayNameCiphertext, emailCiphertext, emailHash, phoneCiphertext, phoneHash] =
    await Promise.all([
      parsed.data.displayName
        ? encryptPrivateContactValue(parsed.data.displayName, "display_name")
        : null,
      parsed.data.email
        ? encryptPrivateContactValue(parsed.data.email, "email")
        : null,
      parsed.data.email
        ? privateContactValueHash(parsed.data.email, "email")
        : null,
      parsed.data.phone
        ? encryptPrivateContactValue(parsed.data.phone, "phone")
        : null,
      parsed.data.phone
        ? privateContactValueHash(parsed.data.phone, "phone")
        : null,
    ]);
  const contact = await supabase.from("farmer_contacts").insert({
    list_id: parsed.data.listId,
    owner_id: access.administrator.id,
    display_name_ciphertext: displayNameCiphertext,
    email_ciphertext: emailCiphertext,
    email_hash: emailHash,
    phone_ciphertext: phoneCiphertext,
    phone_hash: phoneHash,
    acquisition_source: parsed.data.acquisitionSource,
    source_reference: parsed.data.sourceReference,
    state: parsed.data.state,
    district: parsed.data.district,
    preferred_locale: parsed.data.preferredLocale,
    source_attested: parsed.data.sourceAttested,
    consent_channel: parsed.data.consentChannel,
    consent_purpose: parsed.data.consentPurpose,
    consent_state: parsed.data.consentState,
    consent_text_version: parsed.data.consentTextVersion,
    consent_recorded_at: parsed.data.consentRecordedAt,
    consent_expires_at: parsed.data.consentExpiresAt ?? null,
    channel_confirmed_at: parsed.data.channelConfirmedAt ?? null,
    channel_confirmation_reference:
      parsed.data.channelConfirmationReference ?? null,
    review_state: parsed.data.consentState === "active" ? "approved" : "pending",
    suppression_state: "none",
    creation_idempotency_key: parsed.data.idempotencyKey,
  }).select("id").single();
  if (contact.error || !contact.data) return databaseFailure(contact.error);
  revalidatePath("/admin/farmer-database");
  return { ok: true as const, code: "CONTACT_CREATED", data: { id: String(contact.data.id) } };
}

export async function importPrivateFarmerContactsAction(rawText: unknown) {
  const access = await ownerAccess();
  if (!access.ok) return access.error;
  if (typeof rawText !== "string") return failure("INVALID_INPUT");
  let rows: ReturnType<typeof parsePrivateFarmerContactCsv>;
  try {
    rows = parsePrivateFarmerContactCsv(rawText);
  } catch {
    return failure("INVALID_INPUT");
  }
  const supabase = createAdminClient();
  const listIds = [...new Set(rows.map((row) => row.listId))];
  const lists = await supabase.from("farmer_contact_lists")
    .select("id")
    .eq("owner_id", access.administrator.id)
    .in("id", listIds);
  if (lists.error || (lists.data ?? []).length !== listIds.length) {
    return failure("NOT_FOUND");
  }
  const encryptedRows = await Promise.all(rows.map(async (row) => {
    const [displayNameCiphertext, emailCiphertext, emailHash, phoneCiphertext, phoneHash] =
      await Promise.all([
        row.displayName
          ? encryptPrivateContactValue(row.displayName, "display_name")
          : null,
        row.email ? encryptPrivateContactValue(row.email, "email") : null,
        row.email ? privateContactValueHash(row.email, "email") : null,
        row.phone ? encryptPrivateContactValue(row.phone, "phone") : null,
        row.phone ? privateContactValueHash(row.phone, "phone") : null,
      ]);
    return {
      list_id: row.listId,
      owner_id: access.administrator.id,
      display_name_ciphertext: displayNameCiphertext,
      email_ciphertext: emailCiphertext,
      email_hash: emailHash,
      phone_ciphertext: phoneCiphertext,
      phone_hash: phoneHash,
      acquisition_source: row.acquisitionSource,
      source_reference: row.sourceReference,
      state: row.state,
      district: row.district,
      preferred_locale: row.preferredLocale,
      source_attested: row.sourceAttested,
      consent_channel: row.consentChannel,
      consent_purpose: row.consentPurpose,
      consent_state: row.consentState,
      consent_text_version: row.consentTextVersion,
      consent_recorded_at: row.consentRecordedAt,
      consent_expires_at: row.consentExpiresAt ?? null,
      channel_confirmed_at: row.channelConfirmedAt ?? null,
      channel_confirmation_reference: row.channelConfirmationReference ?? null,
      review_state: row.consentState === "active" ? "approved" : "pending",
      suppression_state: "none",
      creation_idempotency_key: row.idempotencyKey,
    };
  }));
  const inserted = await supabase.from("farmer_contacts")
    .insert(encryptedRows)
    .select("id");
  if (inserted.error || !inserted.data) return databaseFailure(inserted.error);
  revalidatePath("/admin/farmer-database");
  return {
    ok: true as const,
    code: "CONTACTS_IMPORTED",
    data: { importedCount: inserted.data.length },
  };
}

export async function privateFarmerContactCsvDryRunAction(rawText: unknown) {
  const access = await ownerAccess();
  if (!access.ok) return access.error;
  if (typeof rawText !== "string") return failure("INVALID_INPUT");
  try {
    const rows = parsePrivateFarmerContactCsv(rawText);
    return {
      ok: true as const,
      code: "CSV_DRY_RUN_READY",
      data: {
        rowCount: rows.length,
        emailCount: rows.filter((row) => row.email).length,
        phoneCount: rows.filter((row) => row.phone).length,
        activeConsentCount: rows.filter((row) => row.consentState === "active").length,
      },
    };
  } catch {
    return failure("INVALID_INPUT");
  }
}

export async function updatePrivateFarmerContactAction(rawInput: unknown) {
  const parsed = farmerContactOperationSchema.safeParse(rawInput);
  if (!parsed.success) return failure("INVALID_INPUT", z.flattenError(parsed.error).fieldErrors);
  const access = await ownerAccess();
  if (!access.ok) return access.error;
  const result = await createAdminClient().rpc("update_private_farmer_contact_state", {
    contact_id_input: parsed.data.contactId,
    owner_id_input: access.administrator.id,
    operation_input: parsed.data.operation,
    reason_input: parsed.data.reason,
    idempotency_key_input: parsed.data.idempotencyKey,
  });
  if (result.error) return databaseFailure(result.error);
  revalidatePath("/admin/farmer-database");
  return { ok: true as const, code: "CONTACT_UPDATED", data: undefined };
}

const emailHandoffSchema = z.object({
  contactId: z.uuid(),
  idempotencyKey: z.uuid(),
}).strict();

export async function preparePrivateFarmerEmailAction(rawInput: unknown) {
  const parsed = emailHandoffSchema.safeParse(rawInput);
  if (!parsed.success) return failure("INVALID_INPUT");
  const access = await ownerAccess();
  if (!access.ok) return access.error;
  if (!createConfiguredOutreachProvider().configured) {
    return failure("NOT_CONFIGURED");
  }
  const supabase = createAdminClient();
  const contactResult = await supabase.from("farmer_contacts")
    .select("email_ciphertext, email_hash, consent_channel, consent_state, consent_expires_at, suppression_state, privacy_deleted_at")
    .eq("id", parsed.data.contactId)
    .eq("owner_id", access.administrator.id)
    .maybeSingle();
  if (contactResult.error || !contactResult.data) return failure("NOT_FOUND");
  const contact = contactResult.data;
  if (
    !contact.email_ciphertext || !contact.email_hash ||
    contact.consent_channel !== "email" || contact.consent_state !== "active" ||
    contact.suppression_state !== "none" || contact.privacy_deleted_at ||
    (contact.consent_expires_at && Date.parse(String(contact.consent_expires_at)) <= Date.now())
  ) {
    return failure("CONSENT_REQUIRED");
  }
  const email = await decryptPrivateContactValue(
    String(contact.email_ciphertext),
    "email",
  );
  const applicationOrigin = new URL(getSiteUrl()).origin;
  const message =
    `FarmerBook is a professional and social network purpose-built for farmers, ` +
    `with trusted profiles, community sharing and a direct agriculture marketplace. ` +
    `Create your FarmerBook account at ${applicationOrigin}/signup. ` +
    `You can withdraw or reply STOP at any time.`;
  const result = await supabase.rpc("prepare_private_farmer_contact_email", {
    contact_id_input: parsed.data.contactId,
    owner_id_input: access.administrator.id,
    email_input: email,
    private_email_hash_input: String(contact.email_hash),
    application_origin_input: applicationOrigin,
    message_input: message,
    idempotency_key_input: parsed.data.idempotencyKey,
  });
  if (result.error) return databaseFailure(result.error);
  revalidatePath("/admin/farmer-database");
  revalidatePath("/admin/outreach");
  return {
    ok: true as const,
    code: "EMAIL_PREPARED",
    data: { queuedForConsentedDelivery: true },
  };
}

export async function discoverYouTubeFarmerChannelsAction(rawInput: unknown) {
  const parsed = youtubeDiscoveryInputSchema.safeParse(rawInput);
  if (!parsed.success) return failure("INVALID_INPUT", z.flattenError(parsed.error).fieldErrors);
  const access = await ownerAccess();
  if (!access.ok) return access.error;
  const supabase = createAdminClient();
  const queryHash = await sha256(parsed.data.query.normalize("NFKC").trim());
  const reservation = await supabase.rpc("reserve_private_farmer_youtube_search", {
    owner_id_input: access.administrator.id,
    query_hash_input: queryHash,
    locale_input: parsed.data.locale,
    idempotency_key_input: parsed.data.idempotencyKey,
  });
  if (reservation.error) return databaseFailure(reservation.error);
  const row = Array.isArray(reservation.data) ? reservation.data[0] : reservation.data;
  const searchId = row && typeof row.search_id === "string" ? row.search_id : null;
  if (!searchId) return failure("DATA_UNAVAILABLE");
  try {
    const discovered = await discoverFarmerChannelsOnYouTube(parsed.data);
    const completed = await supabase.rpc("complete_private_farmer_youtube_search", {
      search_id_input: searchId,
      owner_id_input: access.administrator.id,
      result_count_input: discovered.results.length,
      failure_code_input: null,
    });
    if (completed.error) return databaseFailure(completed.error);
    revalidatePath("/admin/farmer-database");
    return {
      ok: true as const,
      code: "YOUTUBE_RESULTS_TRANSIENT",
      data: { results: discovered.results, retention: "request_only" as const },
    };
  } catch (caught) {
    const providerCode = caught instanceof YouTubeDiscoveryError
      ? caught.code
      : "SEARCH_UNAVAILABLE";
    await supabase.rpc("complete_private_farmer_youtube_search", {
      search_id_input: searchId,
      owner_id_input: access.administrator.id,
      result_count_input: 0,
      failure_code_input: providerCode,
    });
    return failure(
      providerCode === "QUOTA_EXCEEDED"
        ? "SEARCH_QUOTA_EXCEEDED"
        : providerCode === "NOT_CONFIGURED"
          ? "NOT_CONFIGURED"
          : "SEARCH_UNAVAILABLE",
    );
  }
}
