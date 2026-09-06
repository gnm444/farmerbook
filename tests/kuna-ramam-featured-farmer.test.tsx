import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FeaturedFarmerStory } from "@/features/featured-farmers/public-profile";
import {
  featuredFarmerSnapshotSchema,
  loadFeaturedFarmerPublication,
  loadFeaturedFarmerPublications,
} from "@/features/featured-farmers/queries";
import { kunaRamamPublication } from "@/features/featured-farmers/kuna-ramam";

describe("Kuna Ramam Featured Farmer profile", () => {
  it("is a valid source-attributed English snapshot", () => {
    expect(() =>
      featuredFarmerSnapshotSchema.parse(kunaRamamPublication.snapshot),
    ).not.toThrow();
    expect(kunaRamamPublication).toMatchObject({
      slug: "kuna-ramam-srikakulam-organic-farming",
      publication_status: "published",
      snapshot: {
        fullName: "Kuna Ramam",
        district: "Srikakulam",
        state: "Andhra Pradesh",
        locale: "en-IN",
      },
    });
  });

  it("is registered in the curated loader", async () => {
    expect(
      (await loadFeaturedFarmerPublications(24)).map((item) => item.slug),
    ).toContain("kuna-ramam-srikakulam-organic-farming");
    expect(
      await loadFeaturedFarmerPublication("kuna-ramam-srikakulam-organic-farming"),
    ).toBe(kunaRamamPublication);
  });

  it("renders the translated story, source credit and video coverage", () => {
    render(<FeaturedFarmerStory publication={kunaRamamPublication} locale="en-IN" />);

    expect(screen.getByRole("heading", { name: "Kuna Ramam" })).toBeVisible();
    expect(
      screen.getByRole("heading", {
        name: "A future-focused organic farm in Srikakulam",
      }),
    ).toBeVisible();
    expect(screen.getByText(/The supplied video is a Telugu feature/i)).toBeVisible();
    expect(screen.getAllByText(/future generations/i).at(0)).toBeVisible();
    expect(screen.getByText("Published 1 Sept 2026")).toBeVisible();
    expect(screen.getByText("Fact-checked 1 Sept 2026")).toBeVisible();
    expect(
      screen.getByRole("img", {
        name: "Kuna Ramam standing among tall crops on his farm in Srikakulam",
      }),
    ).toHaveAttribute("src", "/images/featured-farmers/kuna-ramam-profile.png");
    expect(
      screen.getByRole("img", {
        name: "Kuna Ramam working among tall crops on his farm in Srikakulam",
      }),
    ).toHaveAttribute("src", "/images/featured-farmers/kuna-ramam-farm.jpg");
    expect(
      screen.getByRole("img", {
        name: "Kuna Ramam tending the crop among tall field plants",
      }),
    ).toHaveAttribute("src", "/images/featured-farmers/kuna-ramam-working-square.jpg");
    expect(
      screen.getByRole("img", {
        name: "Kuna Ramam working beside a tall crop stand",
      }),
    ).toHaveAttribute("src", "/images/featured-farmers/kuna-ramam-working-field.jpg");
    expect(screen.getByText(/4 January 2025, 09:06:43/i)).toBeVisible();
    expect(screen.getByText(/4 January 2025, 09:06:31/i)).toBeVisible();
    expect(
      screen.getByRole("link", {
        name: /Organic farming in Srikakulam — source video thumbnail/i,
      }),
    ).toHaveAttribute("href", "https://www.youtube.com/watch?v=M_rXzW84s40");
    expect(screen.getByText("Photo supplied for the FarmerBook profile")).toBeVisible();
    expect(
      screen
        .getAllByRole("link", {
          name: /Source 1: .*Organic farming in Srikakulam/i,
        })
        .at(0),
    ).toHaveAttribute("href", "https://www.youtube.com/watch?v=M_rXzW84s40");
    expect(screen.getAllByText(/not a FarmerBook member account/i).at(0)).toBeVisible();
    expect(
      screen.queryByRole("button", { name: /buy|order|enquir|message/i }),
    ).not.toBeInTheDocument();
  });
});
