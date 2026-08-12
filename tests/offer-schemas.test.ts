import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createOfferSchema,
  offerEnquirySchema,
  requiresOfferModerationReview,
} from "@/features/offers/schemas";
import { isOfferModerationEligibleForPublic } from "@/features/offers/policies";

const baseOffer = {
  organizationId: "2cb71437-cdf0-4551-a853-2617c8e76cc2",
  kind: "rental" as const,
  contentLocale: "en-IN" as const,
  title: "45 HP tractor with operator",
  description:
    "Tractor rental with a trained operator for tillage and seed-bed preparation.",
  terms: "Fuel and transport are confirmed before scheduling.",
  categorySlugs: ["tractors-power-equipment"],
  serviceAreas: [{ state: "Maharashtra", district: "Nashik" }],
  validFrom: "2026-08-10",
  validUntil: "2026-12-31",
  publicationIntent: "submit" as const,
};

describe("offer schemas", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-09T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("accepts fixed INR prices with a real unit and ISO validity", () => {
    const result = createOfferSchema.parse({
      ...baseOffer,
      priceModel: "fixed",
      currency: "INR",
      priceMin: 1_500,
      priceUnit: "hour",
    });

    expect(result.priceModel).toBe("fixed");
    expect(result.priceMin).toBe(1_500);
    expect(result.priceUnit).toBe("hour");
  });

  it("rejects inverted price ranges and validity windows", () => {
    expect(
      createOfferSchema.safeParse({
        ...baseOffer,
        priceModel: "range",
        currency: "INR",
        priceMin: 5_000,
        priceMax: 2_000,
        priceUnit: "day",
      }).success,
    ).toBe(false);
    expect(
      createOfferSchema.safeParse({
        ...baseOffer,
        validFrom: "2026-12-31",
        validUntil: "2026-08-10",
        priceModel: "free",
      }).success,
    ).toBe(false);
    expect(
      createOfferSchema.safeParse({
        ...baseOffer,
        validUntil: "2032-01-01",
        priceModel: "free",
      }).success,
    ).toBe(false);
  });

  it("rejects duplicate service areas before calling the database", () => {
    expect(
      createOfferSchema.safeParse({
        ...baseOffer,
        serviceAreas: [
          { state: "Maharashtra", district: "Nashik" },
          { state: "maharashtra", district: "nashik" },
        ],
        priceModel: "free",
      }).success,
    ).toBe(false);
  });

  it("does not accept monetary values for free or quote-only offers", () => {
    expect(
      createOfferSchema.safeParse({
        ...baseOffer,
        priceModel: "quote",
        currency: "INR",
        priceMin: 400,
        priceUnit: "service",
      }).success,
    ).toBe(false);
    expect(
      createOfferSchema.safeParse({
        ...baseOffer,
        priceModel: "free",
        priceMin: 1,
      }).success,
    ).toBe(false);
  });

  it("recognizes regulated offer kinds and category sectors", () => {
    expect(
      requiresOfferModerationReview({
        kind: "finance",
        categorySlugs: ["tractors-power-equipment"],
      }),
    ).toBe(true);
    expect(
      requiresOfferModerationReview({
        kind: "service",
        categorySlugs: ["veterinary-animal-health"],
      }),
    ).toBe(true);
    expect(
      requiresOfferModerationReview({
        kind: "rental",
        categorySlugs: ["tractors-power-equipment"],
      }),
    ).toBe(false);
  });

  it("keeps every high-risk offer private until moderation is approved", () => {
    expect(
      isOfferModerationEligibleForPublic({
        requiresModerationReview: true,
        moderationState: "not_required",
      }),
    ).toBe(false);
    expect(
      isOfferModerationEligibleForPublic({
        requiresModerationReview: true,
        moderationState: "pending",
      }),
    ).toBe(false);
    expect(
      isOfferModerationEligibleForPublic({
        requiresModerationReview: true,
        moderationState: "approved",
      }),
    ).toBe(true);
  });

  it("requires a supported locale and signed-in enquiry idempotency key", () => {
    expect(
      createOfferSchema.safeParse({
        ...baseOffer,
        contentLocale: "fr-FR",
        priceModel: "free",
      }).success,
    ).toBe(false);
    expect(
      offerEnquirySchema.safeParse({
        offerId: "c8740ef9-6613-4645-82cc-f8135fa90054",
        message: "Please confirm availability for our village group.",
        idempotencyKey: "not-a-uuid",
      }).success,
    ).toBe(false);
    expect(
      offerEnquirySchema.safeParse({
        offerId: "c8740ef9-6613-4645-82cc-f8135fa90054",
        message: "Please confirm availability for our village group.",
        idempotencyKey: "30da4c28-c8a8-46e7-823c-a5f3e936eaaf",
      }).success,
    ).toBe(true);
  });
});
