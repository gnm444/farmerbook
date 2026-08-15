import type { SupportedLocale } from "@/lib/i18n/locales";

export const farmerContactAcquisitionSources = [
  "farmerbook_interest_form",
  "existing_farmerbook_member",
  "partner_consent_campaign",
  "manual_consent_import",
] as const;

export type FarmerContactAcquisitionSource =
  (typeof farmerContactAcquisitionSources)[number];

export type FarmerContact = {
  id: string;
  listId: string;
  displayName: string | null;
  email: string | null;
  phone: string | null;
  acquisitionSource: FarmerContactAcquisitionSource;
  sourceReference: string;
  state: string;
  district: string;
  preferredLocale: SupportedLocale;
  consentChannel: "email" | "phone";
  consentState: "pending" | "active" | "expired" | "withdrawn";
  consentRecordedAt: string;
  consentExpiresAt: string | null;
  channelConfirmedAt: string | null;
  reviewState: "pending" | "approved" | "rejected";
  suppressionState: "none" | "withdrawn" | "administrator" | "privacy_deleted";
  outreachProspectId: string | null;
  lastContactedAt: string | null;
  createdAt: string;
  revision: number;
};

export type FarmerContactList = {
  id: string;
  name: string;
  purpose: "farmerbook_invitation" | "farmerbook_member_support";
  createdAt: string;
};

export type FarmerContactEvent = {
  id: string;
  contactId: string;
  eventType: string;
  details: Record<string, unknown>;
  createdAt: string;
};

export type YouTubeDiscoveryResult = {
  channelId: string;
  channelUrl: string;
  title: string;
  description: string;
  discoveryProvider: "youtube_data_api";
  transient: true;
};

export type YouTubeDiscoveryRun = {
  id: string;
  locale: SupportedLocale;
  state: "reserved" | "succeeded" | "failed";
  resultCount: number | null;
  failureCode: string | null;
  requestedAt: string;
  completedAt: string | null;
};

export type FarmerDatabaseDashboard = {
  configured: boolean;
  lists: FarmerContactList[];
  contacts: FarmerContact[];
  events: FarmerContactEvent[];
  discoveryRuns: YouTubeDiscoveryRun[];
  summary: {
    total: number;
    emailConsented: number;
    pending: number;
    expired: number;
    suppressed: number;
  };
};

export type FarmerDatabaseActionResult<T = undefined> =
  | { ok: true; code: string; data: T }
  | {
      ok: false;
      code:
        | "FEATURE_DISABLED"
        | "NOT_CONFIGURED"
        | "FORBIDDEN"
        | "INVALID_INPUT"
        | "DUPLICATE"
        | "NOT_FOUND"
        | "CONSENT_REQUIRED"
        | "SEARCH_QUOTA_EXCEEDED"
        | "SEARCH_UNAVAILABLE"
        | "DATA_UNAVAILABLE";
      message: string;
      fieldErrors?: Record<string, readonly string[]>;
    };
