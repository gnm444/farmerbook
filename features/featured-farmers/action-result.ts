export type FeaturedFarmerErrorCode =
  | "FEATURE_DISABLED"
  | "NOT_CONFIGURED"
  | "FORBIDDEN"
  | "INVALID_INPUT"
  | "UNSUPPORTED_SOURCE"
  | "EVIDENCE_REQUIRED"
  | "BLOCKED_SOURCE"
  | "FETCH_FAILED"
  | "SEARCH_QUOTA_EXCEEDED"
  | "SEARCH_UNAVAILABLE"
  | "CONFLICT"
  | "NOT_FOUND"
  | "PUBLICATION_NOT_READY"
  | "DATA_UNAVAILABLE";

export type FeaturedFarmerActionResult<T> =
  | { ok: true; code: string; data: T }
  | {
      ok: false;
      code: FeaturedFarmerErrorCode;
      message: string;
      fieldErrors?: Readonly<Record<string, readonly string[]>>;
    };

const messages: Record<FeaturedFarmerErrorCode, string> = {
  FEATURE_DISABLED: "Featured Farmer publishing is not open yet.",
  NOT_CONFIGURED: "The Featured Farmer newsroom is not configured.",
  FORBIDDEN: "Administrator access is required.",
  INVALID_INPUT: "Check the supplied information and try again.",
  UNSUPPORTED_SOURCE: "That public source type is not supported.",
  EVIDENCE_REQUIRED:
    "Add public evidence for this source. FarmerBook does not scrape protected social pages.",
  BLOCKED_SOURCE: "That website cannot be accessed safely.",
  FETCH_FAILED: "The public page could not be read.",
  SEARCH_QUOTA_EXCEEDED:
    "The approved YouTube search quota has been reached. No provider request was made.",
  SEARCH_UNAVAILABLE: "YouTube research is temporarily unavailable.",
  CONFLICT: "This story changed. Refresh before trying again.",
  NOT_FOUND: "This research record is no longer available.",
  PUBLICATION_NOT_READY:
    "The story is not ready to publish. Resolve every evidence and rights blocker first.",
  DATA_UNAVAILABLE: "The Featured Farmer request could not be completed.",
};

export function featuredFarmerFailure(
  code: FeaturedFarmerErrorCode,
  fieldErrors?: Readonly<Record<string, readonly string[]>>,
): FeaturedFarmerActionResult<never> {
  return {
    ok: false,
    code,
    message: messages[code],
    ...(fieldErrors ? { fieldErrors } : {}),
  };
}

export function featuredFarmerDatabaseFailure(error: unknown) {
  const databaseCode =
    typeof error === "object" && error && "code" in error
      ? String(error.code)
      : "";
  const detail =
    typeof error === "object" && error && "details" in error
      ? String(error.details).toUpperCase()
      : "";
  if (detail === "FEATURE_DISABLED") {
    return featuredFarmerFailure("FEATURE_DISABLED");
  }
  if (detail === "EVIDENCE_REQUIRED") {
    return featuredFarmerFailure("EVIDENCE_REQUIRED");
  }
  if (detail === "PUBLICATION_NOT_READY") {
    return featuredFarmerFailure("PUBLICATION_NOT_READY");
  }
  if (detail === "SEARCH_QUOTA_EXCEEDED") {
    return featuredFarmerFailure("SEARCH_QUOTA_EXCEEDED");
  }
  if (databaseCode === "23505" || databaseCode === "40001") {
    return featuredFarmerFailure("CONFLICT");
  }
  if (databaseCode === "42501") return featuredFarmerFailure("FORBIDDEN");
  if (databaseCode === "P0002" || databaseCode === "PGRST116") {
    return featuredFarmerFailure("NOT_FOUND");
  }
  if (databaseCode === "22023" || databaseCode === "22007") {
    return featuredFarmerFailure("INVALID_INPUT");
  }
  return featuredFarmerFailure("DATA_UNAVAILABLE");
}
