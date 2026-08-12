import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OfferCard } from "@/features/offers/offer-card";
import type { BusinessOffer } from "@/features/offers/types";
import { OrganizationCard } from "@/features/organizations/organization-card";
import type { OrganizationSummary } from "@/features/organizations/types";
import { LocaleProvider } from "@/components/locale-provider";
import englishMessages from "@/lib/i18n/messages/en-IN";

const organization: OrganizationSummary = {
  id: "2cb71437-cdf0-4551-a853-2617c8e76cc2",
  slug: "sahyadri-farm-tools",
  displayName: "Sahyadri Farm Tools",
  organizationType: "dealer_distributor",
  description:
    "Farm implements, spare parts and repair support for growers in Maharashtra.",
  state: "Maharashtra",
  district: "Pune",
  sectorSlugs: ["farm-tools-implements"],
  serviceAreas: [{ state: "Maharashtra", district: "Pune" }],
  publicationState: "published",
  verificationState: "unverified",
  moderationState: "active",
  createdAt: "2026-08-09T00:00:00Z",
  updatedAt: "2026-08-09T00:00:00Z",
};

const offer: BusinessOffer = {
  id: "c8740ef9-6613-4645-82cc-f8135fa90054",
  organizationId: organization.id,
  kind: "rental",
  contentLocale: "en-IN",
  title: "45 HP tractor with operator",
  description:
    "Tractor rental with a trained operator for tillage and seed-bed preparation.",
  terms: "Fuel and transport are confirmed before scheduling.",
  categorySlugs: ["tractors-power-equipment"],
  serviceAreas: [{ state: "Maharashtra", district: "Nashik" }],
  validFrom: "2026-08-10",
  validUntil: "2026-12-31",
  price: { model: "fixed", currency: "INR", amount: 1_500, unit: "hour" },
  publicationState: "published",
  moderationState: "not_required",
  requiresModerationReview: false,
  availabilityState: "active",
  createdAt: "2026-08-09T00:00:00Z",
  updatedAt: "2026-08-09T00:00:00Z",
  organization,
};

function withLocale(node: React.ReactNode) {
  return <LocaleProvider locale="en-IN" messages={englishMessages}>{node}</LocaleProvider>;
}

describe("organization and offer cards", () => {
  it("labels an unverified provider as self-declared", () => {
    render(withLocale(<OrganizationCard organization={organization} />));

    expect(screen.getByText("Self-declared Inc")).toBeVisible();
    expect(screen.queryByText("Verified Inc")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Sahyadri Farm Tools" }),
    ).toHaveAttribute("href", "/companies/sahyadri-farm-tools");
  });

  it("shows the durable price and enquiry-oriented detail link without checkout", () => {
    render(withLocale(<OfferCard offer={offer} />));

    expect(screen.getByText("₹1,500 per hour")).toBeVisible();
    expect(screen.getByText(/Self-declared Inc/)).toBeVisible();
    expect(screen.getByRole("link", { name: "View offer" })).toHaveAttribute(
      "href",
      `/offers/${offer.id}`,
    );
    expect(screen.queryByRole("button", { name: /buy|pay|checkout/i })).not.toBeInTheDocument();
  });

  it("does not link a dashboard draft to a public detail route", () => {
    render(withLocale(
      <OfferCard
        offer={{ ...offer, publicationState: "draft" }}
        publiclyAccessible={false}
      />,
    ));

    expect(screen.queryByRole("link", { name: "View offer" })).not.toBeInTheDocument();
    expect(
      screen.getByText("This draft offer is not available on the public route."),
    ).toBeVisible();
  });
});
