"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/features/auth/require-admin";
import { isDemoMode, isSupabaseConfigured } from "@/lib/env";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { createClient } from "@/lib/supabase/server";
import { companyProposalReviewSchema } from "./contracts";

function failure(message: string) {
  return { ok: false as const, message };
}

export async function reviewAiCompanyProposalAction(rawInput: unknown) {
  if (
    !isFeatureEnabled("ENABLE_MANAGED_OPERATIONS_AGENTS") ||
    !isFeatureEnabled("ENABLE_AI_COMPANY")
  ) {
    return failure("The AI company control plane is disabled.");
  }
  const parsed = companyProposalReviewSchema.safeParse(rawInput);
  if (!parsed.success) return failure("Check the review decision and try again.");
  const administrator = await requireAdmin();
  if (administrator.demo || isDemoMode() || !isSupabaseConfigured()) {
    return failure("The AI company control plane is not configured.");
  }
  const supabase = await createClient();
  const reviewed = await supabase.rpc("review_ai_company_proposal", {
    proposal_id_input: parsed.data.proposalId,
    decision_input: parsed.data.decision,
    expected_revision_input: parsed.data.expectedRevision,
    reason_input: parsed.data.reason,
    idempotency_key_input: parsed.data.idempotencyKey,
  });
  if (reviewed.error) {
    const detail = String(reviewed.error.details ?? "");
    if (detail === "REVISION_CONFLICT" || detail === "ALREADY_REVIEWED") {
      return failure("This proposal changed before your review. Refresh and try again.");
    }
    if (detail === "FEATURE_DISABLED") {
      return failure("The private AI company release control is disabled.");
    }
    return failure("The proposal review could not be recorded.");
  }
  revalidatePath("/admin/agents");
  return {
    ok: true as const,
    message:
      "Decision recorded in the operating backlog. No external action was executed.",
  };
}
