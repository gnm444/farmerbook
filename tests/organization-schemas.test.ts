import { describe, expect, it } from "vitest";
import {
  createOrganizationSchema,
  organizationPublicationSchema,
  organizationSlugSchema,
  updateOrganizationSchema,
} from "@/features/organizations/schemas";

const validOrganization = {
  slug: "sahyadri-farm-tools",
  displayName: "Sahyadri Farm Tools",
  organizationType: "dealer_distributor" as const,
  description:
    "Farm implements, spare parts and repair support for growers in Maharashtra.",
  state: "Maharashtra",
  district: "Pune",
  websiteUrl: "https://tools.example.test",
  sectorSlugs: ["farm-tools-implements", "equipment-rental-custom-hiring"],
  serviceAreas: [
    { state: "Maharashtra", district: "Pune", serviceRadiusKm: 180 },
  ],
};

describe("organization schemas", () => {
  it("accepts a bounded canonical company profile", () => {
    expect(createOrganizationSchema.parse(validOrganization)).toEqual(
      validOrganization,
    );
  });

  it.each([
    "Sahyadri Tools",
    "sahyadri_tools",
    "-sahyadri-tools",
    "sahyadri--tools",
  ])("rejects unstable organization slug %s", (slug) => {
    expect(organizationSlugSchema.safeParse(slug).success).toBe(false);
  });

  it("rejects unknown or duplicate sectors and duplicate service areas", () => {
    expect(
      createOrganizationSchema.safeParse({
        ...validOrganization,
        sectorSlugs: ["not-a-real-sector"],
      }).success,
    ).toBe(false);
    expect(
      createOrganizationSchema.safeParse({
        ...validOrganization,
        sectorSlugs: ["farm-tools-implements", "farm-tools-implements"],
      }).success,
    ).toBe(false);
    expect(
      createOrganizationSchema.safeParse({
        ...validOrganization,
        serviceAreas: [
          { state: "Maharashtra", district: "Pune" },
          { state: "maharashtra", district: "pune" },
        ],
      }).success,
    ).toBe(false);
  });

  it("requires HTTPS and optimistic-concurrency metadata for updates", () => {
    expect(
      createOrganizationSchema.safeParse({
        ...validOrganization,
        websiteUrl: "http://tools.example.test",
      }).success,
    ).toBe(false);
    expect(
      updateOrganizationSchema.safeParse({
        ...validOrganization,
        organizationId: "2cb71437-cdf0-4551-a853-2617c8e76cc2",
      }).success,
    ).toBe(false);
    expect(
      updateOrganizationSchema.safeParse({
        ...validOrganization,
        organizationId: "2cb71437-cdf0-4551-a853-2617c8e76cc2",
        expectedUpdatedAt: "2026-08-09T04:30:00+05:30",
      }).success,
    ).toBe(true);
  });

  it("accepts only public visibility states with optimistic concurrency", () => {
    expect(
      organizationPublicationSchema.safeParse({
        organizationId: "2cb71437-cdf0-4551-a853-2617c8e76cc2",
        publicationState: "published",
        expectedUpdatedAt: "2026-08-09T04:30:00+05:30",
      }).success,
    ).toBe(true);
    expect(
      organizationPublicationSchema.safeParse({
        organizationId: "2cb71437-cdf0-4551-a853-2617c8e76cc2",
        publicationState: "draft",
        expectedUpdatedAt: "2026-08-09T04:30:00+05:30",
      }).success,
    ).toBe(false);
  });
});
