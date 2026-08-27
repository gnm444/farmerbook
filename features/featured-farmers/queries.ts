import { z } from "zod";
import { requireAdmin } from "@/features/auth/require-admin";
import { isDemoMode, isSupabaseConfigured } from "@/lib/env";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { SUPPORTED_LOCALES } from "@/lib/i18n/locales";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  featuredFarmerClaimSchema,
  featuredFarmerClaimTypes,
  featuredFarmerDiscoveryMethods,
  featuredFarmerMediaRightsBases,
  featuredFarmerSocialPlatforms,
  featuredFarmerSourceAssociations,
  featuredFarmerSourceQualities,
  featuredFarmerSourceTypes,
  featuredFarmerStorySectionSchema,
} from "./schemas";
import { narayanaReddyPublication } from "./narayana-reddy";
import { mVenkataSubbaraoPublication } from "./m-venkata-subbarao";
import { sandeepDasariPublication } from "./sandeep-dasari";
import { buildFeaturedFarmerResearchQueries } from "./web-research";

const researchPurposes = [
  "identity",
  "significance",
  "institutions",
  "social",
  "current",
] as const;

export const featuredFarmerResearchRowSchema = z.object({
  id: z.uuid(),
  created_by: z.uuid(),
  subject_name: z.string(),
  district_hint: z.string().nullable(),
  state_hint: z.string().nullable(),
  farming_hint: z.string().nullable(),
  significance_hypothesis: z.string(),
  preferred_locale: z.enum(SUPPORTED_LOCALES),
  query_fingerprints: z.object({
    identity: z.string().regex(/^[0-9a-f]{64}$/),
    significance: z.string().regex(/^[0-9a-f]{64}$/),
    institutions: z.string().regex(/^[0-9a-f]{64}$/),
    social: z.string().regex(/^[0-9a-f]{64}$/),
    current: z.string().regex(/^[0-9a-f]{64}$/),
  }),
  state: z.enum([
    "researching",
    "drafting",
    "review_ready",
    "published",
    "withdrawn",
    "expired",
  ]),
  retention_expires_at: z.string(),
  revision: z.number().int().nonnegative(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const featuredFarmerSourceRowSchema = z.object({
  id: z.uuid(),
  research_id: z.uuid(),
  source_url: z.url(),
  publisher_host: z.string(),
  publisher_name: z.string(),
  source_title: z.string(),
  source_published_at: z.string().nullable(),
  source_type: z.enum(featuredFarmerSourceTypes),
  source_excerpt: z.string(),
  source_hash: z.string().regex(/^[0-9a-f]{64}$/),
  discovery_method: z.enum(featuredFarmerDiscoveryMethods),
  source_quality: z.enum(featuredFarmerSourceQualities),
  subject_association: z.enum(featuredFarmerSourceAssociations),
  decision: z.enum(["pending", "selected", "rejected"]),
  provider_item_id: z.string().nullable(),
  provider_query_hash: z.string().nullable(),
  usage_rights_basis: z.enum([
    "operator_selected_destination",
    "youtube_api_terms",
    "operator_supplied",
  ]),
  collected_at: z.string(),
  refresh_due_at: z.string().nullable(),
  retention_expires_at: z.string(),
  revision: z.number().int().nonnegative(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const featuredFarmerDraftRowSchema = z.object({
  id: z.uuid(),
  research_id: z.uuid(),
  slug: z.string(),
  headline: z.string(),
  deck: z.string(),
  why_featured: z.string(),
  story_sections: z.array(featuredFarmerStorySectionSchema),
  category_slugs: z.array(z.string()),
  limitations: z.array(z.string()),
  state: z.enum(["drafting", "review_ready", "published", "withdrawn"]),
  revision: z.number().int().nonnegative(),
  created_at: z.string(),
  updated_at: z.string(),
});

const claimRowSchema = z.object({
  id: z.uuid(),
  draft_id: z.uuid(),
  claim_key: z.string(),
  claim_type: z.enum(featuredFarmerClaimTypes),
  statement: z.string(),
  display_label: z.string().nullable(),
  display_value: z.string().nullable(),
  display_context: z.string().nullable(),
  display_order: z.number().int().nonnegative(),
  review_state: z.enum(["draft", "approved", "rejected"]),
});

const claimSourceRowSchema = z.object({
  claim_id: z.uuid(),
  source_id: z.uuid(),
});

export const featuredFarmerSocialRowSchema = z.object({
  id: z.uuid(),
  draft_id: z.uuid(),
  source_id: z.uuid(),
  platform: z.enum(featuredFarmerSocialPlatforms),
  profile_url: z.url(),
  ownership_basis: z.string(),
  display_order: z.number().int(),
  confirmed_at: z.string(),
});

export const featuredFarmerMediaRowSchema = z.object({
  id: z.uuid(),
  draft_id: z.uuid(),
  asset_url: z.string(),
  alt_text: z.string(),
  credit: z.string(),
  rights_basis: z.enum(featuredFarmerMediaRightsBases),
  rights_reference: z.string(),
  approved_at: z.string(),
});

export type FeaturedFarmerResearchRow = z.infer<
  typeof featuredFarmerResearchRowSchema
>;
export type FeaturedFarmerSourceRow = z.infer<
  typeof featuredFarmerSourceRowSchema
>;
export type FeaturedFarmerDraftRow = z.infer<typeof featuredFarmerDraftRowSchema>;
export type FeaturedFarmerSocialRow = z.infer<
  typeof featuredFarmerSocialRowSchema
>;
export type FeaturedFarmerMediaRow = z.infer<
  typeof featuredFarmerMediaRowSchema
>;

export type FeaturedFarmerWorkspace = FeaturedFarmerResearchRow & {
  researchQueries: ReturnType<typeof buildFeaturedFarmerResearchQueries>;
  professionalSourcesRequired: boolean;
  sources: FeaturedFarmerSourceRow[];
  draft: FeaturedFarmerDraftRow | null;
  claims: Array<z.infer<typeof featuredFarmerClaimSchema> & { id: string }>;
  socialLinks: FeaturedFarmerSocialRow[];
  media: FeaturedFarmerMediaRow | null;
};

const snapshotSourceSchema = z.object({
  id: z.uuid().optional(),
  url: z.url(),
  publisher: z.string(),
  title: z.string(),
  publishedAt: z.string().nullable().optional(),
  sourceType: z.string().optional(),
  quality: z.string().optional(),
  association: z.string().optional(),
});

const sourceHostedImageSchema = z
  .object({
    assetUrl: z.url(),
    sourceUrl: z.url(),
    altText: z.string(),
    credit: z.string(),
    creditUrl: z.url(),
    provider: z.literal("youtube_oembed"),
    focalPoint: z.enum(["left", "center", "right"]).optional(),
  })
  .strict();

const sourceHostedThumbnailSchema = z
  .object({
    assetUrl: z.url(),
    altText: z.string(),
    provider: z.enum(["youtube_oembed", "farmerbook_permitted"]),
  })
  .strict();

export const featuredFarmerSnapshotSchema = z.object({
  fullName: z.string(),
  contactEmail: z.email().optional(),
  district: z.string().nullable(),
  state: z.string().nullable(),
  locale: z.string(),
  headline: z.string(),
  deck: z.string(),
  whyFeatured: z.string(),
  sections: z.array(featuredFarmerStorySectionSchema),
  categorySlugs: z.array(z.string()),
  limitations: z.array(z.string()),
  claims: z.array(
    z.object({
      id: z.uuid(),
      key: z.string(),
      type: z.enum(featuredFarmerClaimTypes),
      statement: z.string(),
      displayLabel: z.string().nullable(),
      displayValue: z.string().nullable(),
      displayContext: z.string().nullable(),
      sources: z.array(snapshotSourceSchema),
    }),
  ),
  sources: z.array(snapshotSourceSchema),
  socialLinks: z.array(
    z.object({ platform: z.enum(featuredFarmerSocialPlatforms), url: z.url() }),
  ),
  coverage: z.array(
    z.object({
      url: z.url(),
      publisher: z.string(),
      title: z.string(),
      sourceType: z.string(),
      thumbnail: sourceHostedThumbnailSchema.optional(),
    }),
  ),
  imageGallery: z
    .array(
      z
        .object({
          assetUrl: z.url(),
          altText: z.string(),
          caption: z.string(),
          sourceUrl: z.url(),
        })
        .strict(),
    )
    .max(12)
    .optional(),
  reportedProducts: z
    .array(
      z
        .object({
          name: z.string().trim().min(2).max(100),
          categorySlug: z.string().trim().min(2).max(100),
          status: z.literal("reported"),
          sourceUrls: z.array(z.url()).min(1).max(4),
        })
        .strict(),
    )
    .max(20)
    .optional(),
  milestones: z
    .array(
      z.object({
        year: z.string(),
        title: z.string(),
        description: z.string(),
        sourceUrls: z.array(z.url()),
      }),
    )
    .optional(),
  questions: z
    .array(
      z.object({
        question: z.string(),
        answer: z.string(),
        sourceUrls: z.array(z.url()),
      }),
    )
    .optional(),
  seo: z
    .object({
      title: z.string(),
      description: z.string(),
      keywords: z.array(z.string()),
    })
    .optional(),
  personMetadata: z
    .object({
      alternateNames: z.array(z.string()).max(8).optional(),
      birthDate: z.string().optional(),
      deathDate: z.string().optional(),
      jobTitles: z.array(z.string()).min(1).max(8),
      homeLocation: z.string(),
      knowsAbout: z.array(z.string()).min(1).max(20),
    })
    .strict()
    .optional(),
  sourceHostedPreview: sourceHostedImageSchema.optional(),
  sourceHostedBackground: sourceHostedImageSchema.optional(),
  media: z
    .object({
      assetUrl: z.string(),
      altText: z.string(),
      credit: z.string(),
      rightsBasis: z.enum(featuredFarmerMediaRightsBases),
    })
    .nullable(),
  editorialDisclosure: z.string(),
});

const publicationRowSchema = z.object({
  publication_id: z.uuid(),
  slug: z.string(),
  publication_revision: z.number().int().positive(),
  publication_status: z.enum(["preview", "published"]).optional(),
  snapshot: featuredFarmerSnapshotSchema,
  fact_checked_at: z.string(),
  published_at: z.string(),
});

export type FeaturedFarmerPublication = z.infer<typeof publicationRowSchema>;

const curatedPublications: FeaturedFarmerPublication[] = [
  mVenkataSubbaraoPublication,
  sandeepDasariPublication,
  narayanaReddyPublication,
];
const curatedPublicationBySlug = new Map(
  curatedPublications.map((publication) => [publication.slug, publication]),
);

function administrationAvailable(demo: boolean) {
  return (
    isFeatureEnabled("ENABLE_FEATURED_FARMER_PROFILES") &&
    !demo &&
    !isDemoMode() &&
    isSupabaseConfigured()
  );
}

export async function loadFeaturedFarmerNewsroom(): Promise<{
  available: boolean;
  researches: FeaturedFarmerResearchRow[];
}> {
  const administrator = await requireAdmin();
  if (!administrationAvailable(administrator.demo)) {
    return { available: false, researches: [] };
  }
  const result = await createAdminClient()
    .from("featured_farmer_research")
    .select("*")
    .eq("created_by", administrator.id)
    .gt("retention_expires_at", new Date().toISOString())
    .order("updated_at", { ascending: false })
    .limit(50);
  if (result.error) throw new Error("FEATURED_FARMER_NEWSROOM_UNAVAILABLE");
  return {
    available: true,
    researches: z.array(featuredFarmerResearchRowSchema).parse(result.data ?? []),
  };
}

async function loadWorkspaceParts(research: FeaturedFarmerResearchRow) {
  const supabase = createAdminClient();
  const [sourcesResult, draftResult] = await Promise.all([
    supabase
      .from("featured_farmer_sources")
      .select("*")
      .eq("research_id", research.id)
      .gt("retention_expires_at", new Date().toISOString())
      .order("created_at", { ascending: true }),
    supabase
      .from("featured_farmer_drafts")
      .select("*")
      .eq("research_id", research.id)
      .maybeSingle(),
  ]);
  if (sourcesResult.error || draftResult.error) {
    throw new Error("FEATURED_FARMER_WORKSPACE_UNAVAILABLE");
  }
  const sources = z.array(featuredFarmerSourceRowSchema).parse(
    sourcesResult.data ?? [],
  );
  const draft = draftResult.data
    ? featuredFarmerDraftRowSchema.parse(draftResult.data)
    : null;
  if (!draft) {
    return { sources, draft, claims: [], socialLinks: [], media: null };
  }
  const [claimsResult, socialResult, mediaResult] = await Promise.all([
    supabase
      .from("featured_farmer_claims")
      .select("*")
      .eq("draft_id", draft.id)
      .order("display_order", { ascending: true }),
    supabase
      .from("featured_farmer_social_links")
      .select("*")
      .eq("draft_id", draft.id)
      .order("display_order", { ascending: true }),
    supabase
      .from("featured_farmer_media")
      .select("*")
      .eq("draft_id", draft.id)
      .maybeSingle(),
  ]);
  if (claimsResult.error || socialResult.error || mediaResult.error) {
    throw new Error("FEATURED_FARMER_WORKSPACE_UNAVAILABLE");
  }
  const claimRows = z.array(claimRowSchema).parse(claimsResult.data ?? []);
  const claimIds = claimRows.map((claim) => claim.id);
  const linksResult = claimIds.length
    ? await supabase
        .from("featured_farmer_claim_sources")
        .select("claim_id, source_id")
        .in("claim_id", claimIds)
    : { data: [], error: null };
  if (linksResult.error) {
    throw new Error("FEATURED_FARMER_WORKSPACE_UNAVAILABLE");
  }
  const links = z.array(claimSourceRowSchema).parse(linksResult.data ?? []);
  return {
    sources,
    draft,
    claims: claimRows.map((claim) => ({
      id: claim.id,
      claimKey: claim.claim_key,
      claimType: claim.claim_type,
      statement: claim.statement,
      ...(claim.display_label ? { displayLabel: claim.display_label } : {}),
      ...(claim.display_value ? { displayValue: claim.display_value } : {}),
      ...(claim.display_context ? { displayContext: claim.display_context } : {}),
      sourceIds: links
        .filter((link) => link.claim_id === claim.id)
        .map((link) => link.source_id),
    })),
    socialLinks: z.array(featuredFarmerSocialRowSchema).parse(
      socialResult.data ?? [],
    ),
    media: mediaResult.data
      ? featuredFarmerMediaRowSchema.parse(mediaResult.data)
      : null,
  };
}

export async function loadFeaturedFarmerWorkspace(
  researchId: string,
): Promise<{ available: boolean; workspace: FeaturedFarmerWorkspace | null }> {
  const administrator = await requireAdmin();
  if (!administrationAvailable(administrator.demo)) {
    return { available: false, workspace: null };
  }
  const supabase = createAdminClient();
  const [result, professionalSourcesControl] = await Promise.all([
    supabase
      .from("featured_farmer_research")
      .select("*")
      .eq("id", researchId)
      .eq("created_by", administrator.id)
      .gt("retention_expires_at", new Date().toISOString())
      .maybeSingle(),
    supabase
      .from("ecosystem_release_controls")
      .select("enabled")
      .eq("control_key", "featured_farmer_professional_sources_required")
      .maybeSingle(),
  ]);
  if (result.error || professionalSourcesControl.error) {
    throw new Error("FEATURED_FARMER_WORKSPACE_UNAVAILABLE");
  }
  if (!result.data) return { available: true, workspace: null };
  const research = featuredFarmerResearchRowSchema.parse(result.data);
  const parts = await loadWorkspaceParts(research);
  return {
    available: true,
    workspace: {
      ...research,
      professionalSourcesRequired:
        professionalSourcesControl.data?.enabled === true,
      researchQueries: buildFeaturedFarmerResearchQueries({
        fullName: research.subject_name,
        ...(research.district_hint ? { districtHint: research.district_hint } : {}),
        ...(research.state_hint
          ? { stateHint: research.state_hint as never }
          : {}),
        ...(research.farming_hint ? { farmingHint: research.farming_hint } : {}),
      }),
      ...parts,
    },
  };
}

async function publicClient() {
  if (
    !isFeatureEnabled("ENABLE_FEATURED_FARMER_PROFILES") ||
    isDemoMode() ||
    !isSupabaseConfigured()
  ) {
    return null;
  }
  return createClient();
}

export async function loadFeaturedFarmerPublications(limit = 24) {
  const supabase = await publicClient();
  if (!supabase) return curatedPublications.slice(0, limit);
  const result = await supabase.rpc("list_featured_farmer_publications", {
    limit_input: limit,
    offset_input: 0,
  });
  if (result.error) throw new Error("FEATURED_FARMER_PUBLICATIONS_UNAVAILABLE");
  const publications = z.array(publicationRowSchema).parse(result.data ?? []);
  const curatedSlugs = new Set(curatedPublicationBySlug.keys());
  return [
    ...curatedPublications,
    ...publications.filter(
      (publication) => !curatedSlugs.has(publication.slug),
    ),
  ].slice(0, limit);
}

export async function loadFeaturedFarmerPublication(slug: string) {
  const curated = curatedPublicationBySlug.get(slug);
  if (curated) return curated;
  const supabase = await publicClient();
  if (!supabase) return null;
  const result = await supabase.rpc("get_featured_farmer_publication", {
    slug_input: slug,
  });
  if (result.error) throw new Error("FEATURED_FARMER_PUBLICATION_UNAVAILABLE");
  const row = Array.isArray(result.data) ? result.data[0] : result.data;
  return row ? publicationRowSchema.parse(row) : null;
}

export async function loadFeaturedFarmerPublicationSlugs() {
  const publications = await loadFeaturedFarmerPublications(100);
  return publications.map((publication) => publication.slug);
}

export { researchPurposes };
