import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FeaturedFarmerStory } from "@/features/featured-farmers/public-profile";
import {
  featuredFarmerSnapshotSchema,
  loadFeaturedFarmerPublication,
  loadFeaturedFarmerPublications,
} from "@/features/featured-farmers/queries";
import { sravanaLakshmiPublication } from "@/features/featured-farmers/sravana-lakshmi";

describe("Sravana Lakshmi Featured Farmer profile", () => {
  it("is a source-bound published snapshot with the complete website catalogue", () => {
    expect(() =>
      featuredFarmerSnapshotSchema.parse(sravanaLakshmiPublication.snapshot),
    ).not.toThrow();
    expect(sravanaLakshmiPublication).toMatchObject({
      slug: "sravana-lakshmi-sravana-megham",
      publication_status: "published",
      snapshot: {
        fullName: "Sravana Lakshmi",
        district: "Guntur",
        state: "Andhra Pradesh",
        contactPhone: "+91 7293199999",
        whatsappUrl: "https://wa.me/917293199999",
        reportedProducts: expect.any(Array),
      },
    });
    expect(sravanaLakshmiPublication.snapshot.reportedProducts).toHaveLength(16);
  });

  it("is registered and renders the credited founder photo, detailed story and products", async () => {
    const publications = await loadFeaturedFarmerPublications(24);
    expect(publications.map((item) => item.slug)).toContain(
      "sravana-lakshmi-sravana-megham",
    );
    expect(
      await loadFeaturedFarmerPublication("sravana-lakshmi-sravana-megham"),
    ).toBe(sravanaLakshmiPublication);

    render(
      <FeaturedFarmerStory
        publication={sravanaLakshmiPublication}
        locale="en-IN"
      />,
    );

    expect(screen.getByRole("heading", { name: "Sravana Lakshmi" })).toBeVisible();
    expect(screen.getByText("Guntur · Andhra Pradesh")).toBeVisible();
    expect(
      screen
        .getByRole("img", {
          name: /Sravani, farmer and founder of Sravana Vedham/i,
        })
        .getAttribute("src"),
    ).toMatch(/sravana-lakshmi-founder\.png/);
    expect(screen.getAllByText(/bullock-powered wooden press/i).length).toBeGreaterThan(0);
    const products = document.querySelector("#reported-products");
    expect(products).not.toBeNull();
    expect(
      within(products as HTMLElement).getByRole("heading", {
        name: "Reported farm products",
      }),
    ).toBeVisible();
    expect(within(products as HTMLElement).getAllByRole("listitem")).toHaveLength(16);
    expect(within(products as HTMLElement).getByText("Sprouted Ragi Flour")).toBeVisible();
    expect(within(products as HTMLElement).getByText("Organic Jaggery")).toBeVisible();
    expect(
      within(within(products as HTMLElement).getAllByRole("listitem")[0] as HTMLElement)
        .getAllByRole("link", { name: /Palli Oil/i })[0]!
        .getAttribute("href"),
    ).toMatch(/sravanavedham\.com\/products\/palli-oil/);
    expect(screen.getByText(/not FarmerBook listings/i)).toBeVisible();
    expect(
      screen.getByRole("link", { name: /contact on whatsapp/i }),
    ).toHaveAttribute("href", "https://wa.me/917293199999");
    expect(screen.queryByRole("button", { name: /buy|order|message/i })).not.toBeInTheDocument();
  });
});
