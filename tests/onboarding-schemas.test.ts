import { describe, expect, it } from "vitest";
import {
  agricultureStepSchema,
  identityLocationStepSchema,
  languageStepSchema,
  onboardingMutationSchema,
  reviewVisibilityStepSchema,
  roleDetailsStepSchema,
} from "@/features/onboarding/schemas";

const mutationBase = {
  flowVersion: 1,
  expectedRevision: 0,
  idempotencyKey: "00000000-0000-4000-8000-000000000001",
} as const;

const businessDetails = {
  accountRole: "agri_business",
  organization: {
    organizationName: "Konkan Farm Tools",
    organizationSlug: "konkan-farm-tools",
    organizationType: "manufacturer_brand",
    description: "We manufacture and service small agricultural implements.",
    websiteUrl: "https://example.in",
    serviceStates: ["Goa", "Maharashtra"],
    companySectorSlugs: ["tractors-power-equipment", "farm-tools-implements"],
  },
} as const;

describe("six-step onboarding schemas", () => {
  it("accepts only exact supported locale tags", () => {
    expect(languageStepSchema.parse({ locale: "hi-IN" })).toEqual({
      locale: "hi-IN",
    });
    expect(languageStepSchema.safeParse({ locale: "hi" }).success).toBe(false);
    expect(languageStepSchema.safeParse({ locale: "fr-FR" }).success).toBe(
      false,
    );
  });

  it("validates the selected mutation branch and rejects envelope tampering", () => {
    const valid = onboardingMutationSchema.parse({
      ...mutationBase,
      step: "role",
      data: { accountRole: "farmer" },
    });
    expect(valid.step).toBe("role");
    expect(valid.data).toEqual({ accountRole: "farmer" });

    expect(
      onboardingMutationSchema.safeParse({
        ...mutationBase,
        step: "role",
        data: { locale: "en-IN" },
      }).success,
    ).toBe(false);
    expect(
      onboardingMutationSchema.safeParse({
        ...mutationBase,
        flowVersion: 2,
        step: "role",
        data: { accountRole: "farmer" },
      }).success,
    ).toBe(false);
    expect(
      onboardingMutationSchema.safeParse({
        ...mutationBase,
        expectedRevision: -1,
        step: "role",
        data: { accountRole: "farmer" },
      }).success,
    ).toBe(false);
    expect(
      onboardingMutationSchema.safeParse({
        ...mutationBase,
        idempotencyKey: "not-a-uuid",
        step: "role",
        data: { accountRole: "farmer" },
      }).success,
    ).toBe(false);
  });

  it("allows only bounded identity fields and strips unsolicited sensitive data", () => {
    const parsed = identityLocationStepSchema.parse({
      fullName: "  Meera Patil  ",
      handle: "meera_patil",
      district: "  Nashik  ",
      state: "Maharashtra",
      bio: "Grape farmer",
      preciseCoordinates: "20.011,73.790",
      landDocumentNumber: "sensitive-value",
    });

    expect(parsed).toEqual({
      fullName: "Meera Patil",
      handle: "meera_patil",
      district: "Nashik",
      state: "Maharashtra",
      bio: "Grape farmer",
    });
    expect(
      identityLocationStepSchema.safeParse({
        ...parsed,
        handle: "Meera<script>",
      }).success,
    ).toBe(false);
    expect(
      identityLocationStepSchema.safeParse({
        ...parsed,
        state: "Not an Indian region",
      }).success,
    ).toBe(false);
  });

  it("accepts curated poultry, seafood and safe Indian-script activities", () => {
    expect(
      agricultureStepSchema.parse({
        selectedCategorySlugs: ["broiler-chicken", "shrimp-prawn"],
        customCategoryLabels: ["मोती पालन"],
      }),
    ).toEqual({
      selectedCategorySlugs: ["broiler-chicken", "shrimp-prawn"],
      customCategoryLabels: ["मोती पालन"],
    });
  });

  it("rejects parent groups, duplicates, contact details and advertising copy", () => {
    const invalidPayloads = [
      {
        selectedCategorySlugs: ["poultry"],
        customCategoryLabels: [],
      },
      {
        selectedCategorySlugs: ["broiler-chicken", "broiler-chicken"],
        customCategoryLabels: [],
      },
      {
        selectedCategorySlugs: [],
        customCategoryLabels: ["Call +91 98765 43210"],
      },
      {
        selectedCategorySlugs: [],
        customCategoryLabels: ["Buy now special offer"],
      },
      {
        selectedCategorySlugs: [],
        customCategoryLabels: ["Pearl farming", "  PEARL   FARMING  "],
      },
      {
        selectedCategorySlugs: [],
        customCategoryLabels: ["Tomato"],
      },
      { selectedCategorySlugs: [], customCategoryLabels: [] },
    ];

    for (const payload of invalidPayloads) {
      expect(agricultureStepSchema.safeParse(payload).success).toBe(false);
    }
  });

  it("enforces every role-specific details branch", () => {
    expect(
      roleDetailsStepSchema.safeParse({
        accountRole: "farmer",
        farmingMethod: "natural",
        experienceYears: 12,
      }).success,
    ).toBe(true);
    expect(
      roleDetailsStepSchema.safeParse({
        accountRole: "farmer",
        experienceYears: 12,
      }).success,
    ).toBe(false);
    expect(
      roleDetailsStepSchema.safeParse({
        accountRole: "customer",
      }).success,
    ).toBe(true);
    expect(
      roleDetailsStepSchema.parse({
        accountRole: "customer",
        experienceYears: 4,
        farmingMethod: "organic",
        organization: businessDetails.organization,
      }),
    ).toEqual({ accountRole: "customer", experienceYears: 4 });
    expect(
      roleDetailsStepSchema.safeParse({
        accountRole: "wholesaler",
        experienceYears: 81,
      }).success,
    ).toBe(false);
    expect(roleDetailsStepSchema.safeParse(businessDetails).success).toBe(true);
  });

  it("rejects unsafe or unsupported agricultural-company details", () => {
    expect(
      roleDetailsStepSchema.safeParse({
        ...businessDetails,
        organization: {
          ...businessDetails.organization,
          websiteUrl: "http://example.in",
        },
      }).success,
    ).toBe(false);
    expect(
      roleDetailsStepSchema.safeParse({
        ...businessDetails,
        organization: {
          ...businessDetails.organization,
          organizationSlug: "../../admin",
        },
      }).success,
    ).toBe(false);
    expect(
      roleDetailsStepSchema.safeParse({
        ...businessDetails,
        organization: {
          ...businessDetails.organization,
          serviceStates: ["Goa", "Goa"],
        },
      }).success,
    ).toBe(false);
    expect(
      roleDetailsStepSchema.safeParse({
        ...businessDetails,
        organization: {
          ...businessDetails.organization,
          companySectorSlugs: ["unsupported-sector"],
        },
      }).success,
    ).toBe(false);
  });

  it("requires affirmative legal consent at the final step", () => {
    expect(
      reviewVisibilityStepSchema.safeParse({
        profileVisibility: "members",
        termsAccepted: true,
      }).success,
    ).toBe(true);
    expect(
      reviewVisibilityStepSchema.safeParse({
        profileVisibility: "public",
        termsAccepted: false,
      }).success,
    ).toBe(false);
  });
});
