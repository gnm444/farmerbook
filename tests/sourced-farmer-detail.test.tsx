import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

vi.mock("@/features/sourced-farmers/actions", () => ({
  reviewSourcedFarmerProfileAction: vi.fn(),
  archiveSourcedFarmerProfileAction: vi.fn(),
}));

import { SourcedFarmerDetail } from "@/features/sourced-farmers/sourced-farmer-detail";
import type { SourcedFarmerDetail as SourcedFarmerDetailData } from "@/features/sourced-farmers/types";

const detail: SourcedFarmerDetailData = {
  profile: {
    id: "22222222-2222-4222-8222-222222222222",
    displayName: "Kiran Meadow",
    district: "Fiction District",
    state: "Example State",
    summary: "A fictional crop professional backed by fictional evidence.",
    topicSlugs: ["drip-irrigation"],
    evidenceBasis: "independent_public_source",
    evidenceUrl: "https://evidence.example.org/kiran-meadow",
    reviewState: "pending",
    lastReviewedAt: null,
    expiresAt: "2026-09-13T08:00:00.000Z",
    revision: 3,
    createdAt: "2026-08-14T08:00:00.000Z",
  },
  facts: [
    {
      id: "fact-fictional-1",
      factType: "practice",
      value: "Uses fictional drip-irrigation demonstrations",
      sourceUrl: "https://evidence.example.org/kiran-meadow/practice",
      evidenceExcerpt: "A fabricated excerpt for component testing only.",
      reviewState: "pending",
      createdAt: "2026-08-14T08:00:00.000Z",
    },
  ],
  events: [
    {
      id: "event-fictional-1",
      eventType: "profile_created",
      createdAt: "2026-08-14T08:00:00.000Z",
    },
  ],
};

describe("sourced Farmer detail", () => {
  it("shows evidence, review state, freshness, and redacted audit history", () => {
    render(<SourcedFarmerDetail detail={detail} />);

    expect(
      screen.getByText(
        "Private research · not a FarmerBook member · not verified · no contact or outreach consent.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Kiran Meadow" })).toHaveAttribute("dir", "auto");
    expect(screen.getByRole("heading", { name: "Professional facts" })).toBeInTheDocument();
    expect(screen.getByText("revision 3")).toBeInTheDocument();
    expect(screen.getByText("profile created")).toBeInTheDocument();
    const links = screen.getAllByRole("link", { name: /evidence|fact source/i });
    expect(links).toHaveLength(2);
    for (const link of links) {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noreferrer");
    }
  });

  it("offers only review and archive workflow controls", () => {
    render(<SourcedFarmerDetail detail={detail} />);

    expect(screen.getByRole("button", { name: "Record review decision" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Archive private profile" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: /contact|send|invite|verify|connect|publish|marketplace/i })).not.toBeInTheDocument();
  });
});
