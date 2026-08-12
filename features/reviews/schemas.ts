import { z } from "zod";

export const reviewSchema = z.object({
  enquiryId: z.string().trim().min(1).max(100),
  rating: z.coerce.number().int().min(1).max(5),
  body: z.string().trim().min(10).max(1000),
});

export const reviewUpdateSchema = z.object({
  reviewId: z.string().trim().min(1).max(100),
  rating: z.coerce.number().int().min(1).max(5),
  body: z.string().trim().min(10).max(1000),
});

export const reviewIdSchema = z.string().trim().min(1).max(100);
