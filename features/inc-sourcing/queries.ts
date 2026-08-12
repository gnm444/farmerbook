import { z } from "zod";
import { loadPublicOrganizationsByIds } from "@/features/organizations/queries";
import type { OrganizationSummary } from "@/features/organizations/types";
import { throwDataUnavailable } from "@/lib/data-errors";
import { isDemoMode, isSupabaseConfigured } from "@/lib/env";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { demoIncSourcingRequests } from "@/lib/inc-sourcing-demo";
import { createClient } from "@/lib/supabase/server";
import { INC_SOURCING_TABLES } from "./database-contract";
import {
  INC_SOURCING_CADENCES,
  INC_SOURCING_CLAIM_TYPES,
  INC_SOURCING_UNITS,
  type IncSourcingPrice,
  type IncSourcingRequest,
  type IncVerificationClaim,
} from "./types";

type RequestRow = {
  id: string;
  organization_id: string;
  content_locale: string;
  product_name: string;
  variety_or_grade: string;
  quality_requirements: string;
  quantity_min: number;
  quantity_max: number | null;
  quantity_unit: string;
  cadence: string;
  delivery_mode: "collect" | "deliver" | "either";
  destination_state: string;
  destination_district: string | null;
  opens_on: string;
  closes_on: string;
  need_by: string;
  price_model: "quote" | "target" | "range";
  currency: string | null;
  price_min: number | null;
  price_max: number | null;
  price_unit: string | null;
  payment_terms: string;
  required_licence_scope: string;
  publication_state: IncSourcingRequest["publicationState"];
  moderation_state: IncSourcingRequest["moderationState"];
  created_at: string;
  updated_at: string;
  published_at: string | null;
};
type CategoryRow = { sourcing_request_id: string; category_slug: string };
type ClaimRow = {
  id: string;
  organization_id: string;
  claim_type: string;
  scope: string;
  verifier_class: IncVerificationClaim["verifierClass"];
  provider_name: string;
  verified_at: string;
  expires_at: string | null;
};

const requestColumns = "id, organization_id, content_locale, product_name, variety_or_grade, quality_requirements, quantity_min, quantity_max, quantity_unit, cadence, delivery_mode, destination_state, destination_district, opens_on, closes_on, need_by, price_model, currency, price_min, price_max, price_unit, payment_terms, required_licence_scope, publication_state, moderation_state, created_at, updated_at, published_at";

function enabled() {
  return isFeatureEnabled("ENABLE_AGRI_BUSINESSES") &&
    isFeatureEnabled("ENABLE_INC_SOURCING");
}

function mapPrice(row: RequestRow): IncSourcingPrice {
  if (row.price_model === "quote") return { model: "quote" };
  const unit = z.enum(INC_SOURCING_UNITS).safeParse(row.price_unit);
  if (row.currency !== "INR" || row.price_min == null || !unit.success) {
    throw new Error("Invalid Inc sourcing price contract.");
  }
  if (row.price_model === "range") {
    if (row.price_max == null || Number(row.price_max) < Number(row.price_min)) {
      throw new Error("Invalid Inc sourcing price range.");
    }
    return {
      model: "range",
      currency: "INR",
      minimum: Number(row.price_min),
      maximum: Number(row.price_max),
      unit: unit.data,
    };
  }
  return { model: "target", currency: "INR", amount: Number(row.price_min), unit: unit.data };
}

