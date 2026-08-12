import { throwDataUnavailable } from "@/lib/data-errors";
import { isSupabaseConfigured } from "@/lib/env";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { createClient } from "@/lib/supabase/server";
import {
  ORGANIZATION_TABLES,
} from "./database-contract";
import { organizationSlugSchema, organizationTypeSchema } from "./schemas";
import type {
  OrganizationForMember,
  OrganizationMembership,
  OrganizationMembershipStatus,
  OrganizationModerationState,
  OrganizationPublicationState,
  OrganizationServiceArea,
  OrganizationSummary,
  OrganizationVerificationState,
} from "./types";
import type { OrganizationMembershipRole } from "@/features/auth/capabilities";

type OrganizationRow = {
  id: string;
  slug: string;
  display_name: string;
  organization_type: string;
  description: string;
  state: string;
  district: string | null;
  website_url: string | null;
  publication_state: OrganizationPublicationState;
  verification_state: OrganizationVerificationState;
  moderation_state: OrganizationModerationState;
  created_at: string;
  updated_at: string;
  published_at: string | null;
};

type OrganizationCategoryRow = {
  organization_id: string;
  category_slug: string;
  is_primary: boolean;
};

type OrganizationServiceAreaRow = {
  organization_id: string;
  state: string;
  district: string | null;
  service_radius_km: number | null;
};

type MembershipRow = {
  organization_id: string;
  profile_id: string;
  role: OrganizationMembershipRole;
  status: OrganizationMembershipStatus;
};

const organizationColumns =
  "id, slug, display_name, organization_type, description, state, district, website_url, publication_state, verification_state, moderation_state, created_at, updated_at, published_at";

const publicationStates = new Set<OrganizationPublicationState>([
  "draft",
  "published",
  "unpublished",
]);
const verificationStates = new Set<OrganizationVerificationState>([
  "unverified",
  "pending",
  "verified",
  "rejected",
]);
const moderationStates = new Set<OrganizationModerationState>([
  "active",
  "restricted",
  "suspended",
]);

function organizationsEnabled() {
  return isFeatureEnabled("ENABLE_AGRI_BUSINESSES");
}

function mapServiceArea(row: OrganizationServiceAreaRow): OrganizationServiceArea {
  return {
    state: row.state,
    ...(row.district ? { district: row.district } : {}),
    ...(row.service_radius_km != null
      ? { serviceRadiusKm: Number(row.service_radius_km) }
      : {}),
  };
}

function mapOrganization(
  row: OrganizationRow,
  categoryRows: OrganizationCategoryRow[],
  areaRows: OrganizationServiceAreaRow[],
): OrganizationSummary {
  const organizationType = organizationTypeSchema.safeParse(row.organization_type);
  if (
    !organizationType.success ||
    !publicationStates.has(row.publication_state) ||
    !verificationStates.has(row.verification_state) ||
    !moderationStates.has(row.moderation_state)
  ) {
    throw new Error("Invalid organization row contract.");
  }

  return {
    id: row.id,
    slug: row.slug,
    displayName: row.display_name,
    organizationType: organizationType.data,
    description: row.description,
    state: row.state,
    ...(row.district ? { district: row.district } : {}),
    ...(row.website_url ? { websiteUrl: row.website_url } : {}),
    sectorSlugs: categoryRows
      .filter((item) => item.organization_id === row.id)
      .sort((left, right) => Number(right.is_primary) - Number(left.is_primary))
      .map((item) => item.category_slug),
    serviceAreas: areaRows
      .filter((item) => item.organization_id === row.id)
      .map(mapServiceArea),
    publicationState: row.publication_state,
    verificationState: row.verification_state,
    moderationState: row.moderation_state,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.published_at ? { publishedAt: row.published_at } : {}),
  };
}

async function hydrateOrganizations(rows: OrganizationRow[]) {
  if (!rows.length) return [];
  const organizationIds = rows.map((row) => row.id);
  const supabase = await createClient();
  const [categoryResult, serviceAreaResult] = await Promise.all([
    supabase
      .from(ORGANIZATION_TABLES.categories)
      .select("organization_id, category_slug, is_primary")
      .in("organization_id", organizationIds),
    supabase
      .from(ORGANIZATION_TABLES.serviceAreas)
      .select("organization_id, state, district, service_radius_km")
      .in("organization_id", organizationIds),
  ]);

  if (categoryResult.error || serviceAreaResult.error) {
    throwDataUnavailable("organizations.public-hydration");
  }

  try {
    return rows.map((row) =>
      mapOrganization(
        row,
        (categoryResult.data ?? []) as OrganizationCategoryRow[],
        (serviceAreaResult.data ?? []) as OrganizationServiceAreaRow[],
      ),
    );
  } catch {
    throwDataUnavailable("organizations.row-contract");
  }
}

