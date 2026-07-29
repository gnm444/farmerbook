import { z } from "zod";

export const handleSchema = z
  .string()
  .min(3, "Handle must be at least 3 characters.")
  .max(30, "Handle must be 30 characters or fewer.")
  .regex(
    /^[a-z0-9_]+$/,
    "Use only lowercase letters, numbers and underscores.",
  );

export const profileSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  handle: handleSchema,
  participantType: z.enum([
    "farmer",
    "agronomist",
    "fpo",
    "buyer",
    "trainer",
    "ngo",
  ]),
  district: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  crops: z.array(z.string().trim().min(1).max(40)).min(1).max(8),
  bio: z.string().trim().max(500).default(""),
  preferredLanguage: z.enum(["en", "hi", "mr"]).default("en"),
  experienceYears: z.number().int().min(0).max(80).optional(),
});
