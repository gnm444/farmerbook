import { z } from "zod";
import { SUPPORTED_LOCALES } from "@/lib/i18n/locales";

export const customerSupportCategories = [
  "account",
  "marketplace",
  "profile",
  "technical",
  "billing",
  "safety",
  "agriculture",
  "other",
] as const;

export const socialPlatforms = [
  "linkedin",
  "instagram",
  "facebook",
  "x",
] as const;

export const proposalDecisions = [
  "approved",
  "rejected",
  "escalated",
] as const;

export const customerOperationRiskLevels = ["low", "medium", "high"] as const;

export const supportEscalationReasons = [
  "COMPLAINT",
  "REFUND_OR_PRICE",
  "ACCOUNT_OR_PRIVACY_ACTION",
  "LEGAL_OR_FINANCIAL",
  "CROP_TREATMENT_OR_CHEMICAL",
  "MEDICAL_OR_VETERINARY",
  "THREAT_OR_EMERGENCY",
  "AMBIGUOUS_OR_UNSUPPORTED",
] as const;

const boundedText = (minimum: number, maximum: number) =>
  z
    .string()
    .trim()
    .min(minimum)
    .max(maximum)
    .refine(
      (value) =>
        !/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u202A-\u202E\u2066-\u2069]/u.test(
          value,
        ),
      "Control and bidirectional override characters are not allowed.",
    );

const localeSchema = z.enum(SUPPORTED_LOCALES);
const supportStateSchema = z.enum([
  "open",
  "proposal_ready",
  "answered",
  "escalated",
  "closed",
]);
const socialBriefStateSchema = z.enum([
  "draft",
  "proposal_ready",
  "copy_ready",
  "escalated",
  "closed",
]);
const proposalStateSchema = z.enum([
  "pending",
  "approved",
  "rejected",
  "escalated",
]);

export const supportCaseSubmissionSchema = z
  .object({
    category: z.enum(customerSupportCategories),
    locale: localeSchema,
    subject: boundedText(5, 160),
    question: boundedText(10, 6_000),
    idempotencyKey: z.uuid(),
  })
  .strict();

export const socialCampaignBriefSchema = z
  .object({
    platform: z.enum(socialPlatforms),
    locale: localeSchema,
    audience: boundedText(5, 1_000),
    objective: boundedText(10, 2_000),
    sourceFacts: boundedText(10, 8_000),
    callToAction: boundedText(5, 1_000),
    idempotencyKey: z.uuid(),
  })
  .strict();

export const agentActionProposalReviewSchema = z
  .object({
    proposalId: z.uuid(),
    decision: z.enum(proposalDecisions),
    expectedRevision: z.number().int().nonnegative(),
    content: boundedText(1, 6_000).nullable(),
    reason: boundedText(5, 1_000),
    idempotencyKey: z.uuid(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.decision === "approved" && value.content === null) {
      context.addIssue({
        code: "custom",
        path: ["content"],
        message: "Approved content is required.",
      });
    }
    if (value.decision !== "approved" && value.content !== null) {
      context.addIssue({
        code: "custom",
        path: ["content"],
        message: "Only approved proposals may have final content.",
      });
    }
  });

export const supportSubmissionSchema = supportCaseSubmissionSchema;
export const socialBriefSchema = socialCampaignBriefSchema;
export const proposalDecisionSchema = agentActionProposalReviewSchema;

export const supportCaseCandidateSchema = z
  .object({
    id: z.uuid(),
    participant_id: z.uuid(),
    category: z.enum(customerSupportCategories),
    locale: localeSchema,
    subject: boundedText(5, 160),
    question: boundedText(10, 6_000),
    state: supportStateSchema,
    created_at: z.iso.datetime(),
    updated_at: z.iso.datetime(),
  })
  .strict();

export const socialCampaignCandidateSchema = z
  .object({
    id: z.uuid(),
    platform: z.enum(socialPlatforms),
    locale: localeSchema,
    audience: boundedText(5, 1_000),
    objective: boundedText(10, 2_000),
    source_facts: boundedText(10, 8_000),
    call_to_action: boundedText(5, 1_000),
    state: socialBriefStateSchema,
    revision: z.number().int().nonnegative(),
    created_at: z.iso.datetime(),
    updated_at: z.iso.datetime(),
  })
  .strict();

export type SupportCaseCandidate = z.infer<typeof supportCaseCandidateSchema>;
export type SocialCampaignCandidate = z.infer<typeof socialCampaignCandidateSchema>;

export const supportCaseRowSchema = supportCaseCandidateSchema.extend({
  idempotency_key: z.uuid(),
  expires_at: z.iso.datetime(),
}).strict();

export const socialBriefRowSchema = socialCampaignCandidateSchema.extend({
  created_by: z.uuid(),
  idempotency_key: z.uuid(),
}).strict();

export const customerOperationsProposalMetadataSchema = z.record(
  z.string(),
  z.unknown(),
);

export const customerOperationsProposalRowSchema = z
  .object({
    id: z.uuid(),
    run_id: z.uuid(),
    action_type: z.enum(["support_reply", "social_post"]),
    target_id: z.uuid(),
    draft_content: boundedText(1, 6_000),
    final_content: boundedText(1, 6_000).nullable(),
    metadata: customerOperationsProposalMetadataSchema,
    risk_level: z.enum(customerOperationRiskLevels),
    model: boundedText(2, 100),
    prompt_version: boundedText(3, 100),
    state: proposalStateSchema,
    revision: z.number().int().nonnegative(),
    reviewed_by: z.uuid().nullable(),
    reviewer_reason: boundedText(5, 1_000).nullable(),
    reviewed_at: z.iso.datetime().nullable(),
    idempotency_key: z.uuid(),
    created_at: z.iso.datetime(),
    updated_at: z.iso.datetime(),
  })
  .strict();

export const createSupportCaseResultRowSchema = z
  .object({
    code: z.enum(["CASE_CREATED", "IDEMPOTENT_REPLAY"]),
    case_id: z.uuid(),
    state: supportStateSchema,
    expires_at: z.iso.datetime(),
  })
  .strict();

export const createSocialBriefResultRowSchema = z
  .object({
    code: z.enum(["BRIEF_CREATED", "IDEMPOTENT_REPLAY"]),
    brief_id: z.uuid(),
    state: socialBriefStateSchema,
    revision: z.number().int().nonnegative(),
  })
  .strict();

export const proposalMutationResultRowSchema = z
  .object({
    code: z.string().trim().min(2).max(80),
    proposal_id: z.uuid(),
    state: proposalStateSchema,
    revision: z.number().int().nonnegative(),
  })
  .strict();
