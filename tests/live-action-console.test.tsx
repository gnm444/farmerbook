import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LiveActionConsole } from "@/features/action-control/action-console";
import type { LiveActionConsoleData } from "@/features/action-control/queries";

const review = vi.fn();
const revoke = vi.fn();
const setPause = vi.fn();
vi.mock("@/features/action-control/actions", () => ({
  reviewLiveActionAuthorizationAction: (...args: unknown[]) => review(...args),
  revokeLiveActionAuthorizationAction: (...args: unknown[]) => revoke(...args),
  setLiveAgentExecutorPauseAction: (...args: unknown[]) => setPause(...args),
}));

const data: LiveActionConsoleData = {
  available: true,
  applicationEnabled: false,
  releaseEnabled: false,
  runtimeBound: true,
  canaryReady: false,
  controls: [{
    releaseEnabled: false,
    executor: "consent_outreach",
    paused: true,
    shadowOnly: true,
    dailyActionLimit: 10,
    monthlyActionLimit: 300,
    dailySpendLimitPaise: 0,
    monthlySpendLimitPaise: 0,
    canaryStage: 0,
    revision: 0,
    pauseReasonCode: "DEFAULT_OFF",
    updatedAt: "2026-08-20T00:00:00.000Z",
  }],
  authorizations: [{
    authorizationId: "00000000-0000-4000-8000-000000002001",
    proposalId: "00000000-0000-4000-8000-000000002002",
    proposalRevision: 0,
    executor: "owned_site_publish",
    actionType: "owned_site_article_publish",
    targetScope: {
      scopeType: "owned_site_draft",
      draftId: "00000000-0000-4000-8000-000000002003",
      slug: "money-and-organic-farming",
    },
    targetScopeSha256: "b".repeat(64),
    payloadSha256: "c".repeat(64),
    riskLevel: "high",
    approvalTier: 4,
    state: "pending_approval",
    revision: 0,
    approvalCount: 0,
    requiredApprovals: 2,
    maxActions: 1,
    maxSpendPaise: 0,
    canaryStage: 0,
    notBefore: "2026-08-20T00:00:00.000Z",
    expiresAt: "2026-08-21T00:00:00.000Z",
    latestAttemptState: null,
    latestReceiptSha256: "a".repeat(64),
    latestVerifierIdentity: null,
    createdAt: "2026-08-20T00:00:00.000Z",
  }],
};

describe("live-action console", () => {
  it("shows every disabled gate and keeps resume/review controls disabled", () => {
    render(<LiveActionConsole {...data} />);
    expect(screen.getByText(/Application gate: off/i)).toHaveTextContent(
      "database release: off",
    );
    expect(screen.getByRole("button", { name: /resume reviewed executor/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /approve this authorization/i })).toBeDisabled();
    expect(screen.getByText(/recipients details|recipient details/i)).toBeInTheDocument();
    expect(screen.queryByText("a".repeat(64))).not.toBeInTheDocument();
  });

  it("allows an enabled executor to be paused immediately", async () => {
    setPause.mockResolvedValue({ ok: false, message: "Synthetic pause recorded." });
    render(<LiveActionConsole
      {...data}
      applicationEnabled
      releaseEnabled
      controls={[{ ...data.controls[0], paused: false, shadowOnly: false, canaryStage: 1 }]}
    />);
    fireEvent.click(screen.getByRole("button", { name: /pause immediately/i }));
    expect(await screen.findByText("Synthetic pause recorded.")).toBeInTheDocument();
    expect(setPause).toHaveBeenCalledWith(expect.objectContaining({
      executor: "consent_outreach",
      paused: true,
      dailyActionLimit: 10,
    }));
  });

  it("keeps resume blocked even when foundation gates are present", () => {
    render(<LiveActionConsole
      {...data}
      applicationEnabled
      releaseEnabled
    />);
    expect(screen.getByText(/restricted roles, connector registry and verifier: not implemented/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /resume reviewed executor/i })).toBeDisabled();
  });
});
