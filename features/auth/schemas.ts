import { z } from "zod";

export const emailSchema = z
  .email("Enter a valid email address.")
  .max(254, "Email address is too long.");

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(72, "Password must be 72 characters or fewer.");

export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  acceptedTerms: z.literal("on", {
    error: "Accept the terms and community rules to continue.",
  }),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password."),
});
