import { describe, expect, it } from "vitest";
import {
  createIncSourcingRequestSchema,
  incSourcingResponseSchema,
  incVerificationSubmissionSchema,
} from "@/features/inc-sourcing/schemas";

const validRequest = {
  organizationId: "22222222-2222-4222-8222-222222222222",
  contentLocale: "hi-IN",
  productName: "Processing-grade tomatoes",
  varietyOrGrade: "Roma",
  qualityRequirements: "Traceable harvest date and clean reusable crates.",
  quantityMin: 5,
  quantityMax: 15,
  quantityUnit: "tonne",
  cadence: "weekly",
  deliveryMode: "either",
  destinationState: "Maharashtra",
  destinationDistrict: "Nashik",
  opensOn: "2099-08-01",
  closesOn: "2099-09-01",
  needBy: "2099-09-15",
  priceModel: "range",
  currency: "INR",
  priceMin: 12,
  priceMax: 18,
  priceUnit: "kg",
  paymentTerms: "Confirmed privately after quality checks.",
  requiredLicenceScope: "FSSAI",
  categorySlugs: ["tomato"],
  publicationIntent: "submit",
};

describe("Inc sourcing schemas", () => {
  it("accepts a bounded structured sourcing need", () => {
    expect(createIncSourcingRequestSchema.safeParse(validRequest).success).toBe(true);
  });

  it("rejects inverted quantities, prices, windows and business sectors as produce", () => {
    for (const input of [
      { ...validRequest, quantityMax: 4 },
      { ...validRequest, priceMax: 10 },
      { ...validRequest, closesOn: "2099-07-31" },
      { ...validRequest, categorySlugs: ["fruit-vegetable-processing"] },
    ]) {
      expect(createIncSourcingRequestSchema.safeParse(input).success).toBe(false);
    }
  });

  it("requires paired farmer quantities and prices", () => {
    expect(incSourcingResponseSchema.safeParse({
      sourcingRequestId: validRequest.organizationId,
      message: "I can supply the stated grade from the next weekly harvest.",
      quantityAvailable: 4,
      quantityUnit: "",
      availableFrom: "2099-08-15",
      indicativePrice: "",
      priceUnit: "",
      idempotencyKey: "33333333-3333-4333-8333-333333333333",
    }).success).toBe(false);
  });

  it("always asks for organization and representative verification", () => {
    expect(incVerificationSubmissionSchema.safeParse({
      organizationId: validRequest.organizationId,
      requestedClaimTypes: ["organization_registration", "authorized_representative"],
      officialDomain: "processor.example",
      applicantNote: "Please review the named claims.",
    }).success).toBe(true);
    expect(incVerificationSubmissionSchema.safeParse({
      organizationId: validRequest.organizationId,
      requestedClaimTypes: ["organization_registration"],
      applicantNote: "",
    }).success).toBe(false);
  });
});
