import { requireUser } from "@/features/auth/require-user";
import { isDemoMode, isSupabaseConfigured } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type {
  OrganicCertificationStatus,
  OrganicCertificationSubmission,
} from "./organic-certification";

type SubmissionRow = {
  id: string;
  status: Exclude<OrganicCertificationStatus, "not_submitted">;
  evidence_path: string;
  evidence_mime_type: string;
  evidence_size_bytes: number;
  submitted_at: string;
  reviewed_at: string | null;
  reviewer_note: string | null;
};

const submissionColumns =
  "id, status, evidence_path, evidence_mime_type, evidence_size_bytes, submitted_at, reviewed_at, reviewer_note";

function mapSubmission(row: SubmissionRow, evidenceUrl?: string): OrganicCertificationSubmission {
  return {
    id: row.id,
    status: row.status,
    evidencePath: row.evidence_path,
    evidenceMimeType: row.evidence_mime_type,
    evidenceSizeBytes: Number(row.evidence_size_bytes),
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at ?? undefined,
    reviewerNote: row.reviewer_note ?? undefined,
    evidenceUrl,
  };
}

export async function loadCurrentOrganicCertification() {
  if (!isSupabaseConfigured()) return null;
  const user = await requireUser();
  if (user.demo) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organic_certification_submissions")
    .select(submissionColumns)
    .eq("farmer_id", user.id)
    .maybeSingle();
  if (error?.code === "PGRST205" || error?.code === "42P01") return null;
  if (error) throw new Error("Organic certification status is temporarily unavailable.");
  return data ? mapSubmission(data as SubmissionRow) : null;
}

export async function loadOrganicCertificationForAdmin(farmerId: string) {
  if (!isSupabaseConfigured()) return null;
  if (isDemoMode()) return null;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("organic_certification_submissions")
    .select(submissionColumns)
    .eq("farmer_id", farmerId)
    .maybeSingle();
  if (error?.code === "PGRST205" || error?.code === "42P01") return null;
  if (error) throw new Error("Organic certification submission is temporarily unavailable.");
  if (!data) return null;
  const row = data as SubmissionRow;
  const signed = await supabase.storage
    .from("organic-certificates")
    .createSignedUrl(row.evidence_path, 10 * 60);
  return mapSubmission(row, signed.data?.signedUrl);
}
