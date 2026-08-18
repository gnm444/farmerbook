import { Agent, type AgentContext } from "agents";
import type { AiFleetBudgetAgent } from "@/features/ai-budget/agent";
import { runBudgetedAi } from "@/features/ai-budget/inference";
import { createBudgetedAiRuntime } from "@/features/ai-budget/runtime";
import type { WorkersAiBinding } from "@/lib/cloudflare-bindings";
import type { SupportedLocale } from "@/lib/i18n/locales";
import {
  blogDraftReviewSchema,
  blogPublicationSchema,
  blogTranslationRequestSchema,
  localizedBlogContentSchema,
  type BlogAgentDraft,
  type BlogPublication,
  type BlogTranslationResult,
  type BlogWritingAgentStatus,
  type LocalizedBlogContent,
} from "./contracts";

const DEFAULT_MODEL = "@cf/ibm-granite/granite-4.0-h-micro";
const SUPPORTED_MODELS = new Set([DEFAULT_MODEL]);
const TRANSLATION_MODEL = "@cf/ai4bharat/indictrans2-en-indic-1B";
const DEFAULT_MONTHLY_AI_BUDGET_USD = 2;
const MODEL_INPUT_USD_PER_MILLION = 0.017;
const MODEL_OUTPUT_USD_PER_MILLION = 0.112;
const TRANSLATION_USD_PER_MILLION = 0.342;
const DRAFT_MAX_OUTPUT_TOKENS = 3_500;
const WEEKLY_CRON_UTC = "30 3 * * 2"; // Tuesday, 09:00 IST.

const INDIC_TRANSLATION_LANGUAGE = {
  "as-IN": "asm_Beng",
  "bn-IN": "ben_Beng",
  "brx-IN": "brx_Deva",
  "doi-IN": "doi_Deva",
  "gu-IN": "guj_Gujr",
  "hi-IN": "hin_Deva",
  "kn-IN": "kan_Knda",
  "ks-Arab-IN": "kas_Arab",
  "kok-Deva-IN": "gom_Deva",
  "mai-IN": "mai_Deva",
  "ml-IN": "mal_Mlym",
  "mni-Mtei-IN": "mni_Mtei",
  "mr-IN": "mar_Deva",
  "ne-IN": "npi_Deva",
  "or-IN": "ory_Orya",
  "pa-Guru-IN": "pan_Guru",
  "sa-IN": "san_Deva",
  "sat-Olck-IN": "sat_Olck",
  "sd-Arab-IN": "snd_Arab",
  "ta-IN": "tam_Taml",
  "te-IN": "tel_Telu",
  "ur-IN": "urd_Arab",
} as const satisfies Record<Exclude<SupportedLocale, "en-IN">, string>;

interface BlogWritingAgentEnv extends Cloudflare.Env {
  AI?: WorkersAiBinding;
  AI_FLEET_BUDGET_AGENT?: DurableObjectNamespace<AiFleetBudgetAgent>;
  BLOG_WRITING_MODEL?: string;
  BLOG_WRITING_MONTHLY_BUDGET_USD?: string;
}

type BlogWritingAgentState = {
  monthKey: string;
  draftsThisMonth: number;
  translationsThisMonth: number;
  estimatedAiSpendMicros: number;
  scheduleId: string | null;
  nextScheduledRunAt: string | null;
  lastDraftAt: string | null;
  lastFailureCode: string | null;
};

type TranslationRow = {
  content_json: string;
  model: string;
};

type DraftRow = {
  id: string;
  week_key: string;
  status: "awaiting_review" | "published" | "rejected";
  topic: string;
  content_json: string;
  model: string;
  created_at: string;
  reviewed_at: string | null;
  reviewer_id: string | null;
};

type PublishedRow = { content_json: string };

