import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createSupportCase: vi.fn(),
  createSocialBrief: vi.fn(),
  reviewProposal: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));
vi.mock("@/features/customer-operations/actions", () => ({
  createSupportCaseAction: mocks.createSupportCase,
  createSocialCampaignBriefAction: mocks.createSocialBrief,
  reviewAgentActionProposalAction: mocks.reviewProposal,
}));

import { OperationsConsole } from "@/features/customer-operations/operations-console";
import { SupportConsole } from "@/features/customer-operations/support-console";

const supportCases = [
  {
    id: "00000000-0000-4000-8000-000000000901",
    participantId: "00000000-0000-4000-8000-000000000902",
    category: "technical",
    locale: "en-IN",
    subject: "Profile changes are not saved",
    question: "Why are the changes to my farm profile not being saved?",
    state: "answered",
    expiresAt: "2026-11-14T12:00:00.000Z",
    createdAt: "2026-08-16T12:00:00.000Z",
    updatedAt: "2026-08-16T12:10:00.000Z",
    replyContent: "Please retry once, then share the non-sensitive error reference.",
    replyReviewedAt: "2026-08-16T12:10:00.000Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000903",
    participantId: "00000000-0000-4000-8000-000000000902",
    category: "agriculture",
    locale: "en-IN",
    subject: "Agriculture guidance question",
    question: "Where can I find general educational material about soil testing?",
    state: "proposal_ready",
    expiresAt: "2026-11-14T12:00:00.000Z",
    createdAt: "2026-08-16T12:05:00.000Z",
    updatedAt: "2026-08-16T12:05:00.000Z",
    replyContent: null,
    replyReviewedAt: null,
  },
];

const socialBriefs = [
  {
    id: "00000000-0000-4000-8000-000000000904",
    createdBy: "00000000-0000-4000-8000-000000000905",
    platform: "linkedin",
    locale: "en-IN",
    audience: "Farmer producer organisations",
    objective: "Introduce the verified profile pilot",
    sourceFacts: "FarmerBook provides farmer-controlled profiles.",
    callToAction: "Request a pilot conversation.",
    state: "proposal_ready",
    revision: 1,
    createdAt: "2026-08-16T12:00:00.000Z",
    updatedAt: "2026-08-16T12:10:00.000Z",
  },
];

const pendingProposals = [
  {
    id: "00000000-0000-4000-8000-000000000906",
    runId: "00000000-0000-4000-8000-000000000907",
    actionType: "support_reply",
    targetId: supportCases[0].id,
    draftContent: "A private draft that still needs a human decision.",
    finalContent: null,
    metadata: { escalationReasons: ["Account-changing request"] },
    riskLevel: "high",
    model: "@cf/meta/llama-3.1-8b-instruct",
    promptVersion: "support-v1",
    state: "pending",
    revision: 2,
    createdAt: "2026-08-16T12:10:00.000Z",
    reviewedAt: null,
  },
];

const actionedProposals = [
  {
    id: "00000000-0000-4000-8000-000000000908",
    runId: "00000000-0000-4000-8000-000000000909",
    actionType: "social_post",
    targetId: socialBriefs[0].id,
    draftContent: "Draft campaign copy",
    finalContent: "Reviewed campaign copy",
    metadata: {},
    riskLevel: "low",
    model: "@cf/meta/llama-3.1-8b-instruct",
    promptVersion: "social-v1",
    state: "approved",
    revision: 3,
    createdAt: "2026-08-16T12:15:00.000Z",
    reviewedAt: "2026-08-16T12:20:00.000Z",
  },
];

