import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FeaturedFarmerStory } from "@/features/featured-farmers/public-profile";
import {
  featuredFarmerSnapshotSchema,
  loadFeaturedFarmerPublication,
  loadFeaturedFarmerPublications,
} from "@/features/featured-farmers/queries";
import { mVenkataSubbaraoPublication } from "@/features/featured-farmers/m-venkata-subbarao";

describe("M. Venkata Subbarao Featured Farmer profile", () => {
  it("is a valid attributed published profile that protects private contact details", () => {
    expect(() =>
      featuredFarmerSnapshotSchema.parse(mVenkataSubbaraoPublication.snapshot),
    ).not.toThrow();
    expect(mVenkataSubbaraoPublication).toMatchObject({
      slug: "m-venkata-subbarao-surabhi-gosala",
      publication_status: "published",
      snapshot: {
        fullName: "M. Venkata Subbarao",
        district: "Eluru",
        state: "Andhra Pradesh",
      },
    });
    expect(JSON.stringify(mVenkataSubbaraoPublication)).not.toContain(
      "9490168191",
    );
  });

  it("lists and resolves the curated preview", async () => {
    const publications = await loadFeaturedFarmerPublications(24);
    expect(publications.map((item) => item.slug)).toContain(
      "m-venkata-subbarao-surabhi-gosala",
    );
    await expect(
      loadFeaturedFarmerPublication("m-venkata-subbarao-surabhi-gosala"),
    ).resolves.toBe(mVenkataSubbaraoPublication);
  });

  it("renders reported crops without an order path or certification claim", () => {
    const { container } = render(
      <FeaturedFarmerStory
        publication={mVenkataSubbaraoPublication}
        locale="en-IN"
      />,
    );

    expect(
      screen.getByRole("heading", { name: "M. Venkata Subbarao" }),
    ).toBeVisible();
    expect(screen.getByText("Eluru · Andhra Pradesh")).toBeVisible();
    expect(screen.getByText("Published 27 Aug 2026")).toBeVisible();
    expect(
      screen.getByRole("heading", {
        name: "తెలుగు పత్రికా కథనంలో సురభి గోశాల",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", {
        name: "English reading of the Telugu Rythunestham feature",
      }),
    ).toBeVisible();
    expect(screen.getByText("Pages 53–55")).toBeVisible();
    expect(
      screen.getByRole("img", {
        name: "Permitted Telugu Rythunestham magazine clipping featuring Surabhi Gosala",
      }),
    ).toHaveAttribute(
      "src",
      "https://farmerbook.in/images/featured-farmers/venkata-subbarao-rythunestham-page-55.jpg",
    );
    expect(
      screen.getAllByRole("img", {
        name: /Permitted Telugu Rythunestham magazine pages/i,
      }),
    ).toHaveLength(3);

    const products = screen
      .getByRole("heading", { name: "Reported farm products" })
      .closest("section");
    expect(products).not.toBeNull();
    for (const name of ["Coconut", "Mango", "Paddy", "Plantain"]) {
      expect(within(products as HTMLElement).getByText(name)).toBeVisible();
    }
    expect(
      within(products as HTMLElement).getByText(/not an order page/i),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: /buy|order|enquir|message/i }),
    ).not.toBeInTheDocument();
    expect(container.querySelector('a[href^="/store"]')).toBeNull();
    expect(container).not.toHaveTextContent(/certified organic/i);
  });
});
