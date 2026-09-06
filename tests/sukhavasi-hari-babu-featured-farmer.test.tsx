import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FeaturedFarmerStory } from "@/features/featured-farmers/public-profile";
import {
  featuredFarmerSnapshotSchema,
  loadFeaturedFarmerPublication,
  loadFeaturedFarmerPublications,
} from "@/features/featured-farmers/queries";
import { sukhavasiHariBabuPublication } from "@/features/featured-farmers/sukhavasi-hari-babu";

describe("Sukhavasi Hari Babu Featured Farmer profile", () => {
  it("is a valid source-bound published snapshot", () => {
    expect(() =>
      featuredFarmerSnapshotSchema.parse(sukhavasiHariBabuPublication.snapshot),
    ).not.toThrow();
    expect(sukhavasiHariBabuPublication).toMatchObject({
      slug: "sukhavasi-hari-babu-natural-farming",
      publication_status: "published",
      snapshot: {
        fullName: "Sukhavasi Hari Babu",
        district: null,
        state: "Telangana",
        categorySlugs: expect.arrayContaining(["fruit-orchards", "agroforestry"]),
      },
    });
  });

  it("is registered and resolves from the curated loader", async () => {
    const publications = await loadFeaturedFarmerPublications(24);
    expect(publications.map((item) => item.slug)).toContain(
      "sukhavasi-hari-babu-natural-farming",
    );
    expect(
      await loadFeaturedFarmerPublication("sukhavasi-hari-babu-natural-farming"),
    ).toBe(sukhavasiHariBabuPublication);
  });

  it("renders the long introduction, citations and descending high-view video cards", () => {
    const { container } = render(
      <FeaturedFarmerStory
        publication={sukhavasiHariBabuPublication}
        locale="en-IN"
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Sukhavasi Hari Babu" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", {
        name: "Growing a food forest through high-density natural farming",
      }),
    ).toBeVisible();
    expect(screen.getByText(/farming knowledge should travel/i)).toBeVisible();
    expect(screen.getByText(/ICAR–NAARM identifies/i)).toBeVisible();
    expect(screen.getByText("Published 28 Aug 2026")).toBeVisible();
    expect(screen.getByText("Fact-checked 28 Aug 2026")).toBeVisible();
    expect(
      screen
        .getAllByRole("link", { name: /Natural Farming Hari Babu/i })
        .find((link) =>
          link.getAttribute("href")?.includes("@naturalfarmingharibabu-liv6281"),
        ),
    ).toHaveAttribute(
      "href",
      "https://www.youtube.com/@naturalfarmingharibabu-liv6281",
    );

    const cards = container.querySelectorAll(
      ".featured-story__coverage .featured-story__video-card",
    );
    expect(cards).toHaveLength(8);
    expect(cards[0]).toHaveAttribute(
      "href",
      "https://www.youtube.com/watch?v=rOgz9dLGQLo",
    );
    expect(cards[0]).toHaveTextContent("363,382 views observed");
    expect(cards[1]).toHaveTextContent("155,390 views observed");
    expect(cards[2]).toHaveTextContent("66,800 views observed");
    expect(cards[7]).toHaveTextContent("10,266 views observed");
    expect(
      screen.getAllByText(/Observed 28 Aug 2026; YouTube counts change over time/)
        .length,
    ).toBeGreaterThan(0);
    expect(screen.getByText(/not a FarmerBook membership record/i)).toBeVisible();
    expect(
      screen.queryByRole("button", { name: /buy|order|enquir|message/i }),
    ).not.toBeInTheDocument();
  });
});
