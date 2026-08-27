import { z } from "zod";

const noteSchema = z
  .string()
  .trim()
  .min(2)
  .max(500)
  .refine(
    (value) => !/[\u0000-\u001f\u007f]/u.test(value),
    "Use plain text without control characters.",
  );

export const featuredFarmerLinkableProfileSchema = z.object({
  profile_id: z.uuid(),
  handle: z.string().min(3).max(30),
  full_name: z.string().min(2).max(80),
  account_role: z.string(),
  onboarding_complete: z.boolean(),
  status: z.string(),
  public_profile_enabled: z.boolean(),
});

export const featuredFarmerPublicAccountSchema = z.object({
  handle: z.string().min(3).max(30),
  full_name: z.string().min(2).max(80),
});

export const featuredFarmerAccountLinkSchema = z.strictObject({
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).min(3).max(120),
  profileId: z.uuid(),
  note: noteSchema,
});

export const featuredFarmerAccountUnlinkSchema = z.strictObject({
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).min(3).max(120),
  note: noteSchema,
});

export type FeaturedFarmerLinkableProfile = z.infer<
  typeof featuredFarmerLinkableProfileSchema
>;
export type FeaturedFarmerPublicAccount = z.infer<
  typeof featuredFarmerPublicAccountSchema
>;
