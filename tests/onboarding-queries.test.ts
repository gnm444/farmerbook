import { describe, expect, it } from "vitest";
import { emptyOnboardingProgress } from "@/features/onboarding/queries";
import type { FarmerProfile } from "@/lib/types";

const incompleteFarmerProfile = {
  id: "00000000-0000-4000-8000-000000000020",
  handle: "new_farmer",
  fullName: "New Farmer",
  initials: "NF",
  participantType: "farmer",
  accountRole: "farmer",
  roleLabel: "Farmer",
  preferredLocale: "mr-IN",
  categoryAffinities: [
    {
      categorySlug: "rice",
      relationship: "grows",
      isPrimary: true,
    },
  ],
  district: "Pune",
  state: "Maharashtra",
  crops: ["Rice"],
  bio: "",
  farmingMethod: "organic",
  socialLinks: {},
  reviewSummary: { average: 0, count: 0 },
  verified: false,
  followers: 0,
  following: 0,
  experienceYears: 3,
  joinedLabel: "Joined 2026",
  publicProfileEnabled: false,
} satisfies FarmerProfile;

describe("onboarding progress defaults", () => {
  it("preserves useful profile context without inheriting the legacy farmer role", () => {
    const result = emptyOnboardingProgress(incompleteFarmerProfile);

    expect(result).toMatchObject({
      flowVersion: 1,
      revision: 0,
      locale: "mr-IN",
      accountRole: null,
      currentStep: "language",
      completedSteps: [],
      selectedCategorySlugs: ["rice"],
      customCategoryLabels: [],
      companySectorSlugs: [],
      status: "not_started",
    });
    expect(result.identity).toEqual({
      fullName: "New Farmer",
      handle: "new_farmer",
      district: "Pune",
      state: "Maharashtra",
      bio: "",
    });
    expect(result.reviewVisibility).toEqual({
      profileVisibility: "members",
      termsAccepted: false,
    });
  });
});
