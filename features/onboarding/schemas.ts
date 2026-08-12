import { z } from "zod";
import {
  AGRICULTURE_CATEGORIES,
  agricultureCategoryBySlug,
} from "@/lib/agriculture/categories";
import { agricultureCompanySectorBySlug } from "@/lib/agriculture/company-sectors";
import {
  categoryLabelKey,
  validateCustomCategoryLabel,
} from "@/lib/agriculture/normalization";
import {
  isSupportedLocale,
  type SupportedLocale,
} from "@/lib/i18n/locales";
import { isIndiaStateOrUnionTerritory } from "@/lib/india/regions";
import { handleSchema } from "@/features/profiles/schemas";
import {
  ECOSYSTEM_ACCOUNT_ROLES,
  ONBOARDING_FLOW_VERSION,
  ONBOARDING_STEPS,
} from "./types";

const unique = <T>(values: T[]) => new Set(values).size === values.length;

export const onboardingStepSchema = z.enum(ONBOARDING_STEPS);
export const ecosystemAccountRoleSchema = z.enum(ECOSYSTEM_ACCOUNT_ROLES);

export const languageStepSchema = z.object({
  locale: z.custom<SupportedLocale>(isSupportedLocale, "Choose a supported language."),
});

export const roleStepSchema = z.object({ accountRole: ecosystemAccountRoleSchema });

export const identityLocationStepSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name.").max(80),
  handle: handleSchema,
  district: z.string().trim().min(2, "Enter your district.").max(80),
  state: z
    .string()
    .refine(isIndiaStateOrUnionTerritory, "Choose an Indian state or union territory."),
  bio: z.string().trim().max(500).default(""),
});

export const agricultureStepSchema = z.object({
  selectedCategorySlugs: z
    .array(
      z.string().refine(
        (slug) => agricultureCategoryBySlug(slug)?.selectable === true,
        "Choose a supported agriculture category.",
      ),
    )
    .max(20)
    .refine(unique, "Choose each agriculture category once."),
  customCategoryLabels: z
    .array(
      z.string().superRefine((label, context) => {
        const result = validateCustomCategoryLabel(label);
        if (!result.ok) {
          context.addIssue({
            code: "custom",
            message: "Enter a safe agriculture activity without contact or advertising text.",
          });
        }
      }),
    )
    .max(3)
    .refine(
      (labels) => unique(labels.map(categoryLabelKey)),
      "Enter each custom agriculture activity once.",
    )
    .refine(
      (labels) =>
        labels.every(
          (label) =>
            !AGRICULTURE_CATEGORIES.some(
              (category) => categoryLabelKey(category.name) === categoryLabelKey(label),
            ),
        ),
      "Choose matching activities from the curated list.",
    ),
}).refine(
  (data) => data.selectedCategorySlugs.length + data.customCategoryLabels.length > 0,
  { message: "Choose or define at least one agriculture activity." },
);

const optionalHttpsUrl = z
  .union([
    z.literal(""),
    z
      .url("Enter a valid website URL.")
      .max(300)
      .refine((value) => value.startsWith("https://"), "Use an HTTPS website URL."),
  ])
  .transform((value) => value || undefined)
  .optional();

const commonRoleDetails = {
  experienceYears: z.coerce.number().int().min(0).max(80).optional(),
};