async function hydrate(
  rows: RequestRow[],
  suppliedOrganizations?: readonly OrganizationSummary[],
): Promise<IncSourcingRequest[]> {
  if (!rows.length) return [];
  const requestIds = rows.map((row) => row.id);
  const organizationIds = [...new Set(rows.map((row) => row.organization_id))];
  const supabase = await createClient();
  const [categoryResult, claimResult, organizations] = await Promise.all([
    supabase.from(INC_SOURCING_TABLES.categories)
      .select("sourcing_request_id, category_slug").in("sourcing_request_id", requestIds),
    supabase.from(INC_SOURCING_TABLES.publicClaims)
      .select("id, organization_id, claim_type, scope, verifier_class, provider_name, verified_at, expires_at")
      .in("organization_id", organizationIds),
    suppliedOrganizations
      ? Promise.resolve([...suppliedOrganizations])
      : loadPublicOrganizationsByIds(organizationIds),
  ]);
  if (categoryResult.error || claimResult.error) throwDataUnavailable("inc-sourcing.hydration");
  const organizationById = new Map(organizations.map((organization) => [organization.id, organization]));
  const categories = (categoryResult.data ?? []) as CategoryRow[];
  const claims = (claimResult.data ?? []) as ClaimRow[];
  try {
    return rows.map((row) => {
      const locale = z.enum([
        "en-IN", "as-IN", "bn-IN", "brx-IN", "doi-IN", "gu-IN", "hi-IN",
        "kn-IN", "ks-Arab-IN", "kok-Deva-IN", "mai-IN", "ml-IN", "mni-Mtei-IN",
        "mr-IN", "ne-IN", "or-IN", "pa-Guru-IN", "sa-IN", "sat-Olck-IN",
        "sd-Arab-IN", "ta-IN", "te-IN", "ur-IN",
      ]).parse(row.content_locale);
      const quantityUnit = z.enum(INC_SOURCING_UNITS).parse(row.quantity_unit);
      const cadence = z.enum(INC_SOURCING_CADENCES).parse(row.cadence);
      const verificationClaims = claims
        .filter((claim) => claim.organization_id === row.organization_id)
        .map((claim): IncVerificationClaim => ({
          id: claim.id,
          organizationId: claim.organization_id,
          claimType: z.enum(INC_SOURCING_CLAIM_TYPES).parse(claim.claim_type),
          scope: claim.scope,
          verifierClass: claim.verifier_class,
          providerName: claim.provider_name,
          verifiedAt: claim.verified_at,
          ...(claim.expires_at ? { expiresAt: claim.expires_at } : {}),
        }));
      return {
        id: row.id,
        organizationId: row.organization_id,
        contentLocale: locale,
        productName: row.product_name,
        varietyOrGrade: row.variety_or_grade,
        qualityRequirements: row.quality_requirements,
        quantityMinimum: Number(row.quantity_min),
        ...(row.quantity_max != null ? { quantityMaximum: Number(row.quantity_max) } : {}),
        quantityUnit,
        cadence,
        deliveryMode: row.delivery_mode,
        destinationState: row.destination_state,
        ...(row.destination_district ? { destinationDistrict: row.destination_district } : {}),
        opensOn: row.opens_on,
        closesOn: row.closes_on,
        needBy: row.need_by,
        price: mapPrice(row),
        paymentTerms: row.payment_terms,
        requiredLicenceScope: row.required_licence_scope,
        categorySlugs: categories.filter((category) => category.sourcing_request_id === row.id).map((category) => category.category_slug),
        publicationState: row.publication_state,
        moderationState: row.moderation_state,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        ...(row.published_at ? { publishedAt: row.published_at } : {}),
        ...(organizationById.get(row.organization_id) ? { organization: organizationById.get(row.organization_id) } : {}),
        verificationClaims,
      };
    });
  } catch {
    throwDataUnavailable("inc-sourcing.row-contract");
  }
}

export async function loadPublicIncSourcingRequests(limit = 30): Promise<IncSourcingRequest[]> {
  if (!enabled()) return [];
  if (isDemoMode()) return demoIncSourcingRequests.slice(0, limit);
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from(INC_SOURCING_TABLES.requests)
    .select(requestColumns)
    .eq("publication_state", "published")
    .in("moderation_state", ["not_required", "approved"])
    .lte("opens_on", new Date().toISOString().slice(0, 10))
    .gte("closes_on", new Date().toISOString().slice(0, 10))
    .order("published_at", { ascending: false })
    .limit(Math.max(1, Math.min(Math.trunc(limit), 50)));
  if (error) throwDataUnavailable("inc-sourcing.public-list");
  return hydrate((data ?? []) as RequestRow[]);
}

export async function loadPublicIncSourcingRequest(id: string): Promise<IncSourcingRequest | null> {
  if (!enabled()) return null;
  if (!z.uuid().safeParse(id).success) return null;
  if (isDemoMode()) return demoIncSourcingRequests.find((request) => request.id === id) ?? null;
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.from(INC_SOURCING_TABLES.requests)
    .select(requestColumns).eq("id", id).eq("publication_state", "published")
    .in("moderation_state", ["not_required", "approved"]).maybeSingle();
  if (error) throwDataUnavailable("inc-sourcing.public-detail");
  if (!data) return null;
  return (await hydrate([data as RequestRow]))[0] ?? null;
}

export async function loadIncSourcingRequestsForOrganizations(
  organizations: readonly OrganizationSummary[],
): Promise<IncSourcingRequest[]> {
  if (!enabled() || !isSupabaseConfigured() || !organizations.length) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from(INC_SOURCING_TABLES.requests)
    .select(requestColumns)
    .in("organization_id", organizations.map((organization) => organization.id))
    .order("created_at", { ascending: false }).limit(100);
  if (error) throwDataUnavailable("inc-sourcing.member-list");
  return hydrate((data ?? []) as RequestRow[], organizations);
}

export async function loadIncVerificationRequests(organizationIds: readonly string[]) {
  if (!enabled() || !isSupabaseConfigured() || !organizationIds.length) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from(INC_SOURCING_TABLES.verificationRequests)
    .select("id, organization_id, status, requested_claim_types, official_domain, applicant_note, created_at, updated_at")
    .in("organization_id", [...organizationIds])
    .order("created_at", { ascending: false });
  if (error) throwDataUnavailable("inc-sourcing.verification-list");
  return data ?? [];
}
