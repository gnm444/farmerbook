import type {
  OutreachActionErrorCode,
  OutreachActionResult,
} from "./types";

const messages: Record<OutreachActionErrorCode, string> = {
  FEATURE_DISABLED: "FarmerBook invitations are not open yet.",
  NOT_CONFIGURED: "The consent and invitation service is not configured.",
  FORBIDDEN: "You do not have permission to use the outreach agent.",
  INVALID_INPUT: "Check the supplied information and try again.",
  UNSUPPORTED_SOURCE: "That source type is not supported.",
  EVIDENCE_REQUIRED:
    "Paste the public business description or upload a screenshot. FarmerBook does not scrape social profiles.",
  BLOCKED_SOURCE: "That website cannot be accessed safely.",
  FETCH_FAILED: "The public business page could not be read.",
  SEARCH_NO_MATCH:
    "No sufficiently supported Farmer match was found. Add a district, state or farming hint and try again.",
  SEARCH_QUOTA_EXCEEDED:
    "The approved Farmer search quota has been reached. No additional provider request was made.",
  SEARCH_UNAVAILABLE:
    "The approved Farmer search provider is temporarily unavailable.",
  AI_UNAVAILABLE: "AI analysis is unavailable; a safe default draft was used.",
  CONSENT_REQUIRED: "Verified consent is required before FarmerBook can make contact.",
  CONSENT_BLOCKED: "No compliant consent channel is available for this contact.",
  DELIVERY_PAUSED: "Outreach delivery is paused. Resume it before retrying.",
  CONFLICT: "This prospect changed. Refresh before trying again.",
  NOT_FOUND: "This prospect is no longer available.",
  DATA_UNAVAILABLE: "The outreach request could not be completed.",
};

export function outreachFailure(
  code: OutreachActionErrorCode,
  fieldErrors?: Readonly<Record<string, readonly string[]>>,
): OutreachActionResult<never> {
  return {
    ok: false,
    code,
    message: messages[code],
    ...(fieldErrors ? { fieldErrors } : {}),
  };
}

export function outreachDatabaseFailure(error: unknown) {
  const databaseCode =
    typeof error === "object" && error && "code" in error
      ? String(error.code)
      : "";
  const details =
    typeof error === "object" && error && "details" in error
      ? String(error.details)
      : "";
  if (details === "FEATURE_DISABLED") return outreachFailure("FEATURE_DISABLED");
  if (details === "CONSENT_REQUIRED") return outreachFailure("CONSENT_REQUIRED");
  if (details === "CONTACT_SUPPRESSED") return outreachFailure("CONSENT_BLOCKED");
  if (details === "DELIVERY_PAUSED") return outreachFailure("DELIVERY_PAUSED");
  if (details === "NOT_RETRYABLE") return outreachFailure("CONFLICT");
  if (details === "IDEMPOTENCY_CONFLICT") return outreachFailure("CONFLICT");
  if (details === "SEARCH_QUOTA_EXCEEDED") {
    return outreachFailure("SEARCH_QUOTA_EXCEEDED");
  }
  if (databaseCode === "23505" || databaseCode === "40001") {
    return outreachFailure("CONFLICT");
  }
  if (databaseCode === "42501") return outreachFailure("FORBIDDEN");
  if (databaseCode === "P0002" || databaseCode === "PGRST116") {
    return outreachFailure("NOT_FOUND");
  }
  if (databaseCode === "22023" || databaseCode === "22007") {
    return outreachFailure("INVALID_INPUT");
  }
  return outreachFailure("DATA_UNAVAILABLE");
}
