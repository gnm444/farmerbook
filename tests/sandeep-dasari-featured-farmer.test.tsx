import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FeaturedFarmerStory } from "@/features/featured-farmers/public-profile";
import {
  featuredFarmerSnapshotSchema,
  loadFeaturedFarmerPublication,
  loadFeaturedFarmerPublications,
} from "@/features/featured-farmers/queries";
import { sandeepDasariPublication } from "@/features/featured-farmers/sandeep-dasari";

const productNames = [
  "Desi cow milk",
  "Buffalo milk",
  "Desi chicken",
  "Desi eggs",
  "Paneer",
  "Ghee",
  "Cold-pressed oils (types not yet specified)",
  "Jaggery",
  "Mulberry",
];

describe("Sandeep Dasari Featured Farmer profile", () => {
  it("is a valid attributed published snapshot", () => {
    expect(() =>
      featuredFarmerSnapshotSchema.parse(sandeepDasariPublication.snapshot),
    ).not.toThrow();
    expect(sandeepDasariPublication).toMatchObject({
      slug: "sandeep-dasari-avani-van-farms",
      publication_revision: 3,
      publication_status: "published",
      snapshot: {
        fullName: "Sandeep Dasari",
        contactEmail: "avanivanfarms@gmail.com",
        district: "Bommalaramaram",
        state: "Telangana",
      },
    });
  });

  it("lists and resolves each curated profile once", async () => {
    const publications = await loadFeaturedFarmerPublications(24);
    expect(publications.map((item) => item.slug)).toEqual([
      "m-venkata-subbarao-surabhi-gosala",
      "sandeep-dasari-avani-van-farms",
      "narayana-reddy",
    ]);
    expect(new Set(publications.map((item) => item.slug)).size).toBe(3);
    await expect(
      loadFeaturedFarmerPublication("sandeep-dasari-avani-van-farms"),
    ).resolves.toBe(sandeepDasariPublication);
  });

  it("renders the story, owned channel and non-orderable product catalog", () => {
    const { container } = render(
      <FeaturedFarmerStory
        publication={sandeepDasariPublication}
        locale="en-IN"
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Sandeep Dasari" }),
    ).toBeVisible();
    expect(screen.getByText("Bommalaramaram · Telangana")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "avanivanfarms@gmail.com" }),
    ).toHaveAttribute("href", "mailto:avanivanfarms@gmail.com");
    expect(screen.getByText("Published 25 Aug 2026")).toBeVisible();
    expect(screen.getByText("Fact-checked 25 Aug 2026")).toBeVisible();
    expect(
      screen.getByText(
        "Non-certified organic farmer (paperwork not yet completed to prove certification).",
      ),
    ).toBeVisible();

    const products = screen
      .getByRole("heading", { name: "Reported farm products" })
      .closest("section");
    expect(products).not.toBeNull();
    for (const name of productNames) {
      expect(within(products as HTMLElement).getByText(name)).toBeVisible();
    }
    expect(
      within(products as HTMLElement).getByText(/not an order page/i),
    ).toBeVisible();

    expect(
      screen.getByRole("link", {
        name: /Watch the source video featuring Sandeep Dasari/i,
      }),
    ).toHaveAttribute("href", "https://www.youtube.com/watch?v=gP1G_HbD4EA");
    expect(
      screen.getByRole("img", {
        name: "Sandeep Dasari seated beside a Gir cow at Avani Van Farms",
      }),
    ).toHaveAttribute(
      "src",
      "https://i.ytimg.com/vi/gP1G_HbD4EA/maxresdefault.jpg",
    );
    expect(
      container.querySelector(".featured-story__hero-background img"),
    ).toHaveAttribute(
      "src",
      "https://i.ytimg.com/vi/PaJk_KSsD5I/maxresdefault.jpg",
    );
    const videoThumbnails = container.querySelectorAll(
      ".featured-story__coverage .featured-story__video-thumbnail img",
    );
    expect(videoThumbnails).toHaveLength(3);
    expect(
      [...videoThumbnails].map((image) => image.getAttribute("src")),
    ).toEqual([
      "https://i.ytimg.com/vi/PaJk_KSsD5I/maxresdefault.jpg",
      "https://i.ytimg.com/vi/gP1G_HbD4EA/maxresdefault.jpg",
      "https://i.ytimg.com/vi/nzB61ZhIc1Q/maxresdefault.jpg",
    ]);
    expect(screen.getAllByText("Gir cows").length).toBeGreaterThan(0);
    expect(container).not.toHaveTextContent(/Ongole/i);
    expect(
      screen.getAllByRole("link", { name: /youtube/i })
        .some((link) =>
          link.getAttribute("href")?.includes("@AvanivanFarms"),
        ),
    ).toBe(true);
    expect(screen.getAllByText(/Mi Andhra Adapaduchu/).length).toBeGreaterThan(0);

    expect(
      screen.queryByRole("button", { name: /buy|order|enquir|message/i }),
    ).not.toBeInTheDocument();
    expect(container.querySelector('a[href^="/store"]')).toBeNull();
    expect(container.querySelector('a[href*="marketplace"]')).toBeNull();
    expect(
      screen.queryByText(/^Certified organic farmer$/i),
    ).not.toBeInTheDocument();
  });
});
