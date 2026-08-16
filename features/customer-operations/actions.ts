"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/features/auth/require-admin";
import { requireUser } from "@/features/auth/require-user";
import { isDemoMode, isSupabaseConfigured } from "@/lib/env";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { createClient } from "@/lib/supabase/server";
import {
  agentActionProposalReviewSchema,
  createSocialBriefResultRowSchema,
  createSupportCaseResultRowSchema,
  proposalMutationResultRowSchema,
  socialCampaignBriefSchema,
  supportCaseSubmissionSchema,
} from "./schemas";

type CustomerOperationsFailureCode =
  | "FEATURE_DISABLED"
  | "NOT_CONFIGURED"
  | "INVALID_INPUT"
  | "FORBIDDEN"
  | "RATE_LIMITED"
  | "CONFLICT"
  | "NOT_FOUND"
  | "DATA_UNAVAILABLE";

type CustomerOperationsActionResult<T> =
  | { ok: true; code: string; data: T }
  | {
      ok: false;
      code: CustomerOperationsFailureCode;
      message: string;
    };

const failureMessages: Record<CustomerOperationsFailureCode, string> = {
  FEATURE_DISABLED: "FarmerBook support and social drafting are not open yet.",
  NOT_CONFIGURED: "The supervised operations pilot is not configured.",
  INVALID_INPUT: "Check the supplied information and try again.",
  FORBIDDEN: "You do not have permission to perform this operation.",
  RATE_LIMITED: "The daily limit has been reached. Please try again later.",
  CONFLICT: "This item changed. Refresh it before trying again.",
  NOT_FOUND: "This item is no longer available.",
  DATA_UNAVAILABLE: "The operation could not be completed. Please try again.",
};

function failure(
  code: CustomerOperationsFailureCode,
): CustomerOperationsActionResult<never> {
  return { ok: false, code, message: failureMessages[code] };
}

function databaseFailure(error: unknown) {
  const code =
    typeof error === "object" && error && "code" in error
      ? String(error.code)
      : "";
  const details =
    typeof error === "object" && error && "details" in error
      ? String(error.details)
      : "";
  if (details === "FEATURE_DISABLED") return failure("FEATURE_DISABLED");
  if (details === "RATE_LIMITED") return failure("RATE_LIMITED");
  if (
    details === "IDEMPOTENCY_CONFLICT" ||
    details === "REVISION_CONFLICT" ||
    details === "PROPOSAL_ALREADY_REVIEWED" ||
    code === "40001" ||
    code === "23505"
  ) {
    return failure("CONFLICT");
  }
  if (code === "42501") return failure("FORBIDDEN");
  if (code === "P0002" || code === "PGRST116") return failure("NOT_FOUND");
  if (code === "22023" || code === "22007") return failure("INVALID_INPUT");
  return failure("DATA_UNAVAILABLE");
}

function firstRow(value: unknown): Record<string, unknown> | null {
  const row = Array.isArray(value) ? value[0] : value;
  return typeof row === "object" && row !== null
    ? (row as Record<string, unknown>)
    : null;
}

function pilotConfigured() {
  return isSupabaseConfigured() && !isDemoMode();
}

export async function createSupportCaseAction(
  rawInput: unknown,
): Promise<CustomerOperationsActionResult<{
  caseId: string;
  state: string;
  expiresAt: string;
}>> {
  if (!isFeatureEnabled("ENABLE_SUPPORT_SOCIAL_PILOT")) {
    return failure("FEATURE_DISABLED");
  }
  const parsed = supportCaseSubmissionSchema.safeParse(rawInput);
  if (!parsed.success) return failure("INVALID_INPUT");
  const user = await requireUser();
  if (user.demo || !pilotConfigured()) return failure("NOT_CONFIGURED");

  const supabase = await createClient();
  const result = await supabase.rpc("create_support_case", {
    category_input: parsed.data.category,
    locale_input: parsed.data.locale,
    subject_input: parsed.data.subject,
    question_input: parsed.data.question,
    idempotency_key_input: parsed.data.idempotencyKey,
  });
  if (result.error) return databaseFailure(result.error);
  const row = createSupportCaseResultRowSchema.safeParse(firstRow(result.data));
  if (!row.success) return failure("DATA_UNAVAILABLE");
  revalidatePath("/support");
  return {
    ok: true,
    code: row.data.code,
    data: {
      caseId: row.data.case_id,
      state: row.data.state,
      expiresAt: row.data.expires_at,
    },
  };
}

export async function createSocialCampaignBriefAction(
  rawInput: unknown,
): Promise<CustomerOperationsActionResult<{
  briefId: string;
  state: string;
  revision: number;
}>> {
  if (!isFeatureEnabled("ENABLE_SUPPORT_SOCIAL_PILOT")) {
    return failure("FEATURE_DISABLED");
  }
  const parsed = socialCampaignBriefSchema.safeParse(rawInput);
  if (!parsed.success) return failure("INVALID_INPUT");
  const administrator = await requireAdmin();
  if (administrator.demo || !pilotConfigured()) return failure("NOT_CONFIGURED");

  const supabase = await createClient();
  const result = await supabase.rpc("create_social_campaign_brief", {
    platform_input: parsed.data.platform,
    locale_input: parsed.data.locale,
    audience_input: parsed.data.audience,
    objective_input: parsed.data.objective,
    source_facts_input: parsed.data.sourceFacts,
    call_to_action_input: parsed.data.callToAction,
    idempotency_key_input: parsed.data.idempotencyKey,
  });
  if (result.error) return databaseFailure(result.error);
  const row = createSocialBriefResultRowSchema.safeParse(firstRow(result.data));
  if (!row.success) return failure("DATA_UNAVAILABLE");
  revalidatePath("/admin/operations");
  return {
    ok: true,
    code: row.data.code,
    data: {
      briefId: row.data.brief_id,
      state: row.data.state,
      revision: row.data.revision,
    },
  };
}

export async function reviewAgentActionProposalAction(
  rawInput: unknown,
): Promise<CustomerOperationsActionResult<{
  proposalId: string;
  state: string;
  revision: number;
}>> {
  if (!isFeatureEnabled("ENABLE_SUPPORT_SOCIAL_PILOT")) {
    return failure("FEATURE_DISABLED");
  }
  const parsed = agentActionProposalReviewSchema.safeParse(rawInput);
  if (!parsed.success) return failure("INVALID_INPUT");
  const administrator = await requireAdmin();
  if (administrator.demo || !pilotConfigured()) return failure("NOT_CONFIGURED");

  const supabase = await createClient();
  const result = await supabase.rpc("review_agent_action_proposal", {
    proposal_id_input: parsed.data.proposalId,
    decision_input: parsed.data.decision,
    expected_revision_input: parsed.data.expectedRevision,
    content_input: parsed.data.content,
    reason_input: parsed.data.reason,
    idempotency_key_input: parsed.data.idempotencyKey,
  });
  if (result.error) return databaseFailure(result.error);
  const row = proposalMutationResultRowSchema.safeParse(firstRow(result.data));
  if (!row.success) return failure("DATA_UNAVAILABLE");
  revalidatePath("/admin/operations");
  revalidatePath("/support");
  return {
    ok: true,
    code: row.data.code,
    data: {
      proposalId: row.data.proposal_id,
      state: row.data.state,
      revision: row.data.revision,
    },
  };
}
