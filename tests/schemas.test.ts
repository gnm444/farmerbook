import { describe, expect, it } from "vitest";
import {
  oauthProviderSchema,
  signupSchema,
} from "@/features/auth/schemas";
import { safeNextPath } from "@/features/auth/redirects";
import { relationshipSchema } from "@/features/network/schemas";
import { postSchema } from "@/features/posts/schemas";
import { profileSchema } from "@/features/profiles/schemas";
import {
  enquirySchema,
  listingSchema,
} from "@/features/marketplace/schemas";
import { reviewSchema } from "@/features/reviews/schemas";

describe("FarmerBook validation", () => {
  it("accepts a bounded farmer profile", () => {
    expect(
      profileSchema.safeParse({
        fullName: "Meera Kulkarni",
        handle: "meera_kulkarni",
        participantType: "farmer",
        accountRole: "farmer",
        farmingMethod: "natural",
        district: "Nashik",
        state: "Maharashtra",
        crops: ["Tomato"],
        bio: "Second-generation farmer.",
        preferredLanguage: "en",
        experienceYears: 8,
        socialLinks: {
          instagram: "https://instagram.com/meera",
        },
      }).success,
    ).toBe(true);
  });

  it("rejects unsafe handles and empty crop lists", () => {
    expect(
      profileSchema.safeParse({
        fullName: "Meera Kulkarni",
        handle: "Meera Kulkarni",
        participantType: "farmer",
        accountRole: "farmer",
        district: "Nashik",
        state: "Maharashtra",
        crops: [],
        bio: "",
        preferredLanguage: "en",
        socialLinks: {},
      }).success,
    ).toBe(false);
  });

  it("accepts all three marketplace segments with role-aware fields", () => {
    const base = {
      fullName: "Asha Menon",
      handle: "asha_menon",
      participantType: "buyer",
      district: "Nashik",
      state: "Maharashtra",
      bio: "",
      preferredLanguage: "en",
      socialLinks: {},
    };
    expect(
      profileSchema.safeParse({
        ...base,
        accountRole: "customer",
        crops: [],
      }).success,
    ).toBe(true);
    expect(
      profileSchema.safeParse({
        ...base,
        participantType: "fpo",
        accountRole: "wholesaler",
        crops: ["Onion"],
      }).success,
    ).toBe(true);
    expect(
      profileSchema.safeParse({
        ...base,
        participantType: "farmer",
        accountRole: "farmer",
        crops: ["Tomato"],
      }).success,
    ).toBe(false);
  });

  it("validates official HTTPS social links", () => {
    const profile = {
      fullName: "Asha Menon",
      handle: "asha_menon",
      participantType: "buyer",
      accountRole: "customer",
      district: "Nashik",
      state: "Maharashtra",
      crops: [],
      bio: "",
      preferredLanguage: "en",
      socialLinks: {
        linkedin: "https://example.com/not-linkedin",
      },
    };
    expect(profileSchema.safeParse(profile).success).toBe(false);
    expect(
      profileSchema.safeParse({
        ...profile,
        socialLinks: {
          linkedin: "https://www.linkedin.com/in/asha-menon",
        },
      }).success,
    ).toBe(true);
  });

  it("accepts supported OAuth providers and safe callback paths", () => {
    expect(oauthProviderSchema.parse("google")).toBe("google");
    expect(oauthProviderSchema.parse("facebook")).toBe("facebook");
    expect(oauthProviderSchema.safeParse("linkedin_oidc").success).toBe(false);
    expect(oauthProviderSchema.safeParse("custom:instagram").success).toBe(
      false,
    );
    expect(safeNextPath("/purchases?status=won")).toBe(
      "/purchases?status=won",
    );
    expect(safeNextPath("https://unsafe.example")).toBe("/feed");
    expect(safeNextPath("//unsafe.example")).toBe("/feed");
  });

  it("bounds completed-enquiry reviews", () => {
    expect(
      reviewSchema.safeParse({
        enquiryId: "enquiry-1",
        rating: 5,
        body: "Reliable quality and delivery communication.",
      }).success,
    ).toBe(true);
    expect(
      reviewSchema.safeParse({
        enquiryId: "enquiry-1",
        rating: 6,
        body: "Reliable quality and delivery communication.",
      }).success,
    ).toBe(false);
  });

  it("enforces the post body limit", () => {
    expect(
      postSchema.safeParse({
        body: "x".repeat(2001),
        category: "question",
      }).success,
    ).toBe(false);
  });

  it("requires terms acceptance during signup", () => {
    expect(
      signupSchema.safeParse({
        email: "farmer@example.com",
        password: "strong-password",
        acceptedTerms: false,
      }).success,
    ).toBe(false);
  });

  it("models follow state explicitly", () => {
    expect(
      relationshipSchema.parse({ profileId: "another-user", active: true }),
    ).toEqual({ profileId: "another-user", active: true });
  });

  it("accepts a complete produce listing", () => {
    expect(
      listingSchema.safeParse({
        title: "Fresh Roma tomatoes",
        crop: "Tomato",
        variety: "Roma VF",
        description:
          "Hand-sorted tomatoes packed on harvest morning for regular retail supply.",
        quantity: 500,
        unit: "kg",
        minOrder: 50,
        price: 28,
        priceUnit: "kg",
        harvestStart: "3 Aug",
        harvestEnd: "28 Aug",
        availableUntil: "28 Aug 2026",
        grade: "A grade",
        deliveryOptions: ["Farm pickup"],
        deliveryRadiusKm: 50,
        certifications: ["Verified farm"],
      }).success,
    ).toBe(true);
  });

  it("requires actionable buyer enquiry details and rejects bots", () => {
    const validEnquiry = {
      listingId: "nashik-roma-tomatoes",
      buyerName: "Asha Menon",
      businessName: "Green Basket Stores",
      email: "asha@example.com",
      phone: "+91 98765 41021",
      location: "Nashik, Maharashtra",
      quantityNeeded: "300 kg weekly",
      needBy: "5 Aug 2026",
      message: "Please confirm your weekly dispatch days and packing options.",
      website: "",
    };
    expect(enquirySchema.safeParse(validEnquiry).success).toBe(true);
    expect(
      enquirySchema.safeParse({ ...validEnquiry, website: "spam.example" })
        .success,
    ).toBe(false);
  });
});
