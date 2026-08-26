import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/featured-farmers/engagement-actions", () => ({
  countFeaturedFarmerProfileViewAction: vi.fn(async () => ({
    ok: true,
    count: 43,
    counted: true,
  })),
  submitFeaturedFarmerQuestionAction: vi.fn(),
  submitFeaturedFarmerRecommendationAction: vi.fn(),
  withdrawFeaturedFarmerRecommendationAction: vi.fn(),
}));

import { FeaturedFarmerEngagementSection } from "@/features/featured-farmers/featured-farmer-engagement";
import type { FeaturedFarmerEngagement } from "@/features/featured-farmers/engagement-queries";

const engagement: FeaturedFarmerEngagement = {
  slug: "sandeep-dasari-avani-van-farms",
  displayName: "Sandeep Dasari / Avani Van Farms",
  publicEmail: "avanivanfarms@gmail.com",
  profileViewCount: 42,
  viewsEnabled: true,
  questionsEnabled: true,
  recommendationsEnabled: true,
  questionDeliveryReady: false,
  turnstileSiteKey: "",
  recommendations: [{
    id: "85000000-0000-4000-8000-000000000001",
    reviewerName: "Existing Customer",
    reviewerHandle: "existing_customer",
    relationshipContext: "Regular Gir-cow milk customer",
    body: "Sandeep communicates clearly about availability and explains the farm's animal-care approach with patience.",
    recommendedAt: "2026-08-25T08:00:00.000Z",
  }],
  viewer: {
    signedIn: false,
    eligibleCustomer: false,
    fullName: null,
  },
  myRecommendation: null,
};

describe("Featured Farmer engagement UI", () => {
  it("shows the farm email, approximate views and private contact fallback", () => {
    render(<FeaturedFarmerEngagementSection engagement={engagement} locale="en-IN" />);
    expect(screen.getAllByRole("link", { name: /avanivanfarms@gmail.com/i })[0]).toHaveAttribute(
      "href",
      "mailto:avanivanfarms@gmail.com",
    );
    expect(screen.getByText("42")).toBeVisible();
    expect(screen.getByText(/counted at most once per browser/i)).toBeVisible();
    expect(screen.getByRole("heading", { name: "Ask Avani Van Farms" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Email Avani Van Farms" })).toHaveAttribute(
      "href",
      "mailto:avanivanfarms@gmail.com",
    );
  });

  it("renders only moderated-style recommendation fields and the exact trust disclosure", () => {
    const { container } = render(
      <FeaturedFarmerEngagementSection engagement={engagement} locale="en-IN" />,
    );
    const section = screen
      .getByRole("heading", { name: "Customer recommendations" })
      .closest("div");
    expect(screen.getByRole("link", { name: "Existing Customer" })).toHaveAttribute(
      "href",
      "/profile/existing_customer",
    );
    expect(screen.getByText("Regular Gir-cow milk customer")).toBeVisible();
    expect(screen.getByText(/relationship self-declared/i)).toHaveTextContent(
      "not a verified FarmerBook transaction",
    );
    expect(within(section as HTMLElement).queryByText(/verified purchase/i)).not.toBeInTheDocument();
    expect(container).not.toHaveTextContent(/@farmerbook\.invalid/i);
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      expect.stringContaining("/login?next="),
    );
  });

  it("has an honest empty state without creating a rating", () => {
    render(
      <FeaturedFarmerEngagementSection
        engagement={{ ...engagement, recommendations: [] }}
        locale="en-IN"
      />,
    );
    expect(
      screen.getByText("No customer recommendations have been published yet."),
    ).toBeVisible();
    expect(screen.queryByRole("img", { name: /star/i })).not.toBeInTheDocument();
  });
});
