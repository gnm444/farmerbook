import { requireAdmin } from "@/features/auth/require-admin";
import { requireUser } from "@/features/auth/require-user";
import { isDemoMode, isSupabaseConfigured } from "@/lib/env";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type {
  AgentActionProposal,
  SocialCampaignBrief,
  SupportCase,
} from "./types";

function firstRows(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter(
        (row): row is Record<string, unknown> =>
          typeof row === "object" && row !== null,
      )
    : [];
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.length ? value : null;
}

function mapSupportCase(row: Record<string, unknown>): SupportCase {
  return {
    id: String(row.case_id ?? row.id),
    participantId: String(row.participant_id),
    category: String(row.category) as SupportCase["category"],
    locale: String(row.locale) as SupportCase["locale"],
    subject: String(row.subject),
    question: String(row.question),
    state: String(row.state) as SupportCase["state"],
    expiresAt: String(row.expires_at),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    replyContent: optionalString(row.reply_content),
    replyReviewedAt: optionalString(row.reply_reviewed_at),
  };
}

function mapSocialBrief(row: Record<string, unknown>): SocialCampaignBrief {
  return {
    id: String(row.id),
    createdBy: String(row.created_by),
    platform: String(row.platform) as SocialCampaignBrief["platform"],
    locale: String(row.locale) as SocialCampaignBrief["locale"],
    audience: String(row.audience),
    objective: String(row.objective),
    sourceFacts: String(row.source_facts),
    callToAction: String(row.call_to_action),
    state: String(row.state) as SocialCampaignBrief["state"],
    revision: Number(row.revision),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapProposal(row: Record<string, unknown>): AgentActionProposal {
  const metadata =
    typeof row.metadata === "object" && row.metadata !== null
      ? (row.metadata as Record<string, unknown>)
      : {};
  return {
    id: String(row.id),
    runId: String(row.run_id),
    actionType: String(row.action_type) as AgentActionProposal["actionType"],
    targetId: String(row.target_id),
    draftContent: String(row.draft_content),
    finalContent: optionalString(row.final_content),
    metadata,
    riskLevel: String(row.risk_level) as AgentActionProposal["riskLevel"],
    model: String(row.model),
    promptVersion: String(row.prompt_version),
    state: String(row.state) as AgentActionProposal["state"],
    revision: Number(row.revision),
    createdAt: String(row.created_at),
    reviewedAt: optionalString(row.reviewed_at),
  };
}

function pilotAvailable() {
  return (
    isFeatureEnabled("ENABLE_SUPPORT_SOCIAL_PILOT") &&
    isSupabaseConfigured() &&
    !isDemoMode()
  );
}

export async function loadMySupportCases(): Promise<SupportCase[]> {
  await requireUser();
  if (!pilotAvailable()) return [];

  const supabase = await createClient();
  const result = await supabase.rpc("list_my_support_cases", {
    limit_input: 50,
  });
  if (result.error) {
    throw new Error("FarmerBook support history is temporarily unavailable.");
  }
  return firstRows(result.data).map(mapSupportCase);
}

export async function loadCustomerOperationsDashboard(): Promise<{
  supportCases: SupportCase[];
  socialBriefs: SocialCampaignBrief[];
  pendingProposals: AgentActionProposal[];
  actionedProposals: AgentActionProposal[];
  configured: boolean;
}> {
  await requireAdmin();
  if (!pilotAvailable()) {
    return {
      supportCases: [],
      socialBriefs: [],
      pendingProposals: [],
      actionedProposals: [],
      configured: false,
    };
  }

  const supabase = createAdminClient();
  const [supportResult, briefResult, proposalResult] = await Promise.all([
    supabase
      .from("support_cases")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("social_campaign_briefs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("agent_action_proposals")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200),
  ]);
  if (supportResult.error || briefResult.error || proposalResult.error) {
    throw new Error("Customer operations data is temporarily unavailable.");
  }

  const proposals = firstRows(proposalResult.data).map(mapProposal);
  return {
    supportCases: firstRows(supportResult.data).map(mapSupportCase),
    socialBriefs: firstRows(briefResult.data).map(mapSocialBrief),
    pendingProposals: proposals.filter((proposal) => proposal.state === "pending"),
    actionedProposals: proposals.filter((proposal) => proposal.state !== "pending"),
    configured: true,
  };
}