const TOPIC_BRIEFS = [
  {
    key: "small-natural-farming-trial",
    topic: "How to compare a small natural-farming trial with current practice",
    category: "natural_farming" as const,
    sources: [
      {
        title: "Natural Farming",
        publisher: "NITI Aayog — Natural Farming Initiative",
        url: "https://naturalfarming.niti.gov.in/natural-farming/",
        scope: "Definition, biomass recycling, mulching and on-farm formulations.",
      },
      {
        title: "Natural Farming and scientific interpretation of Soil Health Card reports",
        publisher: "Indian Council of Agricultural Research",
        url: "https://icar.gov.in/index.php/hi/node/25263",
        scope: "Balanced soil-health interpretation and natural-farming field guidance.",
      },
    ],
  },
  {
    key: "food-adulteration-evidence-checks",
    topic: "How consumers can screen food-adulteration concerns without making unsupported purity claims",
    category: "food_safety" as const,
    sources: [
      {
        title: "Check Adulteration at Home",
        publisher: "Food Safety and Standards Authority of India",
        url: "https://fssai.gov.in/inspection/check-adulteration",
        scope: "Official DART and Food Safety Magic Box demonstrations for screening common adulterants in food.",
      },
      {
        title: "Food Safety and Standards Regulations",
        publisher: "Food Safety and Standards Authority of India",
        url: "https://fssai.gov.in/food-law/regulations",
        scope: "Current food-safety, labelling and display regulatory source index.",
      },
    ],
  },
  {
    key: "farm-food-traceability",
    topic: "What farm-to-table traceability records can prove and where their limits begin",
    category: "farm_to_table" as const,
    sources: [
      {
        title: "GS1 Global Traceability Standard",
        publisher: "GS1",
        url: "https://www.gs1.org/standards/gs1-global-traceability-standard/current-standard",
        scope: "Traceable objects, parties, locations, events and data across supply chains.",
      },
      {
        title: "PGS-India Certification System — revised guidelines and standards",
        publisher: "National Centre for Organic & Natural Farming",
        url: "https://pgsindia-ncof.gov.in/Default/assets/front/PDF/Revised_PGS_India_Guidlines.pdf",
        scope: "Certification, PGS-Organic, PGS-Green and accurate organic-status claims.",
      },
    ],
  },
  {
    key: "organic-label-evidence",
    topic: "What an organic label proves, and what 'under conversion' means",
    category: "natural_farming" as const,
    sources: [
      {
        title: "PGS-India Certification System — revised guidelines and standards",
        publisher: "National Centre for Organic & Natural Farming",
        url: "https://pgsindia-ncof.gov.in/Default/assets/front/PDF/Revised_PGS_India_Guidlines.pdf",
        scope: "Certification, PGS-Organic, PGS-Green and accurate labelling requirements.",
      },
    ],
  },
] as const;

function monthKey(date: Date) {
  return date.toISOString().slice(0, 7);
}

function weekKey(date: Date) {
  const monday = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() - ((date.getUTCDay() + 6) % 7),
  ));
  return monday.toISOString().slice(0, 10);
}

function boundedMoney(value: string | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 1 && parsed <= 2
    ? parsed
    : DEFAULT_MONTHLY_AI_BUDGET_USD;
}

function configuredModel(value: string | undefined) {
  const requested = value?.trim();
  return requested && SUPPORTED_MODELS.has(requested) ? requested : DEFAULT_MODEL;
}

function estimateTokens(value: string) {
  return Math.ceil(value.length / 3);
}

function conservativeDraftMicros(input: string, maxOutputTokens: number) {
  const inputUsd = (estimateTokens(input) / 1_000_000) * MODEL_INPUT_USD_PER_MILLION;
  const outputUsd = (maxOutputTokens / 1_000_000) * MODEL_OUTPUT_USD_PER_MILLION;
  return Math.max(1, Math.ceil((inputUsd + outputUsd) * 1_000_000));
}

function conservativeTranslationMicros(values: readonly string[]) {
  const inputTokens = values.reduce((sum, value) => sum + estimateTokens(value), 0);
  const outputTokens = Math.ceil(inputTokens * 1.5);
  return Math.max(1, Math.ceil(
    ((inputTokens + outputTokens) / 1_000_000)
      * TRANSLATION_USD_PER_MILLION
      * 1_000_000,
  ));
}