export const roleDetailsStepSchema = z.discriminatedUnion("accountRole", [
  z.object({
    accountRole: z.literal("farmer"),
    farmingMethod: z.enum(["organic", "natural", "conventional", "mixed"]),
    experienceYears: z.coerce.number().int().min(0).max(80),
  }),
  z.object({
    accountRole: z.literal("customer"),
    ...commonRoleDetails,
  }),
  z.object({
    accountRole: z.literal("wholesaler"),
    ...commonRoleDetails,
  }),
  z.object({
    accountRole: z.literal("agri_business"),
    organization: z.object({
      organizationName: z.string().trim().min(2).max(120),
      organizationSlug: z
        .string()
        .trim()
        .min(3)
        .max(80)
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens."),
      organizationType: z.enum([
        "manufacturer_brand",
        "dealer_distributor",
        "retailer",
        "wholesaler_trader",
        "processor_exporter",
        "fpo_cooperative",
        "custom_hiring_rental_centre",
        "logistics_warehouse",
        "finance_insurance",
        "advisory_training_research",
        "ngo",
        "government_support_body",
      ]),
      description: z.string().trim().min(20).max(1_500),
      websiteUrl: optionalHttpsUrl,
      serviceStates: z
        .array(z.string().refine(isIndiaStateOrUnionTerritory))
        .min(1)
        .max(36)
        .refine(unique),
      companySectorSlugs: z
        .array(
          z.string().refine(
            (slug) => Boolean(agricultureCompanySectorBySlug(slug)),
            "Choose a supported company sector.",
          ),
        )
        .min(1)
        .max(12)
        .refine(unique),
    }),
  }),
]);

export const reviewVisibilityStepSchema = z.object({
  profileVisibility: z.enum(["members", "public"]),
  termsAccepted: z.literal(true, "Accept the terms, privacy notice and community rules."),
});

type OnboardingMutationBase<Step extends string, Data> = {
  flowVersion: typeof ONBOARDING_FLOW_VERSION;
  expectedRevision: number;
  idempotencyKey: string;
  step: Step;
  data: Data;
};

export type ValidOnboardingMutation =
  | OnboardingMutationBase<"language", z.infer<typeof languageStepSchema>>
  | OnboardingMutationBase<"role", z.infer<typeof roleStepSchema>>
  | OnboardingMutationBase<"identity_location", z.infer<typeof identityLocationStepSchema>>
  | OnboardingMutationBase<"agriculture", z.infer<typeof agricultureStepSchema>>
  | OnboardingMutationBase<"role_details", z.infer<typeof roleDetailsStepSchema>>
  | OnboardingMutationBase<"review_visibility", z.infer<typeof reviewVisibilityStepSchema>>;

export const onboardingMutationSchema = z
  .object({
    flowVersion: z.literal(ONBOARDING_FLOW_VERSION),
    expectedRevision: z.number().int().min(0),
    idempotencyKey: z.uuid(),
    step: onboardingStepSchema,
    data: z.unknown(),
  })
  .transform<ValidOnboardingMutation>((request, context) => {
    const schema = {
      language: languageStepSchema,
      role: roleStepSchema,
      identity_location: identityLocationStepSchema,
      agriculture: agricultureStepSchema,
      role_details: roleDetailsStepSchema,
      review_visibility: reviewVisibilityStepSchema,
    }[request.step];
    const result = schema.safeParse(request.data);
    if (!result.success) {
      for (const issue of result.error.issues) {
        context.addIssue({ ...issue, path: ["data", ...issue.path] });
      }
      return z.NEVER;
    }
    return { ...request, data: result.data } as ValidOnboardingMutation;
  });

export const finalizeOnboardingSchema = z.object({
  expectedRevision: z.number().int().min(0),
  idempotencyKey: z.uuid(),
});

export const onboardingDraftDataSchema = z.object({
  locale: languageStepSchema.shape.locale.optional(),
  accountRole: ecosystemAccountRoleSchema.nullable().optional(),
  identity: identityLocationStepSchema.optional(),
  selectedCategorySlugs:
    agricultureStepSchema.shape.selectedCategorySlugs.optional(),
  customCategoryLabels:
    agricultureStepSchema.shape.customCategoryLabels.optional(),
  companySectorSlugs: z
    .array(
      z.string().refine((slug) => Boolean(agricultureCompanySectorBySlug(slug))),
    )
    .max(12)
    .refine(unique)
    .optional(),
  roleDetails: roleDetailsStepSchema.optional(),
  reviewVisibility: z
    .object({
      profileVisibility: z.enum(["members", "public"]),
      termsAccepted: z.boolean(),
    })
    .optional(),
});
