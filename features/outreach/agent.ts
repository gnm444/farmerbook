import type { WorkersAiBinding } from "@/lib/cloudflare-bindings";
import {
  agricultureCategoryBySlug,
  SELECTABLE_AGRICULTURE_CATEGORIES,
} from "@/lib/agriculture/categories";
import { DEFAULT_LOCALE, type SupportedLocale } from "@/lib/i18n/locales";
import { outreachAnalysisJsonSchema } from "./ai-schema";
import { OUTREACH_PROMPT_VERSION, outreachPrompt } from "./prompt";
import { outreachAnalysisSchema } from "./schemas";
import type { OutreachAnalysis, OutreachRole } from "./types";

export const OUTREACH_TEXT_MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";

export interface OutreachAgent {
  analyze(input: {
    sourceText: string;
    businessName?: string;
    preferredLocale?: SupportedLocale;
  }): Promise<OutreachAnalysis>;
}

function deterministicRole(text: string): OutreachRole {
  const normalized = text.toLowerCase();
  if (/\b(tractor|equipment|tool|seed company|fertili[sz]er|manufacturer|dealer)\b/.test(normalized)) {
    return "agri_business";
  }
  if (/\b(wholesale|wholesaler|mandi|fpo|procurement|bulk buyer|aggregator)\b/.test(normalized)) {
    return "wholesaler";
  }
  if (/\b(farm|farmer|cultivat|grower|poultry|dairy|fishery|aquaculture|orchard)\b/.test(normalized)) {
    return "farmer";
  }
  if (/\b(buyer|customer|restaurant|retail|consumer|purchase)\b/.test(normalized)) {
    return "customer";
  }
  return "unknown";
}

function deterministicCategories(text: string) {
  const normalized = text.toLowerCase();
  return SELECTABLE_AGRICULTURE_CATEGORIES.filter((category) => {
    const words = `${category.slug.replaceAll("-", " ")} ${category.name}`
      .toLowerCase()
      .split(/\W+/)
      .filter((word) => word.length >= 4);
    return words.some((word) => normalized.includes(word));
  })
    .slice(0, 8)
    .map((category) => category.slug);
}

export function deterministicOutreachAnalysis(input: {
  sourceText: string;
  businessName?: string;
  preferredLocale?: SupportedLocale;
}, run: OutreachAnalysis["run"] = {
  model: "deterministic-template",
  promptVersion: OUTREACH_PROMPT_VERSION,
  status: "fallback",
  failureCode: "AI_NOT_CONFIGURED",
  durationMs: 0,
}): OutreachAnalysis {
  const role = deterministicRole(input.sourceText);
  const categories = deterministicCategories(input.sourceText);
  const categoryNames = categories
    .map((slug) => agricultureCategoryBySlug(slug)?.name)
    .filter(Boolean)
    .slice(0, 3)
    .join(", ");
  const name = input.businessName?.trim() || "there";
  return {
    suggestedRole: role,
    categorySlugs: categories,
    preferredLocale: input.preferredLocale ?? DEFAULT_LOCALE,
    rationale:
      role === "unknown"
        ? "The supplied information does not provide enough evidence for a FarmerBook role."
        : `The supplied information contains explicit ${role.replace("_", " ")} activity${categoryNames ? ` related to ${categoryNames}` : ""}.`,
    introductionDraft: `Hello ${name}, thank you for asking to hear from FarmerBook. FarmerBook helps farmers, customers, wholesalers and agricultural businesses build trusted profiles, discover relevant people, and share current produce or services. Create your account at https://farmerbook.in/signup. Results are not guaranteed, and you can reply STOP or withdraw consent at any time.`,
    run,
  };
}

export function createOutreachAgent(ai?: WorkersAiBinding): OutreachAgent {
  return {
    async analyze(input) {
      if (!ai) return deterministicOutreachAnalysis(input);
      const startedAt = Date.now();
      try {
        const raw = await ai.run(OUTREACH_TEXT_MODEL, {
          messages: outreachPrompt({
            ...input,
            preferredLocale: input.preferredLocale ?? DEFAULT_LOCALE,
          }),
          response_format: {
            type: "json_schema",
            json_schema: outreachAnalysisJsonSchema,
          },
          temperature: 0.1,
          max_tokens: 900,
        });
        const response =
          typeof raw === "object" && raw && "response" in raw
            ? (raw as { response: unknown }).response
            : raw;
        const parsedValue = typeof response === "string" ? JSON.parse(response) : response;
        return {
          ...outreachAnalysisSchema.parse(parsedValue),
          run: {
            model: OUTREACH_TEXT_MODEL,
            promptVersion: OUTREACH_PROMPT_VERSION,
            status: "succeeded" as const,
            failureCode: null,
            durationMs: Date.now() - startedAt,
          },
        };
      } catch {
        return deterministicOutreachAnalysis(input, {
          model: OUTREACH_TEXT_MODEL,
          promptVersion: OUTREACH_PROMPT_VERSION,
          status: "fallback",
          failureCode: "AI_OUTPUT_INVALID",
          durationMs: Date.now() - startedAt,
        });
      }
    },
  };
}
