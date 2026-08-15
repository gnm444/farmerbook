import { createAdminClient } from "@/lib/supabase/admin";
import { requireSourcedFarmerResearchOwner } from "./access";
import type {
  SourcedFarmerDashboard,
  SourcedFarmerDetail,
  SourcedFarmerProfile,
} from "./types";

const emptyDashboard: SourcedFarmerDashboard = {
  configured: false,
  summary: {
    profiles: 0,
    pendingReview: 0,
    approved: 0,
    staleSources: 0,
    completedRuns: 0,
  },
  channels: [],
  runs: [],
  profiles: [],
  pagination: { page: 1, pageSize: 20, total: 0 },
};

const sourcedFarmerProfilePageSize = 20;

export type SourcedFarmerDashboardFilters = {
  q?: string;
  review?: SourcedFarmerProfile["reviewState"];
  page?: number;
};

function normalizedSearchTerm(value: string | undefined) {
  return (value ?? "")
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, 120);
}

type ProfileRow = {
  id: string;
  display_name: string;
  district: string | null;
  state_name: string | null;
  summary: string;
  topic_slugs: string[] | null;
  evidence_basis: SourcedFarmerProfile["evidenceBasis"];
  evidence_url: string | null;
  state: SourcedFarmerProfile["reviewState"];
  reviewed_at: string | null;
  retention_expires_at: string | null;
  revision: number;
  created_at: string;
};

function profileFromRow(row: ProfileRow): SourcedFarmerProfile {
  return {
    id: String(row.id),
    displayName: String(row.display_name),
    district: row.district ? String(row.district) : null,
    state: row.state_name ? String(row.state_name) : null,
    summary: String(row.summary),
    topicSlugs: Array.isArray(row.topic_slugs)
      ? row.topic_slugs.map(String)
      : [],
    evidenceBasis: row.evidence_basis,
    evidenceUrl: row.evidence_url ? String(row.evidence_url) : null,
    reviewState: row.state,
    lastReviewedAt: row.reviewed_at ? String(row.reviewed_at) : null,
    expiresAt: row.retention_expires_at
      ? String(row.retention_expires_at)
      : null,
    revision: Number(row.revision),
    createdAt: String(row.created_at),
  };
}

async function databaseControlEnabled() {
  const result = await createAdminClient()
    .from("ecosystem_release_controls")
    .select("enabled")
    .eq("control_key", "sourced_farmer_research")
    .maybeSingle();
  if (result.error) throw new Error("Sourced Farmer research is unavailable.");
  return result.data?.enabled === true;
}

