import type {
  OrganizationActionErrorCode,
  OrganizationActionResult,
} from "./types";

const publicMessages: Record<OrganizationActionErrorCode, string> = {
  FEATURE_DISABLED: "Inc profiles are not available yet.",
  INVALID_INPUT: "Check the company details and try again.",
  NOT_CONFIGURED: "Inc profiles are temporarily unavailable.",
  FORBIDDEN: "You do not have permission to manage this company.",
  NOT_FOUND: "This company or offer is no longer available.",
  CONFLICT: "This record changed. Refresh it before trying again.",
  NOT_PUBLISHABLE:
    "This record cannot be published in its current state. Check its required details and moderation status.",
  DATA_UNAVAILABLE: "The request could not be completed. Please try again.",
};

export function actionFailure(
  code: OrganizationActionErrorCode,
  fieldErrors?: Readonly<Record<string, readonly string[]>>,
): OrganizationActionResult<never> {
  return {
    ok: false,
    code,
    message: publicMessages[code],
    ...(fieldErrors ? { fieldErrors } : {}),
  };
}

export function databaseActionFailure(error: unknown) {
  const code =
    typeof error === "object" && error && "code" in error
      ? String(error.code)
      : "";
  if (code === "23505" || code === "40001") {
    return actionFailure("CONFLICT");
  }
  if (code === "42501") return actionFailure("FORBIDDEN");
  if (code === "P0002" || code === "PGRST116") {
    return actionFailure("NOT_FOUND");
  }
  if (code === "22023" || code === "22007") {
    return actionFailure("INVALID_INPUT");
  }
  if (code === "55000") return actionFailure("NOT_PUBLISHABLE");
  return actionFailure("DATA_UNAVAILABLE");
}
