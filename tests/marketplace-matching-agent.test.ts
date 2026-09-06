import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { marketplaceMatch } from "@/features/marketplace/matching-engine";
import { marketplaceDocumentsFromListings } from "@/features/marketplace/matching-retrieval";
import type { ProduceListing } from "@/lib/types";

function listing(overrides: Partial<ProduceListing> = {}): ProduceListing {
  return {
    id: "listing-tomatoes",
    sellerId: "farmer-1",
    title: "Natural red tomatoes",
    crop: "Tomatoes",
    variety: "Red local variety",
    description: "Fresh tomatoes from an active local farm listing.",
    quantity: 100,
    unit: "kg",
    minOrder: 10,
    price: 40,
    priceUnit: "kg",
    harvestStart: "Today",
    harvestEnd: "This week",
    availableUntil: "This week",
    grade: "Grade A",
    deliveryOptions: ["Local delivery"],
    deliveryRadiusKm: 50,
    certifications: [],
    status: "active",
    viewCount: 0,
    saveCount: 0,
    enquiryCount: 0,
    createdLabel: "Today",
    imageVariant: "tomato-crates",
    reviewSummary: { average: 0, count: 0 },
    seller: {
      id: "farmer-1",
      handle: "ravi_farm",
      fullName: "Ravi Farmer",
      initials: "RF",
      participantType: "farmer",
      accountRole: "farmer",
      roleLabel: "Farmer",
      preferredLocale: "en-IN",
      categoryAffinities: [],
      district: "Guntur",
      state: "Andhra Pradesh",
      crops: ["Tomatoes"],
      bio: "Grows local vegetables.",
      socialLinks: {},
      reviewSummary: { average: 0, count: 0 },
      verified: false,
      followers: 0,
      following: 0,
      joinedLabel: "Today",
      publicProfileEnabled: true,
    },
    ...overrides,
  };
}

describe("marketplace matching retrieval agent", () => {
  it("keeps public matching independent of optional review summaries", () => {
    const queries = readFileSync("features/marketplace/queries.ts", "utf8");
    expect(queries).toContain("isMissingReviewsSchema");
    expect(queries).toContain("!isMissingReviewsSchema(reviewResult.error)");
  });

  it("uses a minimal public listing/profile corpus for the API", () => {
    const retrieval = readFileSync("features/marketplace/matching-retrieval.ts", "utf8");
    const route = readFileSync("app/api/marketplace-match/route.ts", "utf8");
    expect(retrieval).toContain("loadPublicMarketplaceMatchDocuments");
    expect(retrieval).toContain('from("produce_listings")');
    expect(retrieval).toContain('from("profiles")');
    expect(retrieval).not.toContain("phone");
    expect(retrieval).not.toContain("email");
    expect(route).toContain("MARKETPLACE_DATA_UNAVAILABLE");
  });

  it("is exported and bound as a separate Cloudflare Agent", () => {
    const worker = readFileSync("worker/index.ts", "utf8");
    const vite = readFileSync("vite.config.ts", "utf8");
    const bindings = readFileSync("lib/cloudflare-bindings.ts", "utf8");
    expect(worker).toContain("MarketplaceMatchingAgent");
    expect(vite).toContain('name: "MARKETPLACE_MATCHING_AGENT"');
    expect(vite).toContain('class_name: "MarketplaceMatchingAgent"');
    expect(bindings).toContain("MARKETPLACE_MATCHING_AGENT");
  });

  it("projects only active listings with public seller profile fields", () => {
    const documents = marketplaceDocumentsFromListings([
      listing(),
      listing({ id: "paused", status: "paused" }),
      listing({ id: "no-seller", seller: undefined }),
    ]);
    expect(documents).toHaveLength(1);
    expect(documents[0]).toMatchObject({
      listingId: "listing-tomatoes",
      profileName: "Ravi Farmer",
      district: "Guntur",
      state: "Andhra Pradesh",
    });
    expect(JSON.stringify(documents[0])).not.toContain("phone");
    expect(JSON.stringify(documents[0])).not.toContain("email");
  });

  it("ranks product and location evidence and exposes its grounding caveats", () => {
    const documents = marketplaceDocumentsFromListings([listing()]);
    const result = marketplaceMatch({
      question: "I need natural tomatoes",
      deliveryLocation: "Guntur, Andhra Pradesh",
      documents,
    });
    expect(result.grounded).toBe(true);
    expect(result.matches[0]).toMatchObject({
      farmerName: "Ravi Farmer",
      confidence: "strong",
      listingHref: "/marketplace/listing-tomatoes",
    });
    expect(result.caveats.join(" ")).toMatch(/not a confirmed order|delivery promise/i);
  });

  it("does not recommend a farmer when the product is absent", () => {
    const result = marketplaceMatch({
      question: "I need saffron",
      deliveryLocation: "Guntur",
      documents: marketplaceDocumentsFromListings([listing()]),
    });
    expect(result.matches).toHaveLength(0);
    expect(result.answer).toMatch(/could not find/i);
  });
});
