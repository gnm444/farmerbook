import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  enabled: true,
  configured: true,
  demo: false,
  requireUser: vi.fn(),
  requireAdmin: vi.fn(),
  rpc: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/feature-flags", () => ({
  isFeatureEnabled: () => mocks.enabled,
}));
vi.mock("@/lib/env", () => ({
  isDemoMode: () => mocks.demo,
  isSupabaseConfigured: () => mocks.configured,
}));
vi.mock("@/features/auth/require-user", () => ({
  requireUser: mocks.requireUser,
}));
vi.mock("@/features/auth/require-admin", () => ({
  requireAdmin: mocks.requireAdmin,
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ rpc: mocks.rpc })),
}));

import {
  createSocialCampaignBriefAction,
  createSupportCaseAction,
  reviewAgentActionProposalAction,
} from "@/features/customer-operations/actions";

const supportInput = {
  category: "technical",
  locale: "en-IN",
  subject: "Unable to update my profile",
  question: "The save button returns me to the same page without updating my farm profile.",
  idempotencyKey: "00000000-0000-4000-8000-000000000801",
} as const;

const socialInput = {
  platform: "linkedin",
  locale: "en-IN",
  audience: "Farmer producer organisations in Maharashtra",
  objective: "Introduce FarmerBook's verified farmer profile pilot.",
  sourceFacts:
    "FarmerBook provides farmer-controlled profiles and uses a supervised support workflow.",
  callToAction: "Invite interested organisations to request a pilot conversation.",
  idempotencyKey: "00000000-0000-4000-8000-000000000802",
} as const;

const reviewInput = {
  proposalId: "00000000-0000-4000-8000-000000000803",
  decision: "approved",
  expectedRevision: 2,
  content: "Reviewed content based only on the supplied source facts.",
  reason: "Checked against the campaign brief.",
  idempotencyKey: "00000000-0000-4000-8000-000000000804",
} as const;

describe("customer operations actions", () => {
  beforeEach(() => {
    mocks.enabled = true;
    mocks.configured = true;
    mocks.demo = false;
    mocks.requireUser.mockReset();
    mocks.requireAdmin.mockReset();
    mocks.rpc.mockReset();
    mocks.revalidatePath.mockReset();
    mocks.requireUser.mockResolvedValue({
      id: "00000000-0000-4000-8000-000000000805",
      demo: false,
    });
    mocks.requireAdmin.mockResolvedValue({
      id: "00000000-0000-4000-8000-000000000806",
      demo: false,
    });
  });

  it("stops before authentication and persistence when the release gate is off", async () => {
    mocks.enabled = false;

    await expect(createSupportCaseAction(supportInput)).resolves.toMatchObject({
      ok: false,
      code: "FEATURE_DISABLED",
    });
    expect(mocks.requireUser).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("creates a bounded support case through the participant RPC", async () => {
    mocks.rpc.mockResolvedValue({
      data: [{
        code: "CASE_CREATED",
        case_id: "00000000-0000-4000-8000-000000000807",
        state: "open",
        expires_at: "2026-11-14T12:00:00.000Z",
      }],
      error: null,
    });

    await expect(createSupportCaseAction(supportInput)).resolves.toEqual({
      ok: true,
      code: "CASE_CREATED",
      data: {
        caseId: "00000000-0000-4000-8000-000000000807",
        state: "open",
        expiresAt: "2026-11-14T12:00:00.000Z",
      },
    });
    expect(mocks.rpc).toHaveBeenCalledWith("create_support_case", {
      category_input: "technical",
      locale_input: "en-IN",
      subject_input: "Unable to update my profile",
      question_input: supportInput.question,
      idempotency_key_input: "00000000-0000-4000-8000-000000000801",
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/support");
  });

  it("requires administrator authority and creates a social brief through its narrow RPC", async () => {
    mocks.rpc.mockResolvedValue({
      data: [{
        code: "BRIEF_CREATED",
        brief_id: "00000000-0000-4000-8000-000000000808",
        state: "draft",
        revision: 0,
      }],
      error: null,
    });

    const result = await createSocialCampaignBriefAction(socialInput);
    expect(result).toEqual({
      ok: true,
      code: "BRIEF_CREATED",
      data: {
        briefId: "00000000-0000-4000-8000-000000000808",
        state: "draft",
        revision: 0,
      },
    });
    expect(mocks.requireAdmin).toHaveBeenCalledOnce();
    expect(mocks.rpc).toHaveBeenCalledWith("create_social_campaign_brief", {
      platform_input: "linkedin",
      locale_input: "en-IN",
      audience_input: socialInput.audience,
      objective_input: socialInput.objective,
      source_facts_input: socialInput.sourceFacts,
      call_to_action_input: socialInput.callToAction,
      idempotency_key_input: "00000000-0000-4000-8000-000000000802",
    });
  });

  it("records an explicit administrator decision with optimistic revision", async () => {
    mocks.rpc.mockResolvedValue({
      data: [{
        code: "APPROVED",
        proposal_id: reviewInput.proposalId,
        state: "approved",
        revision: 3,
      }],
      error: null,
    });

    const result = await reviewAgentActionProposalAction(reviewInput);
    expect(result).toEqual({
      ok: true,
      code: "APPROVED",
      data: {
        proposalId: reviewInput.proposalId,
        state: "approved",
        revision: 3,
      },
    });
    expect(mocks.requireAdmin).toHaveBeenCalledOnce();
    expect(mocks.rpc).toHaveBeenCalledWith("review_agent_action_proposal", {
      proposal_id_input: reviewInput.proposalId,
      decision_input: "approved",
      expected_revision_input: 2,
      content_input: reviewInput.content,
      reason_input: reviewInput.reason,
      idempotency_key_input: reviewInput.idempotencyKey,
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/operations");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/support");
  });

  it("rejects malformed input before authentication", async () => {
    await expect(createSocialCampaignBriefAction({ platform: "email" })).resolves.toMatchObject({
      ok: false,
      code: "INVALID_INPUT",
    });
    expect(mocks.requireAdmin).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
