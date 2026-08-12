import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PublicFarmerProfile } from "@/features/profiles/public-farmer-profile";
import { getProfile } from "@/lib/demo-data";
import { marketReviews, produceListings } from "@/lib/market-data";
import { LocaleProvider } from "@/components/locale-provider";
import englishMessages from "@/lib/i18n/messages/en-IN";

vi.mock("@/features/moderation/actions", () => ({
  createReportAction: vi.fn(),
}));

describe("PublicFarmerProfile", () => {
  const renderProfile = (element: React.ReactNode) => render(
    <LocaleProvider locale="en-IN" messages={englishMessages}>{element}</LocaleProvider>,
  );
  it("renders a safe professional identity with fallback media and produce", () => {
    const profile = getProfile("meera");
    renderProfile(
      <PublicFarmerProfile
        profile={profile}
        listings={produceListings.filter((listing) => listing.sellerId === profile.id)}
        reviews={marketReviews.filter((review) => review.sellerId === profile.id)}
      />,
    );

    expect(
      screen.getByRole("img", {
        name: "Farmer reviewing a tomato harvest in a field",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Natural farmer growing Tomato, Onion(?:,)? and Okra in Nashik/),
    ).toBeInTheDocument();
    expect(screen.getAllByText("128 followers · 74 following")).not.toHaveLength(0);
    expect(screen.getByRole("link", { name: "Connect" })).toHaveAttribute(
      "href",
      "/signup",
    );
    expect(screen.getByRole("heading", { name: "Farm story" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Current harvest" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Public farm activity" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Farming journey" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Farming focus" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "FarmerBook professional profile" })).toBeInTheDocument();
    expect(screen.getByText("@meera_kulkarni")).toBeInTheDocument();
    expect(screen.getByText(/not a government-issued identity document/i)).toBeInTheDocument();
    expect(screen.getByText("Fresh Roma tomatoes — weekly harvest")).toBeInTheDocument();
    expect(screen.queryByText(/buyer_name|phone|exact coordinates/i)).toBeNull();
  });

  it("labels fictional profile previews and keeps their marketplace links in demo", () => {
    const profile = getProfile("meera");
    renderProfile(
      <PublicFarmerProfile
        profile={{ ...profile, id: "example-farmer", handle: "example" }}
        listings={produceListings.filter((listing) => listing.sellerId === profile.id)}
        reviews={marketReviews.filter((review) => review.sellerId === profile.id)}
        isExample
      />,
    );

    expect(screen.getByRole("note")).toHaveTextContent(
      "Fictional sample information",
    );
    expect(screen.getAllByRole("link", { name: /Fresh Roma tomatoes/ })[0]).toHaveAttribute(
      "href",
      "/marketplace/demo",
    );
  });

  it("renders an honest empty state when a Farmer has no approved social links", () => {
    const profile = getProfile("meera");
    renderProfile(
      <PublicFarmerProfile
        profile={{ ...profile, socialLinks: {} }}
        listings={[]}
        reviews={[]}
      />,
    );
    expect(
      screen.getByText("No approved social links are available yet."),
    ).toBeInTheDocument();
  });
});
