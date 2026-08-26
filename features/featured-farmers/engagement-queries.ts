import { z } from "zod";
import { requireAdmin } from "@/features/auth/require-admin";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { createClient } from "@/lib/supabase/server";
import { featuredFarmerEngagementConfiguration } from "./engagement-configuration";
import { isFeaturedFarmerEngagementSlug } from "./engagement-registry";

const recommendationStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
  "withdrawn",
  "hidden",
]);

const publicRecommendationSchema = z.object({
  id: z.uuid(),
  reviewerName: z.string().min(1),
  reviewerHandle: z.string().min(1),
  relationshipContext: z.string().min(1),
  body: z.string().min(1),
  recommendedAt: z.string().nullable(),
});

const publicEngagementRowSchema = z.object({
  subject_slug: z.string(),
  display_name: z.string(),
  public_email: z.email(),
  profile_view_count: z.coerce.number().int().nonnegative(),
  views_enabled: z.boolean(),
  questions_enabled: z.boolean(),
  recommendations_enabled: z.boolean(),
  recommendations: z.array(publicRecommendationSchema),
});

const myRecommendationRowSchema = z.object({
  recommendation_id: z.uuid(),
  relationship_context: z.string(),
  body: z.string(),
  status: recommendationStatusSchema,
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
});

const queueRowSchema = z.object({
  recommendation_id: z.uuid(),
  subject_slug: z.string(),
  subject_name: z.string(),
  reviewer_name: z.string(),
  reviewer_handle: z.string(),
  relationship_context: z.string(),
  body: z.string(),
  recommendation_status: recommendationStatusSchema,
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
});

export type FeaturedFarmerPublicRecommendation = z.infer<
  typeof publicRecommendationSchema
>;
export type FeaturedFarmerRecommendationStatus = z.infer<
  typeof recommendationStatusSchema
>;
export type FeaturedFarmerRecommendationQueueRow = z.infer<
  typeof queueRowSchema
>;

export type FeaturedFarmerEngagement = {
  slug: string;
  displayName: string;
  publicEmail: string;
  profileViewCount: number;
  viewsEnabled: boolean;
  questionsEnabled: boolean;
  recommendationsEnabled: boolean;
  questionDeliveryReady: boolean;
  turnstileSiteKey: string;
  recommendations: FeaturedFarmerPublicRecommendation[];
  viewer: {
    signedIn: boolean;
    eligibleCustomer: boolean;
    fullName: string | null;
  };
  myRecommendation: {
    id: string;
    relationshipContext: string;
    body: string;
    status: FeaturedFarmerRecommendationStatus;
  } | null;
};

export async function loadFeaturedFarmerEngagement(
  slug: string,
): Promise<FeaturedFarmerEngagement | null> {
  const configuration = featuredFarmerEngagementConfiguration();
  if (!configuration.publicReady || !isFeaturedFarmerEngagementSlug(slug)) {
    return null;
  }

  const supabase = await createClient();
  const publicResult = await supabase.rpc(
    "get_featured_farmer_public_engagement",
    { slug_input: slug },
  );
  if (publicResult.error) {
    throw new Error("FEATURED_FARMER_ENGAGEMENT_UNAVAILABLE");
  }
  const publicRow = publicEngagementRowSchema.safeParse(
    Array.isArray(publicResult.data) ? publicResult.data[0] : publicResult.data,
  );
  if (!publicRow.success) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  let viewer = {
    signedIn: false,
    eligibleCustomer: false,
    fullName: null as string | null,
  };
  let myRecommendation: FeaturedFarmerEngagement["myRecommendation"] = null;

  if (user) {
    const [profileResult, recommendationResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, status, onboarding_complete, account_role")
        .eq("id", user.id)
        .maybeSingle(),
      supabase.rpc("get_my_featured_farmer_recommendation", {
        slug_input: slug,
      }),
    ]);
    if (profileResult.error || recommendationResult.error) {
      throw new Error("FEATURED_FARMER_ENGAGEMENT_UNAVAILABLE");
    }
    const profile = profileResult.data;
    viewer = {
      signedIn: true,
      eligibleCustomer: Boolean(
        profile &&
          profile.status === "active" &&
          profile.onboarding_complete === true &&
          profile.account_role === "customer",
      ),
      fullName: profile ? String(profile.full_name) : null,
    };
    const ownRow = myRecommendationRowSchema.safeParse(
      Array.isArray(recommendationResult.data)
        ? recommendationResult.data[0]
        : recommendationResult.data,
    );
    if (ownRow.success) {
      myRecommendation = {
        id: ownRow.data.recommendation_id,
        relationshipContext: ownRow.data.relationship_context,
        body: ownRow.data.body,
        status: ownRow.data.status,
      };
    }
  }

  return {
    slug: publicRow.data.subject_slug,
    displayName: publicRow.data.display_name,
    publicEmail: publicRow.data.public_email,
    profileViewCount: publicRow.data.profile_view_count,
    viewsEnabled: publicRow.data.views_enabled,
    questionsEnabled: publicRow.data.questions_enabled,
    recommendationsEnabled: publicRow.data.recommendations_enabled,
    questionDeliveryReady: configuration.questionDeliveryReady,
    turnstileSiteKey: configuration.turnstileSiteKey,
    recommendations: publicRow.data.recommendations,
    viewer,
    myRecommendation,
  };
}

export async function loadFeaturedFarmerRecommendationQueue(): Promise<
  FeaturedFarmerRecommendationQueueRow[]
> {
  await requireAdmin();
  if (!isFeatureEnabled("ENABLE_FEATURED_FARMER_ENGAGEMENT")) return [];
  const supabase = await createClient();
  const result = await supabase.rpc(
    "list_featured_farmer_recommendation_queue",
    { limit_input: 100 },
  );
  if (result.error) {
    throw new Error("FEATURED_FARMER_RECOMMENDATION_QUEUE_UNAVAILABLE");
  }
  return z.array(queueRowSchema).parse(result.data ?? []);
}
