import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  FeaturedFarmerCard,
  FeaturedFarmerStory,
} from "@/features/featured-farmers/public-profile";
import type { FeaturedFarmerPublication } from "@/features/featured-farmers/queries";

const publication: FeaturedFarmerPublication = {
  publication_id: "00000000-0000-4000-8000-000000000721",
  slug: "anita-patil-water-stewardship",
  publication_revision: 1,
  fact_checked_at: "2026-08-12T04:30:00.000Z",
  published_at: "2026-08-12T05:00:00.000Z",
  snapshot: {
    fullName: "Anita Patil",
    district: "Nashik",
    state: "Maharashtra",
    locale: "mr-IN",
    headline: "Making every drop carry a harvest",
    deck: "A cited editorial story about farm-led water stewardship and knowledge sharing.",
    whyFeatured:
      "Her documented work connects practical water care with open farmer learning.",
    categorySlugs: ["grapes"],
    limitations: [
      "This story reflects cited public sources and does not claim identity verification.",
    ],
    editorialDisclosure:
      "FarmerBook editorial profile; not a member or verification claim",
    media: null,
    socialLinks: [
      {
        platform: "youtube",
        url: "https://www.youtube.com/channel/UC1234",
      },
    ],
    sources: [
      {
        id: "00000000-0000-4000-8000-000000000722",
        url: "https://example.gov.in/anita-patil",
        publisher: "Agriculture Department",
        title: "Water stewardship field record",
        publishedAt: "2026-06-10",
        sourceType: "website",
        quality: "official_record",
        association: "professional_reference",
      },
    ],
    claims: [
      {
        id: "00000000-0000-4000-8000-000000000723",
        key: "water_work",
        type: "significance",
        statement: "The field record documents water stewardship work.",
        displayLabel: "Public record",
        displayValue: "1",
        displayContext: "official source",
        sources: [
          {
            id: "00000000-0000-4000-8000-000000000722",
            url: "https://example.gov.in/anita-patil",
            publisher: "Agriculture Department",
            title: "Water stewardship field record",
            publishedAt: "2026-06-10",
          },
        ],
      },
    ],
    sections: [
      {
        kind: "work",
        heading: "The work",
        body: "The public field record describes practical water stewardship work developed around local growing conditions.",
        claimKeys: ["water_work"],
      },
      {
        kind: "impact",
        heading: "Why it matters",
        body: "The documented practice offers a grounded example of careful water use in farm decision-making.",
        claimKeys: ["water_work"],
      },
      {
        kind: "lessons",
        heading: "What others can learn",
        body: "The story shows why public agricultural knowledge is strongest when claims stay attached to their sources.",
        claimKeys: ["water_work"],
      },
    ],
    coverage: [
      {
        url: "https://www.youtube.com/watch?v=ABC123",
        publisher: "Farm Learning Channel",
        title: "A field conversation with Anita Patil",
        sourceType: "youtube",
      },
    ],
    milestones: [
      {
        year: "2001",
        title: "A documented milestone",
        description: "The public record documents the milestone.",
        sourceUrls: ["https://example.gov.in/anita-patil"],
      },
    ],
    questions: [
      {
        question: "What is the work about?",
        answer: "It is about practical water stewardship.",
        sourceUrls: ["https://example.gov.in/anita-patil"],
      },
    ],
  },
};

describe("Featured Farmer public profile", () => {
  it("renders a beautiful collection card without member or verification UI", () => {
    render(<FeaturedFarmerCard publication={publication} locale="en-IN" />);
    expect(screen.getByRole("heading", { name: "Anita Patil" })).toBeVisible();
    expect(screen.getAllByRole("link", { name: /Read the story/i })[0]).toHaveAttribute(
      "href",
      "/featured-farmers/anita-patil-water-stewardship",
    );
    expect(screen.queryByText(/verified member/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /message|buy/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText(/Original photograph pending rights clearance/i)).toBeVisible();
  });

  it("renders citations, owned social, coverage, disclosure and correction path", () => {
    render(<FeaturedFarmerStory publication={publication} locale="en-IN" />);
    expect(screen.getByText(/not a FarmerBook member account/i)).toBeVisible();
    expect(
      screen.getByRole("heading", { name: /key milestones/i }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "What is the work about?" }),
    ).toBeVisible();
    expect(
      screen.getByRole("img", {
        name: /Original photograph pending rights clearance/i,
      }),
    ).toBeVisible();
    const citation = screen.getAllByRole("link", {
      name: /Source 1: Water stewardship field record/i,
    })[0];
    expect(citation).toHaveAttribute("href", "https://example.gov.in/anita-patil");
    const socialSection = screen.getByText("Farmer-owned social accounts").closest("section");
    expect(
      within(socialSection as HTMLElement).getByRole("link", { name: /youtube/i }),
    ).toHaveAttribute("href", "https://www.youtube.com/channel/UC1234");
    expect(screen.getByRole("link", { name: "Request a correction" })).toHaveAttribute(
      "href",
      "/data-deletion",
    );
  });

  it("shows a credited source-hosted documentary preview without treating it as owned media", () => {
    const sourcePreviewPublication = structuredClone(publication);
    sourcePreviewPublication.snapshot.sourceHostedPreview = {
      assetUrl: "https://i.ytimg.com/vi/ABC123/maxresdefault.jpg",
      sourceUrl: "https://www.youtube.com/watch?v=ABC123",
      altText: "Anita Patil in the source documentary preview",
      credit: "Documentary preview © Farm Learning Channel, via YouTube",
      creditUrl: "https://www.youtube.com/@farmlearning",
      provider: "youtube_oembed",
    };

    render(
      <FeaturedFarmerStory
        publication={sourcePreviewPublication}
        locale="en-IN"
      />,
    );

    expect(
      screen.getByRole("img", {
        name: "Anita Patil in the source documentary preview",
      }),
    ).toHaveAttribute(
      "src",
      "https://i.ytimg.com/vi/ABC123/maxresdefault.jpg",
    );
    expect(
      screen.getByRole("link", {
        name: "Watch the source video featuring Anita Patil",
      }),
    ).toHaveAttribute("href", "https://www.youtube.com/watch?v=ABC123");
    expect(
      screen.getByRole("link", {
        name: /Documentary preview © Farm Learning Channel/i,
      }),
    ).toHaveAttribute("href", "https://www.youtube.com/@farmlearning");
  });
});
