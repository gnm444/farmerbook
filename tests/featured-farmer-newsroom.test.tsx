import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/features/featured-farmers/actions", () => ({
  createFeaturedFarmerResearchAction: vi.fn(),
}));

import { FeaturedFarmerNewsroom } from "@/features/featured-farmers/newsroom-console";

describe("Featured Farmer newsroom", () => {
  it("starts from public significance without relationship or invitation claims", () => {
    render(<FeaturedFarmerNewsroom available researches={[]} />);
    expect(
      screen.getByRole("heading", { name: "Start with a reason to feature" }),
    ).toBeVisible();
    expect(screen.getByLabelText(/Why might this work be significant/i)).toBeRequired();
    expect(screen.getByRole("button", { name: /Create research desk/i })).toBeEnabled();
    expect(screen.queryByText(/personally known/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/relationship attestation/i)).not.toBeInTheDocument();
  });
});