describe("customer operations consoles", () => {
  beforeEach(() => {
    mocks.createSupportCase.mockReset();
    mocks.createSocialBrief.mockReset();
    mocks.reviewProposal.mockReset();
    mocks.refresh.mockReset();
    mocks.createSupportCase.mockResolvedValue({
      ok: true,
      code: "CREATED",
      data: { caseId: "case-new", state: "open", expiresAt: "2026-11-14" },
    });
    mocks.createSocialBrief.mockResolvedValue({
      ok: true,
      code: "CREATED",
      data: { briefId: "brief-new", state: "draft", revision: 0 },
    });
    mocks.reviewProposal.mockResolvedValue({
      ok: true,
      code: "REVIEWED",
      data: { proposalId: pendingProposals[0].id, state: "approved", revision: 3 },
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it("submits an authenticated support question and renders only approved reply content", async () => {
    render(
      <SupportConsole
        cases={supportCases as never}
        locale="en-IN"
        enabled
        configured
      />,
    );

    expect(screen.getByText("Human-approved reply")).toBeInTheDocument();
    expect(screen.getByText(supportCases[0].replyContent ?? "")).toBeInTheDocument();
    expect(screen.getByText(/Draft content is never shown before approval/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Subject"), {
      target: { value: "A new technical question" },
    });
    fireEvent.change(screen.getByLabelText("Your question"), {
      target: { value: "Why does the profile editor show this non-sensitive error?" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit question" }));

    await waitFor(() => expect(mocks.createSupportCase).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "account",
        locale: "en-IN",
        subject: "A new technical question",
      }),
    ));
    expect(await screen.findByRole("status")).toHaveTextContent("human will review");
  });

  it("shows editable human review controls, risk and model evidence", () => {
    render(
      <OperationsConsole
        supportCases={supportCases as never}
        socialBriefs={socialBriefs as never}
        pendingProposals={pendingProposals as never}
        actionedProposals={actionedProposals as never}
        locale="en-IN"
        enabled
        configured
      />,
    );

    expect(screen.getByLabelText("Editable reviewed content")).toHaveValue(
      pendingProposals[0].draftContent,
    );
    expect(screen.getByText("high risk")).toBeInTheDocument();
    expect(screen.getByText(pendingProposals[0].model)).toBeInTheDocument();
    expect(screen.getByText("support-v1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approve" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Reject" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Escalate" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Create brief" })).toBeEnabled();
  });

  it("records approval through the review action", async () => {
    render(
      <OperationsConsole
        supportCases={supportCases as never}
        socialBriefs={socialBriefs as never}
        pendingProposals={pendingProposals as never}
        actionedProposals={[]}
        locale="en-IN"
        enabled
        configured
      />,
    );
    fireEvent.change(screen.getByLabelText("Editable reviewed content"), {
      target: { value: "Human-edited final reply." },
    });
    fireEvent.change(screen.getByLabelText("Reviewer reason"), {
      target: { value: "Verified against the original request." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));

    await waitFor(() => expect(mocks.reviewProposal).toHaveBeenCalledWith(
      expect.objectContaining({
        proposalId: pendingProposals[0].id,
        decision: "approved",
        expectedRevision: 2,
        content: "Human-edited final reply.",
        reason: "Verified against the original request.",
      }),
    ));
  });

  it("labels approved social content copy ready and exposes copying only", async () => {
    render(
      <OperationsConsole
        supportCases={supportCases as never}
        socialBriefs={socialBriefs as never}
        pendingProposals={[]}
        actionedProposals={actionedProposals as never}
        locale="en-IN"
        enabled
        configured
      />,
    );

    expect(screen.getByText("Copy ready")).toBeInTheDocument();
    const copyButton = screen.getByRole("button", { name: "Copy approved draft" });
    fireEvent.click(copyButton);
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      "Reviewed campaign copy",
    ));

    for (const button of screen.getAllByRole("button")) {
      expect(within(button).queryByText(/^(Send|Post|Publish)$/i)).not.toBeInTheDocument();
      expect(button).not.toHaveAccessibleName(/\b(send|post|publish)\b/i);
    }
    expect(screen.queryByText(/\bPublished\b/i)).not.toBeInTheDocument();
  });

  it("renders an honest disabled state with inert creation controls", () => {
    render(
      <OperationsConsole
        supportCases={[]}
        socialBriefs={[]}
        pendingProposals={[]}
        actionedProposals={[]}
        locale="en-IN"
        enabled={false}
        configured={false}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("pilot is disabled");
    expect(screen.getByRole("button", { name: "Create brief" })).toBeDisabled();
  });
});
