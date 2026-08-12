import { throwDataUnavailable } from "@/lib/data-errors";
import { isSupabaseConfigured } from "@/lib/env";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { createClient } from "@/lib/supabase/server";
import {
  loadPublicOrganizationsByIds,
} from "@/features/organizations/queries";
import type {
  OrganizationServiceArea,
  OrganizationSummary,
} from "@/features/organizations/types";
import { OFFER_TABLES } from "@/features/organizations/database-contract";
import {
  offerIdSchema,
  offerKindSchema,
  offerLocaleSchema,
  offerPriceModelSchema,
  offerPriceUnitSchema,
} from "./schemas";
import { isOfferModerationEligibleForPublic } from "./policies";
import type {
  BusinessOffer,
  OfferAvailabilityState,
  OfferModerationState,
  OfferPrice,
  OfferPublicationState,
} from "./types";

type OfferRow = {
  id: string;
  organization_id: string;
  kind: string;
  content_locale: string;
  title: string;
  description: string;
  terms: string;
  valid_from: string;
  valid_until: string;
  price_model: string;
  currency: string | null;
  price_min: number | null;
  price_max: number | null;
  price_unit: string | null;
  publication_state: OfferPublicationState;
  moderation_state: OfferModerationState;
  requires_moderation_review: boolean;
  created_at: string;
  updated_at: string;
  published_at: string | null;
};

type OfferCategoryRow = { offer_id: string; category_slug: string };
type OfferServiceAreaRow = {
  offer_id: string;
  state: string;
  district: string | null;
  service_radius_km: number | null;
};

const offerColumns =
  "id, organization_id, kind, content_locale, title, description, terms, valid_from, valid_until, price_model, currency, price_min, price_max, price_unit, publication_state, moderation_state, requires_moderation_review, created_at, updated_at, published_at";

const publicationStates = new Set<OfferPublicationState>([
  "draft",
  "published",
  "paused",
  "archived",
]);
const moderationStates = new Set<OfferModerationState>([
  "not_required",
  "pending",
  "approved",
  "rejected",
]);

function offersEnabled() {
  return (
    isFeatureEnabled("ENABLE_AGRI_BUSINESSES") &&
    isFeatureEnabled("ENABLE_BUSINESS_OFFERS")
  );
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function offerAvailabilityState(
  validFrom: string,
  validUntil: string,
  currentDate = today(),
): OfferAvailabilityState {
  if (currentDate < validFrom) return "scheduled";
  if (currentDate > validUntil) return "expired";
  return "active";
}

function mapPrice(row: OfferRow): OfferPrice {
  const model = offerPriceModelSchema.parse(row.price_model);
  if (model === "quote" || model === "free") return { model };
  const currency = row.currency === "INR" ? "INR" : null;
  const unit = offerPriceUnitSchema.safeParse(row.price_unit);
  if (!currency || !unit.success || row.price_min == null) {
    throw new Error("Invalid offer price contract.");
  }
  if (model === "range") {
    if (row.price_max == null || Number(row.price_max) < Number(row.price_min)) {
      throw new Error("Invalid offer range contract.");
    }
    return {
      model,
      currency,
      minimum: Number(row.price_min),
      maximum: Number(row.price_max),
      unit: unit.data,
    };
  }
  return {
    model,
    currency,
    amount: Number(row.price_min),
    unit: unit.data,
  };
}

function mapOffer(
  row: OfferRow,
  categoryRows: OfferCategoryRow[],
  serviceAreaRows: OfferServiceAreaRow[],
  organizations: Map<string, OrganizationSummary>,
): BusinessOffer {
  const kind = offerKindSchema.safeParse(row.kind);
  const locale = offerLocaleSchema.safeParse(row.content_locale);
  if (
    !kind.success ||
    !locale.success ||
    !publicationStates.has(row.publication_state) ||
    !moderationStates.has(row.moderation_state)
  ) {
    throw new Error("Invalid offer row contract.");
  }

  const serviceAreas: OrganizationServiceArea[] = serviceAreaRows
    .filter((area) => area.offer_id === row.id)
    .map((area) => ({
      state: area.state,
      ...(area.district ? { district: area.district } : {}),
      ...(area.service_radius_km != null
        ? { serviceRadiusKm: Number(area.service_radius_km) }
        : {}),
    }));

  return {
    id: row.id,
    organizationId: row.organization_id,
    kind: kind.data,
    contentLocale: locale.data,
    title: row.title,
    description: row.description,
    terms: row.terms,
    categorySlugs: categoryRows
      .filter((category) => category.offer_id === row.id)
      .map((category) => category.category_slug),
    serviceAreas,
    validFrom: row.valid_from,
    validUntil: row.valid_until,
    price: mapPrice(row),
    publicationState: row.publication_state,
    moderationState: row.moderation_state,
    requiresModerationReview: row.requires_moderation_review,
    availabilityState: offerAvailabilityState(row.valid_from, row.valid_until),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.published_at ? { publishedAt: row.published_at } : {}),
    ...(organizations.get(row.organization_id)
      ? { organization: organizations.get(row.organization_id) }
      : {}),
  };
}

