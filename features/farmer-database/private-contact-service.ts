import { isFeatureEnabled } from "@/lib/feature-flags";
import { createAdminClient } from "@/lib/supabase/admin";
import { uuidFromText } from "@/features/outreach/crypto";
import {
  encryptPrivateContactValue,
  privateContactValueHash,
  privateFarmerContactConfiguration,
} from "./crypto";
import {
  normalizeFarmerEmail,
  normalizeIndianPhone,
} from "./schemas";

type ConsentLeadMirrorInput = {
  prospectId: string;
  fullName: string;
  email?: string;
  phone?: string;
  preferredChannel: "email" | "sms" | "whatsapp";
  state: string;
  district: string;
  preferredLocale: string;
  consentPolicyVersion: string;
  consentRecordedAt: string;
  idempotencyKey: string;
};

export async function mirrorConsentLeadToPrivateFarmerDatabase(
  input: ConsentLeadMirrorInput,
) {
  if (!isFeatureEnabled("ENABLE_PRIVATE_FARMER_CONTACTS")) return { skipped: true };
  const configuration = privateFarmerContactConfiguration();
  if (!configuration.configured) {
    throw new Error("PRIVATE_FARMER_CONTACTS_NOT_CONFIGURED");
  }
  const supabase = createAdminClient();
  const listIdempotencyKey = await uuidFromText(
    `private-farmer-contact-list:${configuration.ownerId}:direct-interest`,
  );
  const existingList = await supabase
    .from("farmer_contact_lists")
    .select("id")
    .eq("owner_id", configuration.ownerId)
    .eq("name", "Direct Farmer interest")
    .maybeSingle();
  if (existingList.error) throw new Error("PRIVATE_CONTACT_LIST_LOOKUP_FAILED");
  let listId = existingList.data?.id as string | undefined;
  if (!listId) {
    const inserted = await supabase
      .from("farmer_contact_lists")
      .insert({
        owner_id: configuration.ownerId,
        name: "Direct Farmer interest",
        purpose: "farmerbook_invitation",
        creation_idempotency_key: listIdempotencyKey,
      })
      .select("id")
      .single();
    if (inserted.error || !inserted.data) {
      throw new Error("PRIVATE_CONTACT_LIST_CREATE_FAILED");
    }
    listId = String(inserted.data.id);
  }
  const email = input.email ? normalizeFarmerEmail(input.email) : undefined;
  const phone = input.phone ? normalizeIndianPhone(input.phone) : undefined;
  const [displayNameCiphertext, emailCiphertext, emailHash, phoneCiphertext, phoneHash] =
    await Promise.all([
      encryptPrivateContactValue(input.fullName.trim(), "display_name"),
      email ? encryptPrivateContactValue(email, "email") : null,
      email ? privateContactValueHash(email, "email") : null,
      phone ? encryptPrivateContactValue(phone, "phone") : null,
      phone ? privateContactValueHash(phone, "phone") : null,
    ]);
  let existingContactQuery = supabase
    .from("farmer_contacts")
    .select("id")
    .eq("owner_id", configuration.ownerId);
  existingContactQuery = emailHash
    ? existingContactQuery.eq("email_hash", emailHash)
    : existingContactQuery.eq("phone_hash", phoneHash!);
  const existingContact = await existingContactQuery.maybeSingle();
  if (existingContact.error) throw new Error("PRIVATE_CONTACT_LOOKUP_FAILED");
  const contactPayload = {
    list_id: listId,
    owner_id: configuration.ownerId,
    display_name_ciphertext: displayNameCiphertext,
    email_ciphertext: emailCiphertext,
    email_hash: emailHash,
    phone_ciphertext: phoneCiphertext,
    phone_hash: phoneHash,
    acquisition_source: "farmerbook_interest_form",
    source_reference: `FarmerBook direct interest request ${input.prospectId}`,
    state: input.state,
    district: input.district,
    preferred_locale: input.preferredLocale,
    source_attested: true,
    consent_channel: input.preferredChannel === "email" ? "email" : "phone",
    consent_purpose: "farmerbook_invitation",
    consent_state: "pending",
    consent_text_version: input.consentPolicyVersion,
    consent_recorded_at: input.consentRecordedAt,
    review_state: "pending",
    suppression_state: "none",
    outreach_prospect_id: input.prospectId,
  };
  let contactId: string;
  if (existingContact.data?.id) {
    const updated = await supabase
      .from("farmer_contacts")
      .update(contactPayload)
      .eq("id", existingContact.data.id)
      .eq("owner_id", configuration.ownerId)
      .select("id")
      .single();
    if (updated.error || !updated.data) throw new Error("PRIVATE_CONTACT_UPDATE_FAILED");
    contactId = String(updated.data.id);
  } else {
    const inserted = await supabase
      .from("farmer_contacts")
      .insert({
        ...contactPayload,
        creation_idempotency_key: input.idempotencyKey,
      })
      .select("id")
      .single();
    if (inserted.error || !inserted.data) throw new Error("PRIVATE_CONTACT_CREATE_FAILED");
    contactId = String(inserted.data.id);
  }
  return { skipped: false, contactId };
}

export async function activateMirroredEmailConsent(input: {
  prospectId: string;
  confirmationReference: string;
  confirmedAt: string;
  expiresAt: string;
  idempotencyKey: string;
}) {
  if (!isFeatureEnabled("ENABLE_PRIVATE_FARMER_CONTACTS")) return { skipped: true };
  const configuration = privateFarmerContactConfiguration();
  if (!configuration.configured) return { skipped: true };
  const result = await createAdminClient().rpc(
    "activate_private_farmer_contact_consent",
    {
      outreach_prospect_id_input: input.prospectId,
      confirmation_reference_input: input.confirmationReference,
      confirmed_at_input: input.confirmedAt,
      expires_at_input: input.expiresAt,
      idempotency_key_input: input.idempotencyKey,
    },
  );
  if (result.error) throw new Error("PRIVATE_CONTACT_CONFIRMATION_FAILED");
  return { skipped: false };
}