export async function loadSourcedFarmerDashboard(
  filters: SourcedFarmerDashboardFilters = {},
): Promise<SourcedFarmerDashboard> {
  const access = await requireSourcedFarmerResearchOwner();
  if (!access.ok || !(await databaseControlEnabled())) return emptyDashboard;
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const page = Number.isInteger(filters.page) && Number(filters.page) > 0
    ? Math.min(Number(filters.page), 10_000)
    : 1;
  const searchTerm = normalizedSearchTerm(filters.q);
  const pageStart = (page - 1) * sourcedFarmerProfilePageSize;
  const profileFields = "id, display_name, district, state_name, summary, topic_slugs, evidence_basis, evidence_url, state, reviewed_at, retention_expires_at, revision, created_at";
  let profileQuery = supabase.from("sourced_farmer_profiles")
    .select(profileFields, { count: "exact" })
    .eq("owner_id", access.administrator.id)
    .order("created_at", { ascending: false })
    .range(pageStart, pageStart + sourcedFarmerProfilePageSize - 1);
  if (filters.review) profileQuery = profileQuery.eq("state", filters.review);
  if (searchTerm) {
    const pattern = `*${searchTerm}*`;
    profileQuery = profileQuery.or([
      `display_name.ilike.${pattern}`,
      `district.ilike.${pattern}`,
      `state_name.ilike.${pattern}`,
      `summary.ilike.${pattern}`,
    ].join(","));
  }
  const [
    channels,
    runs,
    profiles,
    allProfiles,
    pendingProfiles,
    approvedProfiles,
    staleSources,
    completedRuns,
  ] = await Promise.all([
    supabase.from("farmer_source_channels")
      .select("id, provider_channel_id, channel_url, topic_slugs, collected_at, refresh_due_at, retention_expires_at")
      .eq("owner_id", access.administrator.id)
      .gt("retention_expires_at", now)
      .order("collected_at", { ascending: false })
      .limit(50),
    supabase.from("farmer_source_discovery_runs")
      .select("id, state, pages_processed, videos_seen, videos_saved, failure_code, requested_at, completed_at")
      .eq("owner_id", access.administrator.id)
      .order("requested_at", { ascending: false })
      .limit(20),
    profileQuery,
    supabase.from("sourced_farmer_profiles").select("id", { count: "exact", head: true })
      .eq("owner_id", access.administrator.id),
    supabase.from("sourced_farmer_profiles").select("id", { count: "exact", head: true })
      .eq("owner_id", access.administrator.id).eq("state", "pending"),
    supabase.from("sourced_farmer_profiles").select("id", { count: "exact", head: true })
      .eq("owner_id", access.administrator.id).eq("state", "approved"),
    supabase.from("farmer_source_videos").select("id", { count: "exact", head: true })
      .eq("owner_id", access.administrator.id).lte("refresh_due_at", now),
    supabase.from("farmer_source_discovery_runs").select("id", { count: "exact", head: true })
      .eq("owner_id", access.administrator.id).eq("state", "succeeded"),
  ]);
  const results = [channels, runs, profiles, allProfiles, pendingProfiles,
    approvedProfiles, staleSources, completedRuns];
  if (results.some((result) => result.error)) {
    throw new Error("Sourced Farmer research is unavailable.");
  }
  const profileRows = (profiles.data ?? []) as ProfileRow[];
  return {
    configured: true,
    summary: {
      profiles: allProfiles.count ?? 0,
      pendingReview: pendingProfiles.count ?? 0,
      approved: approvedProfiles.count ?? 0,
      staleSources: staleSources.count ?? 0,
      completedRuns: completedRuns.count ?? 0,
    },
    channels: (channels.data ?? []).map((row) => ({
      id: String(row.id),
      channelId: String(row.provider_channel_id),
      canonicalUrl: String(row.channel_url),
      topicSlugs: Array.isArray(row.topic_slugs)
        ? row.topic_slugs.map(String)
        : [],
      lastRefreshedAt: String(row.collected_at),
      refreshDueAt: String(row.refresh_due_at),
      state: Date.parse(String(row.retention_expires_at)) <= Date.now()
        ? "expired"
        : Date.parse(String(row.refresh_due_at)) <= Date.now()
          ? "refresh_due"
          : "current",
    })),
    runs: (runs.data ?? []).map((row) => ({
      id: String(row.id),
      state: String(row.state),
      pagesProcessed: Number(row.pages_processed),
      videosProcessed: Number(row.videos_saved ?? row.videos_seen),
      failureCode: row.failure_code ? String(row.failure_code) : null,
      requestedAt: String(row.requested_at),
      completedAt: row.completed_at ? String(row.completed_at) : null,
    })),
    profiles: profileRows.map(profileFromRow),
    pagination: {
      page,
      pageSize: sourcedFarmerProfilePageSize,
      total: profiles.count ?? 0,
    },
  };
}

export async function loadSourcedFarmerDetail(
  profileId: string,
): Promise<SourcedFarmerDetail | null> {
  const access = await requireSourcedFarmerResearchOwner();
  if (!access.ok || !(await databaseControlEnabled())) return null;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(profileId)) {
    return null;
  }
  const supabase = createAdminClient();
  const [profile, facts, events] = await Promise.all([
    supabase.from("sourced_farmer_profiles")
      .select("id, display_name, district, state_name, summary, topic_slugs, evidence_basis, evidence_url, state, reviewed_at, retention_expires_at, revision, created_at")
      .eq("owner_id", access.administrator.id)
      .eq("id", profileId)
      .maybeSingle(),
    supabase.from("sourced_farmer_facts")
      .select("id, fact_type, fact_value, source_url, evidence_excerpt, decision, created_at")
      .eq("owner_id", access.administrator.id)
      .eq("profile_id", profileId)
      .order("created_at", { ascending: true }),
    supabase.from("farmer_source_events")
      .select("id, event_type, created_at")
      .eq("owner_id", access.administrator.id)
      .eq("target_id", profileId)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  if (profile.error || facts.error || events.error) {
    throw new Error("Sourced Farmer evidence is unavailable.");
  }
  if (!profile.data) return null;
  return {
    profile: profileFromRow(profile.data as ProfileRow),
    facts: (facts.data ?? []).map((row) => ({
      id: String(row.id),
      factType: String(row.fact_type),
      value: String(row.fact_value),
      sourceUrl: row.source_url ? String(row.source_url) : null,
      evidenceExcerpt: String(row.evidence_excerpt),
      reviewState: String(row.decision),
      createdAt: String(row.created_at),
    })),
    events: (events.data ?? []).map((row) => ({
      id: String(row.id),
      eventType: String(row.event_type),
      createdAt: String(row.created_at),
    })),
  };
}