async function hydrateOffers(
  rows: OfferRow[],
  organizations?: readonly OrganizationSummary[],
) {
  if (!rows.length) return [];
  const offerIds = rows.map((row) => row.id);
  const organizationIds = [...new Set(rows.map((row) => row.organization_id))];
  const supabase = await createClient();
  const [categoryResult, serviceAreaResult, publicOrganizations] = await Promise.all([
    supabase
      .from(OFFER_TABLES.categories)
      .select("offer_id, category_slug")
      .in("offer_id", offerIds),
    supabase
      .from(OFFER_TABLES.serviceAreas)
      .select("offer_id, state, district, service_radius_km")
      .in("offer_id", offerIds),
    organizations
      ? Promise.resolve([...organizations])
      : loadPublicOrganizationsByIds(organizationIds),
  ]);

  if (categoryResult.error || serviceAreaResult.error) {
    throwDataUnavailable("offers.public-hydration");
  }

  const organizationsById = new Map(
    publicOrganizations.map((organization) => [organization.id, organization]),
  );
  try {
    const mapped = rows.map((row) =>
      mapOffer(
        row,
        (categoryResult.data ?? []) as OfferCategoryRow[],
        (serviceAreaResult.data ?? []) as OfferServiceAreaRow[],
        organizationsById,
      ),
    );
    return organizations
      ? mapped
      : mapped.filter(
          (offer) =>
            Boolean(offer.organization) &&
            isOfferModerationEligibleForPublic(offer),
        );
  } catch {
    throwDataUnavailable("offers.row-contract");
  }
}

export type PublicOfferFilters = {
  organizationId?: string;
  kind?: string;
  limit?: number;
};

export async function loadPublicOffers(
  filters: PublicOfferFilters = {},
): Promise<BusinessOffer[]> {
  if (!offersEnabled() || !isSupabaseConfigured()) return [];

  const parsedKind = filters.kind
    ? offerKindSchema.safeParse(filters.kind)
    : null;
  if (parsedKind && !parsedKind.success) return [];
  const boundedLimit = Math.max(1, Math.min(Math.trunc(filters.limit ?? 24), 50));
  const supabase = await createClient();
  let query = supabase
    .from(OFFER_TABLES.offers)
    .select(offerColumns)
    .eq("publication_state", "published")
    .in("moderation_state", ["not_required", "approved"])
    .lte("valid_from", today())
    .gte("valid_until", today())
    .order("published_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(boundedLimit);

  if (filters.organizationId) {
    query = query.eq("organization_id", filters.organizationId);
  }
  if (parsedKind?.success) query = query.eq("kind", parsedKind.data);

  const { data, error } = await query;
  if (error) throwDataUnavailable("offers.public-list");
  return hydrateOffers((data ?? []) as OfferRow[]);
}

export async function loadPublicOfferById(
  offerId: string,
): Promise<BusinessOffer | null> {
  if (!offersEnabled() || !isSupabaseConfigured()) return null;
  const parsedId = offerIdSchema.safeParse(offerId);
  if (!parsedId.success) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from(OFFER_TABLES.offers)
    .select(offerColumns)
    .eq("id", parsedId.data)
    .eq("publication_state", "published")
    .in("moderation_state", ["not_required", "approved"])
    .lte("valid_from", today())
    .gte("valid_until", today())
    .maybeSingle();

  if (error) throwDataUnavailable("offers.public-detail");
  if (!data) return null;
  const [offer] = await hydrateOffers([data as OfferRow]);
  return offer ?? null;
}

export async function loadOffersForMemberOrganizations(
  organizations: readonly OrganizationSummary[],
): Promise<BusinessOffer[]> {
  if (!offersEnabled() || !isSupabaseConfigured() || !organizations.length) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from(OFFER_TABLES.offers)
    .select(offerColumns)
    .in(
      "organization_id",
      organizations.map((organization) => organization.id),
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throwDataUnavailable("offers.member-list");
  return hydrateOffers((data ?? []) as OfferRow[], organizations);
}
