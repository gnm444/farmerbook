import { z } from "zod";
import {
  isSupportedLocale,
  type SupportedLocale,
} from "@/lib/i18n/locales";

export const handleSchema = z
  .string()
  .min(3, "Handle must be at least 3 characters.")
  .max(30, "Handle must be 30 characters or fewer.")
  .regex(
    /^[a-z0-9_]+$/,
    "Use only lowercase letters, numbers and underscores.",
  );

export const accountRoleSchema = z.enum([
  "farmer",
  "customer",
  "wholesaler",
  "agri_business",
]);

export const farmingMethodSchema = z.enum([
  "organic",
  "natural",
  "conventional",
  "mixed",
]);

const participantTypeSchema = z.enum([
  "farmer",
  "agronomist",
  "fpo",
  "buyer",
  "trainer",
  "ngo",
  "agri_business",
]);

function optionalSocialUrl(hostnames?: string[]) {
  return z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === ""
        ? undefined
        : value,
    z
      .string()
      .trim()
      .url("Enter a complete https:// URL.")
      .max(300)
      .refine((value) => new URL(value).protocol === "https:", {
        message: "Social links must use https://.",
      })
      .refine(
        (value) => {
          if (!hostnames?.length) return true;
          const hostname = new URL(value).hostname.toLowerCase();
          return hostnames.some(
            (allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`),
          );
        },
        { message: "Use the official social-network URL." },
      )
      .optional(),
  );
}

export const socialLinksSchema = z.object({
  website: optionalSocialUrl(),
  linkedin: optionalSocialUrl(["linkedin.com"]),
  instagram: optionalSocialUrl(["instagram.com"]),
  facebook: optionalSocialUrl(["facebook.com", "fb.com"]),
  youtube: optionalSocialUrl(["youtube.com", "youtu.be"]),
});

export const profileSchema = z
  .object({
    fullName: z.string().trim().min(2).max(80),
    handle: handleSchema,
    participantType: participantTypeSchema.default("farmer"),
    accountRole: accountRoleSchema.default("farmer"),
    district: z.string().trim().min(2).max(80),
    state: z.string().trim().min(2).max(80),
    crops: z.array(z.string().trim().min(1).max(40)).max(8).default([]),
    bio: z.string().trim().max(500).default(""),
    preferredLanguage: z.enum(["en", "hi", "mr"]).optional(),
    preferredLocale: z
      .custom<SupportedLocale>(isSupportedLocale, "Choose a supported language.")
      .optional(),
    experienceYears: z.number().int().min(0).max(80).optional(),
    farmingMethod: farmingMethodSchema.optional(),
    socialLinks: socialLinksSchema.default({}),
    termsAccepted: z.boolean().optional(),
  })
  .superRefine((data, context) => {
    if (data.accountRole === "farmer") {
      if (!data.farmingMethod) {
        context.addIssue({
          code: "custom",
          path: ["farmingMethod"],
          message: "Choose a farming method.",
        });
      }
      if (!data.crops.length) {
        context.addIssue({
          code: "custom",
          path: ["crops"],
          message: "Choose at least one crop.",
        });
      }
    }

    if (data.accountRole === "wholesaler" && !data.crops.length) {
      context.addIssue({
        code: "custom",
        path: ["crops"],
        message: "Choose at least one produce category.",
      });
    }

    if (data.accountRole !== "farmer" && data.farmingMethod) {
      context.addIssue({
        code: "custom",
        path: ["farmingMethod"],
        message: "Farming method applies only to Farmer accounts.",
      });
    }
  });
