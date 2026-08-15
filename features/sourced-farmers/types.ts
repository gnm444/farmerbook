export const YOUTUBE_PROVIDER = "youtube_data_api" as const;

export const AGRICULTURE_TOPIC_SLUGS = [
  "general-agriculture",
  "paddy",
  "tomato",
  "papaya",
  "maize",
  "cotton",
  "oil-palm",
  "arecanut",
  "vegetables",
  "brinjal",
  "mango",
  "guava",
  "sandalwood",
  "fodder",
  "seed-production",
  "sheep",
  "goats",
  "poultry",
  "dairy",
  "aquaculture",
  "beekeeping",
  "sericulture",
  "intercropping",
  "organic-farming",
  "natural-farming",
  "drip-irrigation",
  "drone-spraying",
  "nursery",
  "integrated-pest-management",
  "protected-cultivation",
  "farm-mechanization",
] as const;

export type AgricultureTopicSlug =
  (typeof AGRICULTURE_TOPIC_SLUGS)[number];

export const AGRICULTURE_ACTOR_TYPES = [
  "farmer",
  "organization",
  "official",
  "scientist",
  "trader",
] as const;

export type AgricultureActorType =
  (typeof AGRICULTURE_ACTOR_TYPES)[number];

export type AgricultureActorCounts = Record<AgricultureActorType, number>;

export type AgricultureContentAnalysis = {
  agricultureRelated: boolean;
  topicSlugs: AgricultureTopicSlug[];
  actorCounts: AgricultureActorCounts;
};

export type NormalizedYouTubeChannelSeed =
  | { kind: "handle"; value: string }
  | { kind: "channel_id"; value: string };

export type SourcedFarmerSeedRunInput = {
  channelSeed: string;
  pageToken?: string;
  knownVideoIds?: string[];
  idempotencyKey: string;
};

export type ResolvedYouTubeChannel = {
  channelId: string;
  uploadsPlaylistId: string;
  canonicalUrl: string;
};

export type YouTubeUploadItem = {
  videoId: string;
};

export type YouTubeUploadPage = {
  items: YouTubeUploadItem[];
  nextPageToken: string | null;
};

export type YouTubeVideoMetadata = {
  videoId: string;
  channelId: string;
  title: string;
  description: string;
  publishedAt: string;
  privacyStatus: "public" | "private" | "unlisted";
};

export interface YouTubeClient {
  resolveChannel(
    seed: NormalizedYouTubeChannelSeed,
  ): Promise<ResolvedYouTubeChannel>;
  listUploadPage(input: {
    uploadsPlaylistId: string;
    pageToken?: string;
  }): Promise<YouTubeUploadPage>;
  listVideos(videoIds: readonly string[]): Promise<YouTubeVideoMetadata[]>;
}

export type TransientSourcedVideo = {
  videoId: string;
  videoUrl: string;
  title: string;
  redactedDescription: string;
  publishedAt: string;
  topicSlugs: string[];
  actorTypes: string[];
  transient: true;
};

export type TransientSourcedFarmerVideo = TransientSourcedVideo & {
  provider: typeof YOUTUBE_PROVIDER;
  sourceAttribution: "YouTube";
  channelId: string;
  canonicalChannelUrl: string;
  canonicalVideoUrl: string;
  description: string;
  actorCounts: AgricultureActorCounts;
};

export type SourcedFarmerVideoPersistence = {
  channelId: string;
  videoId: string;
  canonicalChannelUrl: string;
  canonicalVideoUrl: string;
  publishedAt: string;
  topicSlugs: AgricultureTopicSlug[];
  actorCounts: AgricultureActorCounts;
  contentFingerprint: string;
  refreshedAt: string;
  expiresAt: string;
};

export type SourcedFarmerRunCounts = {
  pagesFetched: number;
  providerCalls: number;
  videosFetched: number;
  videosMatched: number;
  videosExcludedNonAgriculture: number;
  videosSkippedKnown: number;
};

export type SourcedFarmerRunPersistence = {
  provider: typeof YOUTUBE_PROVIDER;
  channelId: string;
  canonicalChannelUrl: string;
  seedFingerprint: string;
  videos: SourcedFarmerVideoPersistence[];
  nextPageToken: string | null;
  counts: SourcedFarmerRunCounts;
  refreshedAt: string;
  expiresAt: string;
};

export type SourcedFarmerYouTubeRunResult = {
  transientSources: TransientSourcedVideo[];
  persistence: SourcedFarmerRunPersistence;
};

export type SourcedFarmerQuotaReservationRequest = {
  provider: typeof YOUTUBE_PROVIDER;
  idempotencyKey: string;
  maximumProviderCalls: number;
  maximumPages: number;
  maximumVideos: number;
};

export type SourcedFarmerQuotaReservationResult =
  | { ok: true }
  | { ok: false; code?: string };

export const SOURCED_FARMER_EVIDENCE_BASES = [
  "documented_subject_consent",
  "independent_public_source",
] as const;

export type SourcedFarmerEvidenceBasis =
  (typeof SOURCED_FARMER_EVIDENCE_BASES)[number];

export const SOURCED_FARMER_FACT_TYPES = [
  "professional_name",
  "organization_name",
  "professional_role",
  "farm_location",
  "crop",
  "livestock",
  "practice",
  "professional_impact",
] as const;

export type SourcedFarmerFactType =
  (typeof SOURCED_FARMER_FACT_TYPES)[number];

export type SourcedFarmerProfile = {
  id: string;
  displayName: string;
  district: string | null;
  state: string | null;
  summary: string;
  topicSlugs: string[];
  evidenceBasis: SourcedFarmerEvidenceBasis;
  evidenceUrl: string | null;
  reviewState: "pending" | "approved" | "rejected" | "archived";
  lastReviewedAt: string | null;
  expiresAt: string | null;
  revision: number;
  createdAt: string;
};

export type SourcedFarmerDashboard = {
  configured: boolean;
  summary: {
    profiles: number;
    pendingReview: number;
    approved: number;
    staleSources: number;
    completedRuns: number;
  };
  channels: Array<{
    id: string;
    channelId: string;
    canonicalUrl: string;
    topicSlugs: string[];
    lastRefreshedAt: string;
    refreshDueAt: string;
    state: string;
  }>;
  runs: Array<{
    id: string;
    state: string;
    pagesProcessed: number;
    videosProcessed: number;
    failureCode: string | null;
    requestedAt: string;
    completedAt: string | null;
  }>;
  profiles: SourcedFarmerProfile[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
};

export type SourcedFarmerDetail = {
  profile: SourcedFarmerProfile;
  facts: Array<{
    id: string;
    factType: string;
    value: string;
    sourceUrl: string | null;
    evidenceExcerpt: string;
    reviewState: string;
    createdAt: string;
  }>;
  events: Array<{
    id: string;
    eventType: string;
    createdAt: string;
  }>;
};
