import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const refresh = vi.fn();
const push = vi.fn();
const runDiscovery = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, push }),
}));

vi.mock("@/features/sourced-farmers/actions", () => ({
  runSourcedFarmerDiscoveryAction: (...args: unknown[]) => runDiscovery(...args),
  createSourcedFarmerProfileAction: vi.fn(),
}));

import { SourcedFarmerConsole } from "@/features/sourced-farmers/sourced-farmer-console";
import type { SourcedFarmerDashboard } from "@/features/sourced-farmers/types";

const dashboard: SourcedFarmerDashboard = {
  configured: true,
  summary: {
    profiles: 1,
    pendingReview: 1,
    approved: 0,
    staleSources: 0,
    completedRuns: 2,
  },
  channels: [
    {
      id: "channel-row-fictional",
      channelId: "UCfictionalVerdant",
      canonicalUrl: "https://www.youtube.com/channel/UCfictionalVerdant",
      topicSlugs: ["paddy"],
      lastRefreshedAt: "2026-08-14T08:00:00.000Z",
      refreshDueAt: "2026-09-13T08:00:00.000Z",
      state: "active",
    },
  ],
  runs: [
    {
      id: "run-fictional-1",
      state: "completed",
      pagesProcessed: 1,
      videosProcessed: 2,
      failureCode: null,
      requestedAt: "2026-08-14T08:00:00.000Z",
      completedAt: "2026-08-14T08:01:00.000Z",
    },
  ],
  profiles: [
    {
      id: "11111111-1111-4111-8111-111111111111",
      displayName: "Asha Verdant",
      district: "Sample District",
      state: "Example State",
      summary: "A fictional natural-farming professional used only in tests.",
      topicSlugs: ["natural-farming"],
      evidenceBasis: "independent_public_source",
      evidenceUrl: "https://evidence.example.org/asha-verdant",
      reviewState: "pending",
      lastReviewedAt: null,
      expiresAt: "2026-09-13T08:00:00.000Z",
      revision: 0,
      createdAt: "2026-08-14T08:00:00.000Z",
    },
  ],
  pagination: { page: 1, pageSize: 20, total: 1 },
};

describe("sourced Farmer console", () => {
  it("keeps sourced research private and separate from relationship controls", () => {
    render(
      <SourcedFarmerConsole
        dashboard={dashboard}
        youtubeConfigured
        initialFilters={{ q: "", review: "" }}
      />,
    );

    expect(
      screen.getByText(
        "Private research · not a FarmerBook member · not verified · no contact or outreach consent.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Asha Verdant")).toHaveAttribute("dir", "auto");
    expect(screen.getByText("Durable profiles").nextSibling).toHaveTextContent("1");
    expect(screen.queryByRole("button", { name: /contact|send|invite|verify|connect|publish/i })).not.toBeInTheDocument();
  });

  it("shows one bounded action result only as a transient attributed source", async () => {
    runDiscovery.mockResolvedValueOnce({
      ok: true,
      data: {
        runId: "run-fictional-2",
        savedVideoCount: 1,
        nextPageAvailable: true,
        transientSources: [
          {
            videoId: "video-fictional-1",
            videoUrl: "https://www.youtube.com/watch?v=video-fictional-1",
            title: "కల్పిత వరి పద్ధతి",
            redactedDescription: "A fictional contact-free farming description.",
            publishedAt: "2026-08-13T08:00:00.000Z",
            topicSlugs: ["paddy"],
            actorTypes: ["farmer"],
            transient: true,
          },
        ],
      },
    });
    render(
      <SourcedFarmerConsole
        dashboard={dashboard}
        youtubeConfigured
        initialFilters={{ q: "", review: "" }}
      />,
    );

    fireEvent.change(screen.getByLabelText(/approved youtube channel seed/i), {
      target: { value: "@FictionalVerdant" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Run one bounded batch" }));

    expect(await screen.findByText("కల్పిత వరి పద్ధతి")).toHaveAttribute("dir", "auto");
    const source = screen.getByRole("link", { name: /view attributed source/i });
    expect(source).toHaveAttribute("target", "_blank");
    expect(source).toHaveAttribute("rel", "noreferrer");
    await waitFor(() => expect(runDiscovery).toHaveBeenCalledWith(expect.objectContaining({
      channelSeed: "@FictionalVerdant",
    })));
  });

  it("distinguishes a filtered empty state from an empty database", () => {
    const filteredDashboard = {
      ...dashboard,
      profiles: [],
      pagination: { ...dashboard.pagination, total: 0 },
    };
    render(
      <SourcedFarmerConsole
        dashboard={filteredDashboard}
        youtubeConfigured
        initialFilters={{ q: "does-not-match", review: "" }}
      />,
    );
    expect(screen.getByText("No durable profiles match these filters.")).toBeInTheDocument();
  });
});
