import { z } from "zod";

export const marketplaceMatchDocumentSchema = z.object({
  listingId: z.string().trim().min(1).max(100),
  title: z.string().trim().min(5).max(100),
  crop: z.string().trim().min(2).max(50),
  variety: z.string().trim().max(80),
  description: z.string().trim().min(20).max(1000),
  quantity: z.number().positive().max(1_000_000),
  unit: z.string().trim().min(1).max(20),
  price: z.number().positive().max(1_000_000),
  priceUnit: z.string().trim().min(1).max(20),
  deliveryOptions: z.array(z.string().trim().min(2).max(80)).min(1).max(5),
  deliveryRadiusKm: z.number().int().positive().max(2000).optional(),
  profileName: z.string().trim().min(2).max(80),
  profileHandle: z.string().trim().min(3).max(30),
  district: z.string().trim().max(80),
  state: z.string().trim().max(80),
  profileCrops: z.array(z.string().trim().max(80)).max(8),
  profileBio: z.string().trim().max(500),
});

export const marketplaceMatchRequestSchema = z.object({
  question: z.string().trim().min(3).max(500),
  deliveryLocation: z.string().trim().max(120).default(""),
  documents: z.array(marketplaceMatchDocumentSchema).max(100),
});

export type MarketplaceMatchDocument = z.infer<typeof marketplaceMatchDocumentSchema>;

export type MarketplaceMatch = {
  listingId: string;
  farmerName: string;
  farmerHandle: string;
  listingTitle: string;
  crop: string;
  location: string;
  deliveryOptions: string[];
  deliveryRadiusKm?: number;
  price: number;
  priceUnit: string;
  quantity: number;
  unit: string;
  evidence: string[];
  matchedTerms: string[];
  confidence: "strong" | "possible";
  listingHref: string;
  profileHref: string;
};

export type MarketplaceMatchResponse = {
  answer: string;
  matches: MarketplaceMatch[];
  retrievalCount: number;
  grounded: true;
  caveats: string[];
};
