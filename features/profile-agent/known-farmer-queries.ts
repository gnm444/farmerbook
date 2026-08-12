import { z } from "zod";
import { requireAdmin } from "@/features/auth/require-admin";
import { isDemoMode, isSupabaseConfigured } from "@/lib/env";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { SUPPORTED_LOCALES } from "@/lib/i18n/locales";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildKnownFarmerGoogleResearch } from "./google-research-link";
import {
  knownFarmerRelationshipBases,
  knownFarmerSubjectAssociations,
} from "./known-farmer-schemas";

export const knownFarmerIntakeRowSchema = z.object({
  id: z.uuid(),
  created_by: z.uuid(),
  subject_name: z.string(),
  location_hint: z.string().nullable(),
  farming_hint: z.string().nullable(),
  preferred_locale: z.enum(SUPPORTED_LOCALES),
  relationship_basis: z.enum(knownFarmerRelationshipBases),
  social_discovery_completed_at: z.string().nullable(),
  state: z.enum([
    "researching",
    "research_incomplete",
    "ready_to_build",
    "built",
    "rejected",
    "expired",
  ]),
  prospect_id: z.uuid().nullable(),
  sample_id: z.uuid().nullable(),
  retention_expires_at: z.string(),
  revision: z.number().int().nonnegative(),
  created_at: z.string(),
  updated_at: z.string(),
  google_query_hash: z.string().regex(/^[0-9a-f]{64}$/),
});

export const knownFarmerCandidateRowSchema = z.object({
  id: z.uuid(),
  intake_id: z.uuid(),
  source_url: z.url(),
  source_type: z.enum([
    "website",
    "youtube",
    "instagram",
    "facebook",
    "linkedin",
    "other_social",
  ]),
  source_title: z.string().nullable(),
  source_excerpt: z.string(),
  source_hash: z.string().regex(/^[0-9a-f]{64}$/),
  discovery_method: z.enum([
    "manual_google_review",
    "youtube_data_api",
    "operator_supplied",
  ]),
  subject_association: z.enum(knownFarmerSubjectAssociations),
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

export type KnownFarmerIntakeRow = z.infer<typeof knownFarmerIntakeRowSchema>;
export type KnownFarmerCandidateRow = z.infer<
  typeof knownFarmerCandidateRowSchema
>;
export type KnownFarmerIntakeView = KnownFarmerIntakeRow & {
  googleResearchUrl: string;
  googleResearchQuery: string;
  candidates: KnownFarmerCandidateRow[];
};

const intakeColumns = [
  "id",
  "created_by",
  "subject_name",
  "location_hint",
  "farming_hint",
  "preferred_locale",
  "relationship_basis",
  "social_discovery_completed_at",
  "state",
  "prospect_id",
  "sample_id",
  "retention_expires_at",
  "revision",
  "created_at",
  "updated_at",
  "google_query_hash",
].join(", ");

const candidateColumns = [
  "id",
  "intake_id",
  "source_url",
  "source_type",
  "source_title",
  "source_excerpt",
  "source_hash",
  "discovery_method",
  "subject_association",
  "decision",
  "provider_item_id",
  "provider_query_hash",
  "usage_rights_basis",
  "collected_at",
  "refresh_due_at",
  "retention_expires_at",
  "revision",
  "created_at",
  "updated_at",
].join(", ");

export async function loadKnownFarmerIntakes(): Promise<{
  available: boolean;
  intakes: KnownFarmerIntakeView[];
}> {
  const administrator = await requireAdmin();
  const available =
    isFeatureEnabled("ENABLE_OUTREACH_AGENT") &&
    isFeatureEnabled("ENABLE_PROFILE_RESEARCH_AGENT") &&
    !administrator.demo &&
    !isDemoMode() &&
    isSupabaseConfigured();
  if (!available) return { available: false as const, intakes: [] };

  const supabase = createAdminClient();
  const intakesResult = await supabase
    .from("known_farmer_intakes")
    .select(intakeColumns)
    .eq("created_by", administrator.id)
    .gt("retention_expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(50);
  if (intakesResult.error) throw new Error("KNOWN_FARMER_INTAKES_UNAVAILABLE");
  const intakes = z.array(knownFarmerIntakeRowSchema).parse(
    intakesResult.data ?? [],
  );
  const ids = intakes.map((intake) => intake.id);
  const candidatesResult = ids.length
    ? await supabase
        .from("known_farmer_source_candidates")
        .select(candidateColumns)
        .in("intake_id", ids)
        .gt("retention_expires_at", new Date().toISOString())
        .order("created_at", { ascending: true })
    : { data: [], error: null };
  if (candidatesResult.error) {
    throw new Error("KNOWN_FARMER_CANDIDATES_UNAVAILABLE");
  }
  const candidates = z.array(knownFarmerCandidateRowSchema).parse(
    candidatesResult.data ?? [],
  );
  return {
    available: true as const,
    intakes: intakes.map((intake) => {
      const google = buildKnownFarmerGoogleResearch({
        fullName: intake.subject_name,
        locationHint: intake.location_hint ?? undefined,
        farmingHint: intake.farming_hint ?? undefined,
      });
      return {
        ...intake,
        googleResearchUrl: google.url,
        googleResearchQuery: google.query,
        candidates: candidates.filter(
          (candidate) => candidate.intake_id === intake.id,
        ),
      };
    }),
  };
}

export { intakeColumns, candidateColumns };
