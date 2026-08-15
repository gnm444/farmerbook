import { createAdminClient } from "@/lib/supabase/admin";
import type { SupportedLocale } from "@/lib/i18n/locales";
import { requirePrivateFarmerDatabaseOwner } from "./access";
import { decryptPrivateContactValue } from "./crypto";
import type {
  FarmerContact,
  FarmerContactAcquisitionSource,
  FarmerDatabaseDashboard,
} from "./types";

const emptyDashboard: FarmerDatabaseDashboard = {
  configured: false,
  lists: [],
  contacts: [],
  events: [],
  discoveryRuns: [],
  summary: { total: 0, emailConsented: 0, pending: 0, expired: 0, suppressed: 0 },
};

type ContactRow = {
  id: string;
  list_id: string;
  display_name_ciphertext: string | null;
  email_ciphertext: string | null;
  phone_ciphertext: string | null;
  acquisition_source: FarmerContactAcquisitionSource;
  source_reference: string;
  state: string;
  district: string;
  preferred_locale: SupportedLocale;
  consent_channel: "email" | "phone";
  consent_state: FarmerContact["consentState"];
  consent_recorded_at: string;
  consent_expires_at: string | null;
  channel_confirmed_at: string | null;
  review_state: FarmerContact["reviewState"];
  suppression_state: FarmerContact["suppressionState"];
  outreach_prospect_id: string | null;
  last_contacted_at: string | null;
  created_at: string;
  revision: number;
};

async function contactFromRow(row: ContactRow): Promise<FarmerContact> {
  const [displayName, email, phone] = await Promise.all([
    row.display_name_ciphertext
      ? decryptPrivateContactValue(row.display_name_ciphertext, "display_name")
      : null,
    row.email_ciphertext
      ? decryptPrivateContactValue(row.email_ciphertext, "email")
      : null,
    row.phone_ciphertext
      ? decryptPrivateContactValue(row.phone_ciphertext, "phone")
      : null,
  ]);
  return {
    id: row.id,
    listId: row.list_id,
    displayName,
    email,
    phone,
    acquisitionSource: row.acquisition_source,
    sourceReference: row.source_reference,
    state: row.state,
    district: row.district,
    preferredLocale: row.preferred_locale,
    consentChannel: row.consent_channel,
    consentState: row.consent_state,
    consentRecordedAt: row.consent_recorded_at,
    consentExpiresAt: row.consent_expires_at,
    channelConfirmedAt: row.channel_confirmed_at,
    reviewState: row.review_state,
    suppressionState: row.suppression_state,
    outreachProspectId: row.outreach_prospect_id,
    lastContactedAt: row.last_contacted_at,
    createdAt: row.created_at,
    revision: Number(row.revision),
  };
}

export async function loadPrivateFarmerDatabase(): Promise<FarmerDatabaseDashboard> {
  const access = await requirePrivateFarmerDatabaseOwner();
  if (!access.ok) return emptyDashboard;
  const supabase = createAdminClient();
  const [listsResult, contactsResult, eventsResult, runsResult] = await Promise.all([
    supabase.from("farmer_contact_lists")
      .select("id, name, purpose, created_at")
      .eq("owner_id", access.administrator.id)
      .order("created_at", { ascending: false }),
    supabase.from("farmer_contacts")
      .select("id, list_id, display_name_ciphertext, email_ciphertext, phone_ciphertext, acquisition_source, source_reference, state, district, preferred_locale, consent_channel, consent_state, consent_recorded_at, consent_expires_at, channel_confirmed_at, review_state, suppression_state, outreach_prospect_id, last_contacted_at, created_at, revision")
      .eq("owner_id", access.administrator.id)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("farmer_contact_events")
      .select("id, contact_id, event_type, details, created_at")
      .eq("owner_id", access.administrator.id)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("farmer_youtube_discovery_runs")
      .select("id, locale, state, result_count, failure_code, requested_at, completed_at")
      .eq("owner_id", access.administrator.id)
      .order("requested_at", { ascending: false })
      .limit(30),
  ]);
  if (
    listsResult.error || contactsResult.error || eventsResult.error || runsResult.error
  ) {
    throw new Error("Private Farmer database is temporarily unavailable.");
  }
  const contacts = await Promise.all(
    ((contactsResult.data ?? []) as ContactRow[]).map(contactFromRow),
  );
  const now = Date.now();
  return {
    configured: true,
    lists: (listsResult.data ?? []).map((row) => ({
      id: String(row.id),
      name: String(row.name),
      purpose: String(row.purpose) as "farmerbook_invitation" | "farmerbook_member_support",
      createdAt: String(row.created_at),
    })),
    contacts,
    events: (eventsResult.data ?? []).map((row) => ({
      id: String(row.id),
      contactId: String(row.contact_id),
      eventType: String(row.event_type),
      details:
        row.details && typeof row.details === "object"
          ? row.details as Record<string, unknown>
          : {},
      createdAt: String(row.created_at),
    })),
    discoveryRuns: (runsResult.data ?? []).map((row) => ({
      id: String(row.id),
      locale: String(row.locale) as SupportedLocale,
      state: String(row.state) as "reserved" | "succeeded" | "failed",
      resultCount: row.result_count === null ? null : Number(row.result_count),
      failureCode: row.failure_code ? String(row.failure_code) : null,
      requestedAt: String(row.requested_at),
      completedAt: row.completed_at ? String(row.completed_at) : null,
    })),
    summary: {
      total: contacts.length,
      emailConsented: contacts.filter((contact) =>
        contact.consentChannel === "email" &&
        contact.consentState === "active" &&
        contact.suppressionState === "none" &&
        (!contact.consentExpiresAt || Date.parse(contact.consentExpiresAt) > now)
      ).length,
      pending: contacts.filter((contact) => contact.consentState === "pending").length,
      expired: contacts.filter((contact) =>
        contact.consentState === "expired" ||
        Boolean(contact.consentExpiresAt && Date.parse(contact.consentExpiresAt) <= now)
      ).length,
      suppressed: contacts.filter((contact) => contact.suppressionState !== "none").length,
    },
  };
}