function rawAiText(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const result = value as {
    response?: unknown;
    choices?: Array<{ message?: { content?: unknown }; text?: unknown }>;
  };
  const candidate = typeof result.response === "string"
    ? result.response
    : typeof result.choices?.[0]?.message?.content === "string"
      ? result.choices[0].message.content
      : typeof result.choices?.[0]?.text === "string"
        ? result.choices[0].text
        : null;
  return candidate?.trim() || null;
}

function jsonFromAi(value: unknown) {
  const text = rawAiText(value);
  if (!text) return null;
  const unfenced = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const start = unfenced.indexOf("{");
  const end = unfenced.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(unfenced.slice(start, end + 1)) as unknown;
  } catch {
    return null;
  }
}

function failureCode(error: unknown) {
  return (error instanceof Error ? error.message : "BLOG_AGENT_FAILED")
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 80) || "BLOG_AGENT_FAILED";
}

function numbersIn(value: unknown) {
  const digitBlocks = [
    0x30, 0x660, 0x6f0, 0x966, 0x9e6, 0xa66, 0xae6, 0xb66,
    0xbe6, 0xc66, 0xce6, 0xd66, 0x1c50, 0xabf0,
  ];
  const normalized = [...JSON.stringify(value)].map((character) => {
    const codePoint = character.codePointAt(0) ?? -1;
    const block = digitBlocks.find((start) => codePoint >= start && codePoint <= start + 9);
    return block === undefined ? character : String(codePoint - block);
  }).join("");
  return normalized.match(/\d+(?:[.–—-]\d+)?/g)?.sort() ?? [];
}

function structurallyMatches(
  source: LocalizedBlogContent,
  translated: LocalizedBlogContent,
) {
  return source.sections.length === translated.sections.length
    && source.sections.every((section, index) =>
      section.bullets.length === translated.sections[index]?.bullets.length)
    && JSON.stringify(numbersIn(source)) === JSON.stringify(numbersIn(translated));
}

function draftFromRow(row: DraftRow): BlogAgentDraft {
  return {
    id: row.id,
    weekKey: row.week_key,
    status: row.status,
    topic: row.topic,
    content: blogPublicationSchema.parse(JSON.parse(row.content_json)),
    model: row.model,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
    reviewerId: row.reviewer_id,
  };
}

function flattenLocalizedContent(content: LocalizedBlogContent) {
  return [
    content.title,
    content.excerpt,
    content.dek,
    ...content.sections.flatMap((section) => [
      section.heading,
      ...section.paragraphs,
      ...section.bullets,
    ]),
    content.conclusion,
    content.safetyNote,
  ];
}

function rebuildLocalizedContent(
  source: LocalizedBlogContent,
  translations: readonly string[],
) {
  let cursor = 0;
  const next = () => translations[cursor++] ?? "";
  const content = {
    title: next(),
    excerpt: next(),
    dek: next(),
    sections: source.sections.map((section) => ({
      heading: next(),
      paragraphs: section.paragraphs.map(() => next()),
      bullets: section.bullets.map(() => next()),
    })),
    conclusion: next(),
    safetyNote: next(),
  };
  if (cursor !== translations.length) throw new Error("BLOG_TRANSLATION_LENGTH_MISMATCH");
  return localizedBlogContentSchema.parse(content);
}

function translatedTexts(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const translations = (value as { translations?: unknown }).translations;
  if (!Array.isArray(translations)
    || !translations.every((item) => typeof item === "string" && item.trim())) {
    return null;
  }
  return translations.map((item) => item.trim());
}

export class BlogWritingAgent extends Agent<
  BlogWritingAgentEnv,
  BlogWritingAgentState