export async function loadPublicOrganizations({
  limit = 24,
}: { limit?: number } = {}): Promise<OrganizationSummary[]> {
  if (!organizationsEnabled() || !isSupabaseConfigured()) return [];

  const boundedLimit = Math.max(1, Math.min(Math.trunc(limit), 50));
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(ORGANIZATION_TABLES.organizations)
    .select(organizationColumns)
    .eq("publication_state", "published")
    .eq("moderation_state", "active")
    .order("published_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(boundedLimit);

  if (error) throwDataUnavailable("organizations.public-list");
  return hydrateOrganizations((data ?? []) as OrganizationRow[]);
}

export async function loadPublicOrganizationsByIds(
  organizationIds: readonly string[],
): Promise<OrganizationSummary[]> {
  if (
    !organizationsEnabled() ||
    !isSupabaseConfigured() ||
    !organizationIds.length
  ) {
    return [];
  }

  const ids = [...new Set(organizationIds)].slice(0, 50);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(ORGANIZATION_TABLES.organizations)
    .select(organizationColumns)
    .in("id", ids)
    .eq("publication_state", "published")
    .eq("moderation_state", "active");

  if (error) throwDataUnavailable("organizations.public-by-id");
  return hydrateOrganizations((data ?? []) as OrganizationRow[]);
}

export async function loadPublicOrganizationBySlug(
  slug: string,
): Promise<OrganizationSummary | null> {
  if (!organizationsEnabled() || !isSupabaseConfigured()) return null;
  const parsedSlug = organizationSlugSchema.safeParse(slug);
  if (!parsedSlug.success) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from(ORGANIZATION_TABLES.organizations)
    .select(organizationColumns)
    .eq("slug", parsedSlug.data)
    .eq("publication_state", "published")
    .eq("moderation_state", "active")
    .maybeSingle();

  if (error) throwDataUnavailable("organizations.public-detail");
  if (!data) return null;
  const [organization] = await hydrateOrganizations([data as OrganizationRow]);
  return organization ?? null;
}

export async function loadOrganizationsForMember(
  profileId: string,
): Promise<OrganizationForMember[]> {
  if (!organizationsEnabled() || !isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data: membershipData, error: membershipError } = await supabase
    .from(ORGANIZATION_TABLES.memberships)
    .select("organization_id, profile_id, role, status")
    .eq("profile_id", profileId)
    .eq("status", "active")
    .limit(50);

  if (membershipError) throwDataUnavailable("organizations.member-list");
  const memberships = (membershipData ?? []) as MembershipRow[];
  if (!memberships.length) return [];

  const supabaseForOrganizations = await createClient();
  const { data, error } = await supabaseForOrganizations
    .from(ORGANIZATION_TABLES.organizations)
    .select(organizationColumns)
    .in(
      "id",
      memberships.map((membership) => membership.organization_id),
    )
    .order("created_at", { ascending: true });

  if (error) throwDataUnavailable("organizations.member-organization-list");
  const organizations = await hydrateOrganizations(
    (data ?? []) as OrganizationRow[],
  );
  const roleByOrganization = new Map(
    memberships.map((membership) => [membership.organization_id, membership.role]),
  );

  return organizations.flatMap((organization) => {
    const membershipRole = roleByOrganization.get(organization.id);
    return membershipRole ? [{ ...organization, membershipRole }] : [];
  });
}

export async function loadActiveOrganizationMembership(
  organizationId: string,
  profileId: string,
): Promise<OrganizationMembership | null> {
  if (!organizationsEnabled() || !isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from(ORGANIZATION_TABLES.memberships)
    .select("organization_id, profile_id, role, status")
    .eq("organization_id", organizationId)
    .eq("profile_id", profileId)
    .eq("status", "active")
    .maybeSingle();

  if (error) throwDataUnavailable("organizations.membership");
  if (!data) return null;
  const membership = data as MembershipRow;
  return {
    organizationId: membership.organization_id,
    profileId: membership.profile_id,
    role: membership.role,
    status: membership.status,
  };
}
