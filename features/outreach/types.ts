import type { SupportedLocale } from "@/lib/i18n/locales";

export const outreachSourceTypes = [
  "website",
  "youtube",
  "instagram",
  "facebook",
  "linkedin",
  "other_social",
  "unsupported",
] as const;

export type OutreachSourceType = (typeof outreachSourceTypes)[number];

export const outreachRoles = [
  "farmer",
  "customer",
  "wholesaler",
  "agri_business",
  "unknown",
] as const;

export type OutreachRole = (typeof outreachRoles)[number];

export const outreachStatuses = [
  "discovered",
  "consent_blocked",
  "consent_requested",
  "consented",
  "qualified",
  "introduction_queued",
  "introduced",
  "onboarding",
  "joined",
  "declined",
  "expired",
  "withdrawn",
  "suppressed",
] as const;

export type OutreachStatus = (typeof outreachStatuses)[number];

export const outreachChannels = ["email", "sms", "whatsapp"] as const;
export type OutreachChannel = (typeof outreachChannels)[number];

export type SourceEvidence = {
  sourceUrl: string;
  excerpt: string;
  origin: "website" | "pasted_description" | "screenshot_ocr";
};

export type ContactCandidate = {
  channel: "email" | "phone";
  value: string;
  normalizedValue: string;
  evidence: SourceEvidence;
  explicitlyForBusinessEnquiries: boolean;
  needsHumanConfirmation: boolean;
};

export type OutreachAnalysis = {
  suggestedRole: OutreachRole;
  categorySlugs: string[];
  preferredLocale: SupportedLocale;
  rationale: string;
  introductionDraft: string;
  run: {
    model: string;
    promptVersion: string;
    status: "succeeded" | "fallback";
    failureCode: string | null;
    durationMs: number;
  };
};

export type OutreachProspect = {
  id: string;
  sourceUrl: string;
  sourceType: OutreachSourceType;
  businessName: string | null;
  status: OutreachStatus;
  suggestedRole: OutreachRole;
  preferredLocale: SupportedLocale;
  categorySlugs: string[];
  introductionDraft: string | null;
  consentChannel: OutreachChannel | null;
  consentGrantedAt: string | null;
  consentWithdrawnAt: string | null;
  retentionExpiresAt: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
};

export type OutreachDashboardSummary = {
  discovered: number;
  blocked: number;
  consented: number;
  introduced: number;
  onboarding: number;
  joined: number;
  optedOut: number;
};

export type OutreachRuntimeHealth = {
  deliveryPaused: boolean;
  pauseReason: string;
  pendingCount: number;
  failedCount: number;
  lastDeliveredAt: string | null;
  lastProviderEventAt: string | null;
};

export type OutreachFailure = {
  id: string;
  prospectId: string;
  businessName: string | null;
  purpose: string;
  attempts: number;
  failureCode: string | null;
  createdAt: string;
  expiresAt: string;
};

export type OutreachHistoryItem = {
  historyType: string;
  eventType: string;
  summary: string;
  occurredAt: string;
};

export const outreachActionErrorCodes = [
  "FEATURE_DISABLED",
  "NOT_CONFIGURED",
  "FORBIDDEN",
  "INVALID_INPUT",
  "UNSUPPORTED_SOURCE",
  "EVIDENCE_REQUIRED",
  "BLOCKED_SOURCE",
  "FETCH_FAILED",
  "SEARCH_NO_MATCH",
  "SEARCH_QUOTA_EXCEEDED",
  "SEARCH_UNAVAILABLE",
  "AI_UNAVAILABLE",
  "CONSENT_REQUIRED",
  "CONSENT_BLOCKED",
  "DELIVERY_PAUSED",
  "CONFLICT",
  "NOT_FOUND",
  "DATA_UNAVAILABLE",
] as const;

export type OutreachActionErrorCode =
  (typeof outreachActionErrorCodes)[number];

export type OutreachActionResult<T> =
  | { ok: true; code: string; data: T }
  | {
      ok: false;
      code: OutreachActionErrorCode;
      message: string;
      fieldErrors?: Readonly<Record<string, readonly string[]>>;
    };
