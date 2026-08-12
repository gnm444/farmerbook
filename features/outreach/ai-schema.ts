export const outreachAnalysisJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    suggestedRole: {
      type: "string",
      enum: ["farmer", "customer", "wholesaler", "agri_business", "unknown"],
    },
    categorySlugs: {
      type: "array",
      maxItems: 8,
      uniqueItems: true,
      items: { type: "string" },
    },
    preferredLocale: { type: "string" },
    rationale: { type: "string", minLength: 2, maxLength: 600 },
    introductionDraft: { type: "string", minLength: 20, maxLength: 1_500 },
  },
  required: [
    "suggestedRole",
    "categorySlugs",
    "preferredLocale",
    "rationale",
    "introductionDraft",
  ],
} as const;
