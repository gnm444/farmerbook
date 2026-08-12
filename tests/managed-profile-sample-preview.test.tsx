import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/features/profile-agent/actions", () => ({
  decideManagedProfileSampleAction: vi.fn(),
}));

import { ManagedProfileSamplePreview } from "@/features/profile-agent/sample-preview";
import { LocaleProvider } from "@/components/locale-provider";
import englishMessages from "@/lib/i18n/messages/en-IN";

describe("managed profile sample preview", () => {
  it("labels the profile unverified and renders source citations", () => {
    render(
      <LocaleProvider locale="en-IN" messages={englishMessages}><ManagedProfileSamplePreview
        token="signed.private.token"
        expiresAt="2026-08-25T00:00:00.000Z"
        sample={{
          fullName: "Anita Patil",
          headline: "Grape farmer",
          state: "Maharashtra",
          bio: "A private FarmerBook profile draft.",
          categorySlugs: ["grapes"],
          farmingMethod: "natural",
          experienceYears: 12,
          socialLinks: {
            linkedin: "https://www.linkedin.com/in/anita-patil",
          },
          claims: [
            {
              field: "fullName",
              value: "Anita Patil",
              sourceUrl: "https://www.linkedin.com/in/anita-patil",
              excerpt: "Anita Patil is a grape farmer.",
              confidence: 0.9,
            },
          ],
          limitations: ["Identity remains unverified."],
        }}
      /></LocaleProvider>,
    );
    expect(screen.getByText("Not verified")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /not a live or verified profile/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Anita Patil is a grape farmer.")).toBeInTheDocument();
    expect(screen.getByText("12 years")).toBeInTheDocument();
    expect(screen.getByText("natural")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /linkedin/i })).toHaveAttribute(
      "href",
      "https://www.linkedin.com/in/anita-patil",
    );
    expect(screen.getByText("Farmer-owned social profiles")).toBeInTheDocument();
    expect(screen.getByText(/Other public pages, interviews and coverage are citations/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /approve and continue/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reject this profile/i })).toBeInTheDocument();
  });
});