> {
  initialState: BlogWritingAgentState = {
    monthKey: "1970-01",
    draftsThisMonth: 0,
    translationsThisMonth: 0,
    estimatedAiSpendMicros: 0,
    scheduleId: null,
    nextScheduledRunAt: null,
    lastDraftAt: null,
    lastFailureCode: null,
  };

  constructor(ctx: AgentContext, env: BlogWritingAgentEnv) {
    super(ctx, env);
  }

  async onStart() {
    void this.sql`CREATE TABLE IF NOT EXISTS blog_agent_drafts (
      id TEXT PRIMARY KEY,
      week_key TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL CHECK (status IN ('awaiting_review', 'published', 'rejected')),
      topic TEXT NOT NULL,
      content_json TEXT NOT NULL,
      model TEXT NOT NULL,
      created_at TEXT NOT NULL,
      reviewed_at TEXT,
      reviewer_id TEXT
    )`;
    void this.sql`CREATE INDEX IF NOT EXISTS blog_agent_drafts_status_created_idx
      ON blog_agent_drafts(status, created_at DESC)`;
    void this.sql`CREATE TABLE IF NOT EXISTS blog_agent_translations (
      slug TEXT NOT NULL,
      locale TEXT NOT NULL,
      content_fingerprint TEXT NOT NULL,
      content_json TEXT NOT NULL,
      model TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (slug, locale, content_fingerprint)
    )`;
    const scheduled = await this.schedule(
      WEEKLY_CRON_UTC,
      "prepareWeeklyDraft",
      { source: "weekly_editorial_schedule" },
      { retry: { maxAttempts: 2 } },
    );
    this.setState({
      ...this.state,
      scheduleId: scheduled.id,
      nextScheduledRunAt: new Date(scheduled.time * 1_000).toISOString(),
    });
  }

  validateStateChange(nextState: BlogWritingAgentState) {
    if (!/^\d{4}-\d{2}$/.test(nextState.monthKey)
      || !Number.isInteger(nextState.draftsThisMonth)
      || nextState.draftsThisMonth < 0
      || !Number.isInteger(nextState.translationsThisMonth)
      || nextState.translationsThisMonth < 0
      || !Number.isInteger(nextState.estimatedAiSpendMicros)
      || nextState.estimatedAiSpendMicros < 0) {
      throw new Error("BLOG_AGENT_STATE_INVALID");
    }
  }

  private refreshedState(now: Date) {
    return this.state.monthKey === monthKey(now)
      ? this.state
      : {
          ...this.state,
          monthKey: monthKey(now),
          draftsThisMonth: 0,
          translationsThisMonth: 0,
          estimatedAiSpendMicros: 0,
          lastFailureCode: null,
        };
  }

  private reserveInference(
    now: Date,
    reservedMicros: number,
    kind: "draft" | "translation",
  ) {
    if (!this.env.AI) throw new Error("BLOG_AI_BINDING_UNAVAILABLE");
    if (!this.env.AI_FLEET_BUDGET_AGENT) {
      throw new Error("BLOG_AI_BUDGET_UNAVAILABLE");
    }
    const current = this.refreshedState(now);
    const budgetMicros = Math.floor(
      boundedMoney(this.env.BLOG_WRITING_MONTHLY_BUDGET_USD) * 1_000_000,
    );
    if (current.estimatedAiSpendMicros + reservedMicros > budgetMicros) {
      throw new Error("BLOG_MONTHLY_BUDGET_REACHED");
    }
    this.setState({
      ...current,
      draftsThisMonth: current.draftsThisMonth + (kind === "draft" ? 1 : 0),
      translationsThisMonth:
        current.translationsThisMonth + (kind === "translation" ? 1 : 0),
      estimatedAiSpendMicros: current.estimatedAiSpendMicros + reservedMicros,
      lastFailureCode: null,
    });
  }

  private async generateLocalizedContent(
    prompt: string,
    maxOutputTokens: number,
    kind: "draft" | "translation",
  ) {
    const now = new Date();
    this.reserveInference(
      now,
      conservativeDraftMicros(prompt, maxOutputTokens),
      kind,
    );
    const result = await runBudgetedAi(
      await createBudgetedAiRuntime(this.env),
      {
        workstream: "blog_writing",
        operation: kind === "draft" ? "blog_draft" : "blog_translation",
        model: configuredModel(this.env.BLOG_WRITING_MODEL),
        input: {
        messages: [
          {
            role: "system",
            content:
              "You are FarmerBook's evidence-first natural-farming and food editor. Return only the requested JSON. Never invent a source, statistic, yield, price, cost saving, certification, safety claim or guaranteed result. Distinguish general education from crop-specific, food-safety and legal advice.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: maxOutputTokens,
        temperature: kind === "translation" ? 0 : 0.15,
      },
      },
    );
    const parsed = localizedBlogContentSchema.safeParse(jsonFromAi(result));
    if (!parsed.success) throw new Error("BLOG_AI_OUTPUT_INVALID");
    return parsed.data;
  }

  private async createDraft(runKey: string) {
    const existing = this.sql<{ id: string }>`SELECT id FROM blog_agent_drafts
      WHERE week_key = ${runKey} LIMIT 1`[0];
    if (existing) return { code: "ALREADY_PREPARED" as const, id: existing.id };
    const topicIndex = Math.abs(
      [...runKey].reduce((sum, character) => sum + character.charCodeAt(0), 0),
    ) % TOPIC_BRIEFS.length;
    const brief = TOPIC_BRIEFS[topicIndex];
    const prompt = [
      `Prepare one Indian English FarmerBook blog draft about: ${brief.topic}.`,
      "Use only the source packet below. Do not claim that the sources prove more than their stated scope.",
      JSON.stringify(brief.sources),
      "Return a JSON object with exactly: title, excerpt, dek, sections, conclusion, safetyNote.",
      "Each section must have heading, paragraphs and bullets. Write 700–1,000 words total.",
      "Use careful, practical language for Indian farmers and consumers. Include only measurements supported by the packet and questions that can be taken to the relevant local authority or qualified professional.",
      "End safetyNote by directing high-impact decisions to the relevant KVK, Agriculture Department, Food Safety Department, certification body, laboratory or qualified professional.",
    ].join("\n\n");
    try {
      const english = await this.generateLocalizedContent(
        prompt,
        DRAFT_MAX_OUTPUT_TOKENS,
        "draft",
      );
      const now = new Date();
      const compactDate = now.toISOString().slice(0, 10);
      const id = crypto.randomUUID();
      const publication = blogPublicationSchema.parse({
        slug: `${brief.key}-${compactDate}-${id.slice(0, 8)}`,
        category: brief.category,
        author: "FarmerBook Blog Writing Agent",
        publishedAt: now.toISOString(),
        updatedAt: now.toISOString(),
        readingMinutes: Math.max(
          3,
          Math.min(12, Math.round(JSON.stringify(english).split(/\s+/).length / 180)),
        ),
        editorialNote:
          "Prepared by FarmerBook's budget-capped managed Blog Writing Agent from the listed source packet. Publication requires an authenticated administrator's explicit review decision.",
        sources: brief.sources.map(({ title, publisher, url }) => ({
          title,
          publisher,
          url,
        })),
        english,
      });
      void this.sql`INSERT INTO blog_agent_drafts (
        id, week_key, status, topic, content_json, model, created_at
      ) VALUES (
        ${id}, ${runKey}, 'awaiting_review', ${brief.topic},
        ${JSON.stringify(publication)},
        ${configuredModel(this.env.BLOG_WRITING_MODEL)}, ${now.toISOString()}
      )`;
      this.setState({
        ...this.state,
        lastDraftAt: now.toISOString(),
        lastFailureCode: null,
      });
      return { code: "DRAFT_CREATED" as const, id };
    } catch (error) {
      this.setState({
        ...this.state,
        lastFailureCode: failureCode(error),
      });
      throw error;
    }
  }

  async prepareWeeklyDraft() {
    return this.createDraft(weekKey(new Date()));
  }

  async prepareDraftNow() {
    return this.createDraft(`${weekKey(new Date())}-manual-${Date.now()}`);
  }

  async listDrafts(limit = 20): Promise<BlogAgentDraft[]> {
    const safeLimit = Number.isInteger(limit) ? Math.max(1, Math.min(limit, 40)) : 20;
    return this.sql<DraftRow>`SELECT id, week_key, status, topic, content_json,
      model, created_at, reviewed_at, reviewer_id
      FROM blog_agent_drafts ORDER BY created_at DESC LIMIT ${safeLimit}`
      .map(draftFromRow);
  }

  async reviewDraft(rawInput: unknown) {
    const input = blogDraftReviewSchema.parse(rawInput);
    const current = this.sql<DraftRow>`SELECT id, week_key, status, topic,
      content_json, model, created_at, reviewed_at, reviewer_id
      FROM blog_agent_drafts WHERE id = ${input.id} LIMIT 1`[0];
    if (!current) throw new Error("BLOG_DRAFT_NOT_FOUND");
    if (current.status !== "awaiting_review") {
      return { code: "ALREADY_REVIEWED" as const, status: current.status };
    }
    const status = input.decision === "publish" ? "published" : "rejected";
    const reviewedAt = new Date().toISOString();
    void this.sql`UPDATE blog_agent_drafts SET
      status = ${status}, reviewed_at = ${reviewedAt}, reviewer_id = ${input.reviewerId}
      WHERE id = ${input.id} AND status = 'awaiting_review'`;
    return { code: status === "published" ? "PUBLISHED" as const : "REJECTED" as const };
  }

  async listPublished(): Promise<BlogPublication[]> {
    return this.sql<PublishedRow>`SELECT content_json FROM blog_agent_drafts
      WHERE status = 'published' ORDER BY reviewed_at DESC LIMIT 50`
      .map((row) => blogPublicationSchema.parse(JSON.parse(row.content_json)));
  }

  async translatePublishedArticle(rawInput: unknown): Promise<BlogTranslationResult> {
    const input = blogTranslationRequestSchema.parse(rawInput);
    if (input.locale === "en-IN") {
      return { content: input.sourceContent, source: "reviewed_original", model: null };
    }
    const cached = this.sql<TranslationRow>`SELECT content_json, model
      FROM blog_agent_translations
      WHERE slug = ${input.slug}
        AND locale = ${input.locale}
        AND content_fingerprint = ${input.contentFingerprint}
      LIMIT 1`[0];
    if (cached) {
      return {
        content: localizedBlogContentSchema.parse(JSON.parse(cached.content_json)),
        source: "ai_assisted_translation",
        model: cached.model,
      };
    }
    const locale = input.locale as SupportedLocale;
    const sourceValues = flattenLocalizedContent(input.sourceContent);
    try {
      this.reserveInference(
        new Date(),
        conservativeTranslationMicros(sourceValues),
        "translation",
      );
      const result = await runBudgetedAi(
        await createBudgetedAiRuntime(this.env),
        {
          workstream: "blog_writing",
          operation: "blog_translation",
          model: TRANSLATION_MODEL,
          input: {
            text: sourceValues,
            target_language:
              INDIC_TRANSLATION_LANGUAGE[
                locale as Exclude<SupportedLocale, "en-IN">
              ],
          },
        },
      );
      const values = translatedTexts(result);
      if (!values || values.length !== sourceValues.length) {
        throw new Error("BLOG_TRANSLATION_OUTPUT_INVALID");
      }
      const translated = rebuildLocalizedContent(input.sourceContent, values);
      if (!structurallyMatches(input.sourceContent, translated)) {
        throw new Error("BLOG_TRANSLATION_STRUCTURE_MISMATCH");
      }
      const model = TRANSLATION_MODEL;
      void this.sql`INSERT INTO blog_agent_translations (
        slug, locale, content_fingerprint, content_json, model, created_at
      ) VALUES (
        ${input.slug}, ${input.locale}, ${input.contentFingerprint},
        ${JSON.stringify(translated)}, ${model}, ${new Date().toISOString()}
      )`;
      return {
        content: translated,
        source: "ai_assisted_translation",
        model,
      };
    } catch (error) {
      this.setState({
        ...this.state,
        lastFailureCode: failureCode(error),
      });
      return {
        content: input.sourceContent,
        source: "english_fallback",
        model: null,
      };
    }
  }

  async status(): Promise<BlogWritingAgentStatus> {
    const now = new Date();
    const current = this.refreshedState(now);
    const schedules = await this.listSchedules({ type: "cron" });
    const weekly = schedules.find((schedule) => schedule.callback === "prepareWeeklyDraft");
    return {
      ...current,
      scheduleId: weekly?.id ?? current.scheduleId,
      nextScheduledRunAt: weekly ? new Date(weekly.time * 1_000).toISOString() : null,
      monthlyBudgetUsd: boundedMoney(this.env.BLOG_WRITING_MONTHLY_BUDGET_USD),
      model: configuredModel(this.env.BLOG_WRITING_MODEL),
    };
  }
}
