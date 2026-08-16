import type { z } from "zod";
import type {
  agentActionProposalReviewSchema,
  customerOperationsProposalRowSchema,
  socialBriefRowSchema,
  socialCampaignBriefSchema,
  supportCaseRowSchema,
  supportCaseSubmissionSchema,
} from "./schemas";

export type SupportCaseSubmission = z.infer<typeof supportCaseSubmissionSchema>;
export type SocialCampaignBriefSubmission = z.infer<
  typeof socialCampaignBriefSchema
>;
export type AgentActionProposalReview = z.infer<
  typeof agentActionProposalReviewSchema
>;
export type SupportCaseRow = z.infer<typeof supportCaseRowSchema>;
export type SocialBriefRow = z.infer<typeof socialBriefRowSchema>;
export type CustomerOperationsProposalRow = z.infer<
  typeof customerOperationsProposalRowSchema
>;

export type SupportCase = {
  id: string;
  participantId: string;
  category: SupportCaseRow["category"];
  locale: SupportCaseRow["locale"];
  subject: string;
  question: string;
  state: SupportCaseRow["state"];
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  replyContent: string | null;
  replyReviewedAt: string | null;
};

export type SocialCampaignBrief = {
  id: string;
  createdBy: string;
  platform: SocialBriefRow["platform"];
  locale: SocialBriefRow["locale"];
  audience: string;
  objective: string;
  sourceFacts: string;
  callToAction: string;
  state: SocialBriefRow["state"];
  revision: number;
  createdAt: string;
  updatedAt: string;
};

export type AgentActionProposal = {
  id: string;
  runId: string;
  actionType: CustomerOperationsProposalRow["action_type"];
  targetId: string;
  draftContent: string;
  finalContent: string | null;
  metadata: Record<string, unknown>;
  riskLevel: CustomerOperationsProposalRow["risk_level"];
  model: string;
  promptVersion: string;
  state: CustomerOperationsProposalRow["state"];
  revision: number;
  createdAt: string;
  reviewedAt: string | null;
};

export type CustomerOperationsDashboard = {
  supportCases: SupportCase[];
  socialBriefs: SocialCampaignBrief[];
  proposals: AgentActionProposal[];
};
