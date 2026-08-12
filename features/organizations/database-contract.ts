/**
 * Application-side contract for the forward organization/offer migration.
 *
 * The migration must keep these table, column and RPC names stable. Every RPC
 * derives the actor from auth.uid(), revalidates membership/capability and
 * performs its multi-table writes atomically. No RPC accepts an actor/profile
 * ID from the browser.
 */
export const ORGANIZATION_TABLES = {
  organizations: "organizations",
  memberships: "organization_memberships",
  categories: "organization_category_affinities",
  serviceAreas: "organization_service_areas",
  privateDetails: "organization_private_details",
  verificationRequests: "organization_verification_requests",
  certificationClaims: "certification_claims",
} as const;

export const OFFER_TABLES = {
  offers: "business_offers",
  categories: "business_offer_categories",
  serviceAreas: "business_offer_service_areas",
  media: "business_offer_media",
  enquiries: "business_offer_enquiries",
  enquiryEvents: "business_offer_enquiry_events",
  enquiryAssignments: "business_offer_enquiry_assignments",
} as const;

export const ORGANIZATION_RPCS = {
  create: "create_organization_with_owner",
  update: "update_organization",
  setPublication: "set_organization_publication",
} as const;

export const OFFER_RPCS = {
  create: "create_business_offer",
  update: "update_business_offer",
  setPublication: "set_business_offer_publication",
  connect: "connect_to_business_offer",
} as const;

export type DatabaseServiceAreaInput = {
  state: string;
  district: string | null;
  service_radius_km: number | null;
};

export type CreateOrganizationRpcArgs = {
  slug_input: string;
  display_name_input: string;
  organization_type_input: string;
  description_input: string;
  state_input: string;
  district_input: string | null;
  website_url_input: string | null;
  category_slugs_input: string[];
  service_areas_input: DatabaseServiceAreaInput[];
};

export type CreateOrganizationRpcResult = {
  organization_id: string;
  slug: string;
};

export type UpdateOrganizationRpcArgs = CreateOrganizationRpcArgs & {
  organization_id_input: string;
  expected_updated_at_input: string;
};

export type UpdateOrganizationRpcResult = {
  organization_id: string;
  slug: string;
  updated_at: string;
};

export type SetOrganizationPublicationRpcArgs = {
  organization_id_input: string;
  publication_state_input: "published" | "unpublished";
  expected_updated_at_input: string;
};

export type SetOrganizationPublicationRpcResult = {
  organization_id: string;
  slug: string;
  publication_state: "published" | "unpublished";
  updated_at: string;
};

export type CreateBusinessOfferRpcArgs = {
  organization_id_input: string;
  kind_input: string;
  content_locale_input: string;
  title_input: string;
  description_input: string;
  terms_input: string;
  valid_from_input: string;
  valid_until_input: string;
  price_model_input: string;
  currency_input: "INR" | null;
  price_min_input: number | null;
  price_max_input: number | null;
  price_unit_input: string | null;
  category_slugs_input: string[];
  service_areas_input: DatabaseServiceAreaInput[];
  publication_intent_input: "draft" | "submit";
  requires_moderation_review_input: boolean;
};

export type CreateBusinessOfferRpcResult = {
  offer_id: string;
  publication_state: string;
  moderation_state: string;
};

export type UpdateBusinessOfferRpcArgs = CreateBusinessOfferRpcArgs & {
  offer_id_input: string;
  expected_updated_at_input: string;
};

export type UpdateBusinessOfferRpcResult = CreateBusinessOfferRpcResult & {
  updated_at: string;
};

export type SetBusinessOfferPublicationRpcArgs = {
  offer_id_input: string;
  publication_state_input: "draft" | "published" | "paused" | "archived";
  expected_updated_at_input: string;
};

export type SetBusinessOfferPublicationRpcResult = {
  offer_id: string;
  publication_state: string;
  moderation_state: string;
  updated_at: string;
};

export type ConnectToBusinessOfferRpcArgs = {
  offer_id_input: string;
  message_input: string;
  quantity_needed_input: string | null;
  need_by_input: string | null;
  idempotency_key_input: string;
};

export type ConnectToBusinessOfferRpcResult = {
  enquiry_id: string;
  event_id: string;
};
