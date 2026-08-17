"use server";

import { z } from "zod";
import { requireAdmin } from "@/features/auth/require-admin";
import { requireUser } from "@/features/auth/require-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const submissionSchema = z.object({
  path: z.string().trim().min(10).max(500),
  mimeType: z.enum(["application/pdf", "image/jpeg", "image/png"]),
  sizeBytes: z.number().int().positive().max(10 * 1024 * 1024),
});

const reviewSchema = z.object({
  submissionId: z.uuid(),
  decision: z.enum(["verified", "rejected"]),
  note: z.string().trim().max(1000).default(""),
});

export async function submitOrganicCertificationAction(input: unknown) {
  const parsed = submissionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, message: "Choose a PDF, JPEG or PNG file up to 10 MB." };
  }
  const user = await requireUser();
  if (user.profile.accountRole !== "farmer") {
    return { ok: false as const, message: "Only Farmer profiles can submit organic certification." };
  }
  if (user.demo) return { ok: true as const, demo: true };
  if (!parsed.data.path.startsWith(`${user.id}/`)) {
    return { ok: false as const, message: "The certification upload path is invalid." };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_organic_certification", {
    evidence_path_input: parsed.data.path,
    evidence_mime_type_input: parsed.data.mimeType,
    evidence_size_bytes_input: parsed.data.sizeBytes,
  });
  return error
    ? { ok: false as const, message: "The certificate could not be submitted. Please try again." }
    : { ok: true as const, demo: false };
}

export async function reviewOrganicCertificationAction(input: unknown) {
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, message: "Choose a valid certification decision." };
  }
  const admin = await requireAdmin();
  if (admin.demo) return { ok: true as const, demo: true };
  const { error } = await createAdminClient().rpc("review_organic_certification", {
    submission_id_input: parsed.data.submissionId,
    decision_input: parsed.data.decision,
    reviewer_id_input: admin.id,
    reviewer_note_input: parsed.data.note || null,
  });
  return error
    ? { ok: false as const, message: "The organic certification decision could not be saved." }
    : { ok: true as const, demo: false };
}
