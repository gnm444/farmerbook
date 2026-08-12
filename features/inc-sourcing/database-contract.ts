export const INC_SOURCING_TABLES = {
  requests: "inc_sourcing_requests",
  categories: "inc_sourcing_request_categories",
  responses: "inc_sourcing_responses",
  requestEvents: "inc_sourcing_request_events",
  publicClaims: "public_organization_verification_claims",
  verificationRequests: "organization_verification_requests",
} as const;

export const INC_SOURCING_RPCS = {
  create: "create_inc_sourcing_request",
  setPublication: "set_inc_sourcing_request_publication",
  respond: "respond_to_inc_sourcing_request",
} as const;
