import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FeaturedFarmerStory } from "@/features/featured-farmers/public-profile";
import {
  featuredFarmerSnapshotSchema,
  loadFeaturedFarmerPublication,
} from "@/features/featured-farmers/queries";
import { ramanjaneyuluCsaPublication } from "@/features/featured-farmers/raman-janeyulu-csa";

describe("Ramanjaneyulu G V Featured Farmer profile", () => {
  it("is a valid attributed publication in the Agripreneurs / NGOs category", () => {
    expect(() =>
      featuredFarmerSnapshotSchema.parse(ramanjaneyuluCsaPublication.snapshot),
    ).not.toThrow();
    expect(ramanjaneyuluCsaPublication).toMatchObject({
      slug: "raman-janeyulu-csa",
      publication_status: "published",
      snapshot: {
        fullName: "Ramanjaneyulu G V",
        categorySlugs: expect.arrayContaining(["agripreneurs-ngos"]),
      },
    });
  });

  it("is registered and renders the sourced leadership story", async () => {
    await expect(
      loadFeaturedFarmerPublication("raman-janeyulu-csa"),
    ).resolves.toBe(ramanjaneyuluCsaPublication);

    render(
      <FeaturedFarmerStory
        publication={ramanjaneyuluCsaPublication}
        locale="en-IN"
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Ramanjaneyulu G V" }),
    ).toBeVisible();
    expect(screen.getAllByText("Agripreneurs / NGOs").length).toBeGreaterThan(0);
    expect(screen.getByText(/Executive Director, CSA/i)).toBeVisible();
    expect(
      screen.getByRole("img", {
        name: /Ramanjaneyulu G V standing with folded arms/i,
      }),
    ).toHaveAttribute(
      "src",
      "/images/featured-farmers/raman-janeyulu-gv.webp",
    );
    expect(
      screen
        .getAllByRole("link", { name: /public professional profile/i })
        .some((link) => link.getAttribute("href") === "https://www.linkedin.com/in/ramoo/"),
    ).toBe(true);
    expect(screen.getAllByText(/not a FarmerBook member account/i).length).toBeGreaterThan(0);
  });
});
