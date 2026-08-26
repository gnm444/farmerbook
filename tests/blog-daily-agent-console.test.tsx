import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  controlDailyBlogScheduleAction,
  controlOwnedSocialChannelAction,
  prepareBlogDraftAction,
  replaceBlogDraftAction,
  reviewBlogDraftAction,
  verifyBlogPublicationAction,
} from "@/features/blog/admin-actions";
import { BlogAgentConsole } from "@/features/blog/blog-agent-console";
import type {
  BlogAgentDraft,
  BlogWritingAgentStatus,
} from "@/features/blog/contracts";
import { moneyCharacterPublication } from "@/features/blog/publications/money-character";

vi.mock("@/features/blog/admin-actions", () => ({
  controlDailyBlogScheduleAction: vi.fn(),
  controlOwnedSocialChannelAction: vi.fn(),
  prepareBlogDraftAction: vi.fn(),
  replaceBlogDraftAction: vi.fn(),
  reviewBlogDraftAction: vi.fn(),
  verifyBlogPublicationAction: vi.fn(),
}));

const status: BlogWritingAgentStatus = {
  monthKey: "2026-08",
  draftsThisMonth: 1,
  translationsThisMonth: 0,
  estimatedAiSpendMicros: 400,
  monthlyBudgetUsd: 2,
  model: "@cf/ibm-granite/granite-4.0-h-micro",
  scheduleId: "daily-schedule",
  schedulePaused: false,
  scheduleState: "scheduled",
  scheduleCronUtc: "30 3 * * *",
  scheduleTimeZone: "Asia/Kolkata",
  nextScheduledRunAt: "2026-08-21T03:30:00.000Z",
  currentRunKey: "2026-08-20",
  todayRun: null,
  dailyDraftLimit: 1,
  monthlyDraftLimit: 31,
  sourceManifestVersion: "daily-editorial-source-manifest-2026-08-20-v1",
  oldestSourceReviewedAt: "2026-08-20T00:00:00.000Z",
  staleSourceCount: 0,
  reviewMetrics: {
    awaitingReview: 1,
    published: 0,
    rejected: 0,
    approved: 0,
    lightEdits: 0,
    heavyEdits: 0,
    oldestAwaitingReviewAt: "2026-08-20T03:30:00.000Z",
  },
  autonomousPublishingEnabled: true,
  autonomousPolicyVersion: "owned-blog-standing-policy-2026-08-20-v1",
  autonomousPublishedThisMonth: 0,
  provisionalPublications: 0,
  quarantinedPublications: 0,
  lastDraftAt: "2026-08-20T03:30:00.000Z",
  lastFailureCode: null,
};

const draft: BlogAgentDraft = {
  id: "1484d0df-2f67-4f56-a09f-594509b91a8a",
  runKey: "2026-08-20",
  status: "awaiting_review",
  topic: "Farmer and consumer trust",
  content: moneyCharacterPublication,
  model: status.model,
  sourceManifestVersion: status.sourceManifestVersion,
  sourceReviewedAt: "2026-08-20T00:00:00.000Z",
  riskClass: "low",
  generationStatus: "prepared",
  failureCode: null,
  revision: 1,
  createdAt: "2026-08-20T03:30:00.000Z",
  reviewedAt: null,
  reviewerId: null,
  reviewReason: null,
  qualityOutcome: null,
  publicationVerificationStatus: null,
  publicationVerifiedAt: null,
  publicationVerificationCode: null,
  publicationMode: "manual",
  publicationPolicyVersion: null,
  publicationIdempotencyKey: null,
  contentSha256: null,
  visibilityStatus: "private",
};

const socialStatus = {
  globallyEnabled: false,
  connectorConfigured: false,
  staticSyndication: {
    enabled: false,
    lastScanAt: null,
    lastCode: null,
  },
  channels: {
    facebook: {
      configured: false,
      paused: true,
      verifiedThisMonth: 0,
      lastCode: null,
    },
    instagram: {
      configured: false,
      paused: true,
      verifiedThisMonth: 0,
      lastCode: null,
    },
  },
} as const;

describe("daily Blog Writing Agent console", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(controlDailyBlogScheduleAction).mockResolvedValue({
      ok: false,
      message: "Synthetic control response",
    });
    vi.mocked(controlOwnedSocialChannelAction).mockResolvedValue({
      ok: false,
      message: "Synthetic social control response",
    });
    vi.mocked(prepareBlogDraftAction).mockResolvedValue({
      ok: false,
      message: "Synthetic draft response",
    });
    vi.mocked(replaceBlogDraftAction).mockResolvedValue({
      ok: false,
      message: "Synthetic replacement response",
    });
    vi.mocked(reviewBlogDraftAction).mockResolvedValue({
      ok: false,
      message: "Synthetic review response",
    });
    vi.mocked(verifyBlogPublicationAction).mockResolvedValue({
      ok: false,
      message: "Synthetic verification response",
    });
  });

  it("shows the standing-policy daily schedule and reason-bound pause control", async () => {
    render(<BlogAgentConsole configured drafts={[draft]} status={status} socialStatus={socialStatus} />);
    expect(screen.getByText("Daily editorial drafting")).toBeInTheDocument();
    expect(screen.getByText(/no per-post approval/i)).toBeInTheDocument();
    expect(screen.getByText("Facebook last result")).toBeInTheDocument();
    expect(screen.getAllByText(status.autonomousPolicyVersion)).toHaveLength(1);
    expect(screen.getAllByText(status.sourceManifestVersion)).toHaveLength(2);
    const pause = screen.getByRole("button", { name: /pause daily drafting/i });
    expect(pause).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Schedule-control reason"), {
      target: { value: "Pause while reviewed sources are refreshed." },
    });
    fireEvent.click(pause);
    await waitFor(() => expect(controlDailyBlogScheduleAction).toHaveBeenCalledWith({
      operation: "pause",
      reason: "Pause while reviewed sources are refreshed.",
    }));
  });

  it("binds publication review to the exact revision and reason", async () => {
    render(<BlogAgentConsole configured drafts={[draft]} status={status} socialStatus={socialStatus} />);
    const publish = screen.getByRole("button", { name: /publish reviewed draft/i });
    expect(publish).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Review reason"), {
      target: { value: "Every source and material claim was checked." },
    });
    fireEvent.change(screen.getByLabelText("Review outcome"), {
      target: { value: "light_edits" },
    });
    fireEvent.click(publish);
    await waitFor(() => expect(reviewBlogDraftAction).toHaveBeenCalledWith({
      id: draft.id,
      decision: "publish",
      expectedRevision: 1,
      reason: "Every source and material claim was checked.",
      qualityOutcome: "light_edits",
    }));
  });
});
