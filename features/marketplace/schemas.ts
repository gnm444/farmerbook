import { z } from "zod";

const marketUnit = z.enum(["kg", "quintal", "tonne", "box"]);

export const listingSchema = z.object({
  title: z.string().trim().min(5).max(100),
  crop: z.string().trim().min(2).max(50),
  variety: z.string().trim().min(2).max(80),
  description: z.string().trim().min(20).max(1000),
  quantity: z.coerce.number().positive().max(1_000_000),
  unit: marketUnit,
  minOrder: z.coerce.number().positive().max(1_000_000),
  price: z.coerce.number().positive().max(1_000_000),
  priceUnit: marketUnit,
  harvestStart: z.string().trim().min(2).max(50),
  harvestEnd: z.string().trim().min(2).max(50),
  availableUntil: z.string().trim().min(2).max(80),
  grade: z.string().trim().min(2).max(80),
  deliveryOptions: z.array(z.string().trim().min(2).max(80)).min(1).max(5),
  deliveryRadiusKm: z.coerce.number().int().positive().max(2000).optional(),
  certifications: z.array(z.string().trim().min(2).max(80)).max(8),
});

export const enquirySchema = z.object({
  listingId: z.string().trim().min(1).max(100),
  buyerName: z.string().trim().min(2).max(80),
  businessName: z.string().trim().max(100).default(""),
  email: z.email().max(160),
  phone: z.string().trim().min(7).max(24),
  location: z.string().trim().min(2).max(120),
  quantityNeeded: z.string().trim().min(2).max(100),
  needBy: z.string().trim().min(2).max(80),
  message: z.string().trim().min(10).max(1000),
  website: z.string().trim().max(0).optional(),
});

export const listingStatusSchema = z.object({
  listingId: z.string().trim().min(1).max(100),
  status: z.enum(["active", "draft", "paused", "sold"]),
});

export const leadStatusSchema = z.object({
  enquiryId: z.string().trim().min(1).max(100),
  status: z.enum(["new", "contacted", "qualified", "won", "closed"]),
});
