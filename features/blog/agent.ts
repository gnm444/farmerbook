import { Agent, getAgentByName, type AgentContext } from "agents";
import type { AiFleetBudgetAgent } from "@/features/ai-budget/agent";
import { runBudgetedAi } from "@/features/ai-budget/inference";
import { createBudgetedAiRuntime } from "@/features/ai-budget/runtime";
import type { WorkersAiBinding } from "@/lib/cloudflare-bindings";
import type { SupportedLocale } from "@/lib/i18n/locales";
import type { BlogPublicationVerifierAgent } from "./publication-verifier-agent";
import {
  AUTONOMOUS_PUBLICATION_POLICY_VERSION,
  blogPublicationFingerprint,
  evaluateAutonomousPublication,
} from "./autonomous-publication-policy";
import {
  blogDraftReplacementSchema,
  blogDraftReviewSchema,
  blogPublicationVerificationSchema,
  blogPublicationSchema,
  blogScheduleControlSchema,
  blogTranslationRequestSchema,
  localizedBlogContentSchema,
  type BlogAgentDraft,
  type BlogPublication,
  type BlogTranslationResult,
  type BlogWritingAgentStatus,
  type LocalizedBlogContent,
} from "./contracts";
import {
  DAILY_DRAFT_LIMIT,
  DAILY_EDITORIAL_CALLBACK,
  DAILY_EDITORIAL_CRON_UTC,
  DAILY_EDITORIAL_TIME_ZONE,
  DAILY_SOURCE_MANIFEST_VERSION,
  DAILY_EDITORIAL_TOPICS,
  MONTHLY_DRAFT_LIMIT,
  editorialScheduleIdsToCancel,
  indiaDayKey,
  indiaMonthKey,
  selectDailyEditorialBrief,
  selectDailyAutonomousBrief,
  sourceHealth,
  type DailyEditorialBrief,
} from "./daily-editorial";

const DEFAULT_MODEL = "@cf/ibm-granite/granite-4.0-h-micro";
const SUPPORTED_MODELS = new Set([DEFAULT_MODEL]);
const TRANSLATION_MODEL = "@cf/ai4bharat/indictrans2-en-indic-1B";
const DEFAULT_MONTHLY_AI_BUDGET_USD = 2;
const MODEL_INPUT_USD_PER_MILLION = 0.017;
const MODEL_OUTPUT_USD_PER_MILLION = 0.112;
const TRANSLATION_USD_PER_MILLION = 0.342;
const DRAFT_MAX_OUTPUT_TOKENS = 3_500;

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
  BLOG_AUTONOMOUS_PUBLISHING?: string;
  BLOG_PUBLICATION_VERIFIER_AGENT?: DurableObjectNamespace<BlogPublicationVerifierAgent>;
  NEXT_PUBLIC_SITE_URL?: string;
}

type BlogWritingAgentState = {
  monthKey: string;
  draftsThisMonth: number;
  translationsThisMonth: number;
  estimatedAiSpendMicros: number;
  scheduleId: string | null;
  schedulePaused: boolean;
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
  run_key: string | null;
  status: "awaiting_review" | "published" | "rejected";
  topic: string;
  content_json: string;
  model: string;
  source_manifest_version: string;
  source_reviewed_at: string;
  risk_class: "low" | "medium" | "legacy";
  generation_status: "prepared" | "legacy";
  failure_code: string | null;
  revision: number;
  created_at: string;
  reviewed_at: string | null;
  reviewer_id: string | null;
  review_reason: string | null;
  quality_outcome: "approved" | "light_edits" | "heavy_edits" | "rejected" | null;
  publication_verification_status: "pending" | "verified" | "failed" | null;
  publication_verified_at: string | null;
  publication_verification_code: string | null;
  publication_mode: "manual" | "autonomous";
  publication_policy_version: string | null;
  publication_idempotency_key: string | null;
  content_sha256: string | null;
  visibility_status: "private" | "provisional" | "public" | "quarantined";
};

type PublishedRow = { content_json: string };

type DailyRunRow = {
  run_key: string;
  source: "scheduled" | "manual";
  status: "started" | "prepared" | "failed" | "skipped";
  topic_key: string;
  draft_id: string | null;
  failure_code: string | null;
  created_at: string;
  updated_at: string;
};

type CountRow = { count: number };

type PublicationMetricRow = {
  autonomous_published_this_month: number;
  provisional_publications: number;
  quarantined_publications: number;
};

type ReviewMetricRow = {
  awaiting_review: number;
  published: number;
  rejected: number;
  approved: number;
  light_edits: number;
  heavy_edits: number;
  oldest_awaiting_review_at: string | null;
};

function monthKey(date: Date) {
  return date.toISOString().slice(0, 7);
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

function autonomousPublishingEnabled(value: string | undefined) {
  return value?.trim().toLowerCase() === "true";
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

async function sha256(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
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
    runKey: row.run_key ?? row.week_key,
    status: row.status,
    topic: row.topic,
    content: blogPublicationSchema.parse(JSON.parse(row.content_json)),
    model: row.model,
    sourceManifestVersion: row.source_manifest_version,
    sourceReviewedAt: row.source_reviewed_at,
    riskClass: row.risk_class,
    generationStatus: row.generation_status,
    failureCode: row.failure_code,
    revision: row.revision,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
    reviewerId: row.reviewer_id,
    reviewReason: row.review_reason,
    qualityOutcome: row.quality_outcome,
    publicationVerificationStatus: row.publication_verification_status,
    publicationVerifiedAt: row.publication_verified_at,
    publicationVerificationCode: row.publication_verification_code,
    publicationMode: row.publication_mode,
    publicationPolicyVersion: row.publication_policy_version,
    publicationIdempotencyKey: row.publication_idempotency_key,
    contentSha256: row.content_sha256,
    visibilityStatus: row.visibility_status,
  };
}

function dailyRunFromRow(row: DailyRunRow) {
  return {
    runKey: row.run_key,
    source: row.source,
    status: row.status,
    topicKey: row.topic_key,
    draftId: row.draft_id,
    failureCode: row.failure_code,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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
    schedulePaused: false,
    nextScheduledRunAt: null,
    lastDraftAt: null,
    lastFailureCode: null,
  };

  constructor(ctx: AgentContext, env: BlogWritingAgentEnv) {
    super(ctx, env);
  }

  private setupStorage() {
    void this.sql`CREATE TABLE IF NOT EXISTS blog_agent_drafts (
      id TEXT PRIMARY KEY,
      week_key TEXT NOT NULL UNIQUE,
      run_key TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL CHECK (status IN ('awaiting_review', 'published', 'rejected')),
      topic TEXT NOT NULL,
      content_json TEXT NOT NULL,
      model TEXT NOT NULL,
      source_manifest_version TEXT NOT NULL,
      source_reviewed_at TEXT NOT NULL,
      risk_class TEXT NOT NULL,
      generation_status TEXT NOT NULL,
      failure_code TEXT,
      revision INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      reviewed_at TEXT,
      reviewer_id TEXT,
      review_reason TEXT,
      quality_outcome TEXT,
      publication_verification_status TEXT,
      publication_verified_at TEXT,
      publication_verification_code TEXT,
      publication_mode TEXT NOT NULL DEFAULT 'manual',
      publication_policy_version TEXT,
      publication_idempotency_key TEXT,
      content_sha256 TEXT,
      visibility_status TEXT NOT NULL DEFAULT 'private'
    )`;
    const columns = this.sql<{ name: string }>`PRAGMA table_info(blog_agent_drafts)`;
    const hasColumn = (name: string) => columns.some((column) => column.name === name);
    if (!hasColumn("run_key")) {
      void this.sql`ALTER TABLE blog_agent_drafts ADD COLUMN run_key TEXT`;
    }
    if (!hasColumn("source_manifest_version")) {
      void this.sql`ALTER TABLE blog_agent_drafts ADD COLUMN source_manifest_version TEXT NOT NULL DEFAULT 'legacy-v0'`;
    }
    if (!hasColumn("source_reviewed_at")) {
      void this.sql`ALTER TABLE blog_agent_drafts ADD COLUMN source_reviewed_at TEXT NOT NULL DEFAULT '1970-01-01T00:00:00.000Z'`;
    }
    if (!hasColumn("risk_class")) {
      void this.sql`ALTER TABLE blog_agent_drafts ADD COLUMN risk_class TEXT NOT NULL DEFAULT 'legacy'`;
    }
    if (!hasColumn("generation_status")) {
      void this.sql`ALTER TABLE blog_agent_drafts ADD COLUMN generation_status TEXT NOT NULL DEFAULT 'legacy'`;
    }
    if (!hasColumn("failure_code")) {
      void this.sql`ALTER TABLE blog_agent_drafts ADD COLUMN failure_code TEXT`;
    }
    if (!hasColumn("revision")) {
      void this.sql`ALTER TABLE blog_agent_drafts ADD COLUMN revision INTEGER NOT NULL DEFAULT 1`;
    }
    if (!hasColumn("review_reason")) {
      void this.sql`ALTER TABLE blog_agent_drafts ADD COLUMN review_reason TEXT`;
    }
    if (!hasColumn("quality_outcome")) {
      void this.sql`ALTER TABLE blog_agent_drafts ADD COLUMN quality_outcome TEXT`;
    }
    if (!hasColumn("publication_verification_status")) {
      void this.sql`ALTER TABLE blog_agent_drafts ADD COLUMN publication_verification_status TEXT`;
    }
    if (!hasColumn("publication_verified_at")) {
      void this.sql`ALTER TABLE blog_agent_drafts ADD COLUMN publication_verified_at TEXT`;
    }
    if (!hasColumn("publication_verification_code")) {
      void this.sql`ALTER TABLE blog_agent_drafts ADD COLUMN publication_verification_code TEXT`;
    }
    if (!hasColumn("publication_mode")) {
      void this.sql`ALTER TABLE blog_agent_drafts ADD COLUMN publication_mode TEXT NOT NULL DEFAULT 'manual'`;
    }
    if (!hasColumn("publication_policy_version")) {
      void this.sql`ALTER TABLE blog_agent_drafts ADD COLUMN publication_policy_version TEXT`;
    }
    if (!hasColumn("publication_idempotency_key")) {
      void this.sql`ALTER TABLE blog_agent_drafts ADD COLUMN publication_idempotency_key TEXT`;
    }
    if (!hasColumn("content_sha256")) {
      void this.sql`ALTER TABLE blog_agent_drafts ADD COLUMN content_sha256 TEXT`;
    }
    const visibilityColumnAdded = !hasColumn("visibility_status");
    if (visibilityColumnAdded) {
      void this.sql`ALTER TABLE blog_agent_drafts ADD COLUMN visibility_status TEXT NOT NULL DEFAULT 'private'`;
      void this.sql`UPDATE blog_agent_drafts SET visibility_status = 'public'
        WHERE status = 'published'`;
    }
    void this.sql`UPDATE blog_agent_drafts SET run_key = week_key WHERE run_key IS NULL`;
    void this.sql`CREATE UNIQUE INDEX IF NOT EXISTS blog_agent_drafts_run_key_idx
      ON blog_agent_drafts(run_key)`;
    void this.sql`CREATE INDEX IF NOT EXISTS blog_agent_drafts_status_created_idx
      ON blog_agent_drafts(status, created_at DESC)`;
    void this.sql`CREATE UNIQUE INDEX IF NOT EXISTS blog_agent_drafts_publication_idempotency_idx
      ON blog_agent_drafts(publication_idempotency_key)
      WHERE publication_idempotency_key IS NOT NULL`;
    void this.sql`CREATE INDEX IF NOT EXISTS blog_agent_drafts_visibility_created_idx
      ON blog_agent_drafts(visibility_status, created_at DESC)`;
    void this.sql`CREATE TABLE IF NOT EXISTS blog_agent_runs (
      run_key TEXT PRIMARY KEY,
      source TEXT NOT NULL CHECK (source IN ('scheduled', 'manual')),
      status TEXT NOT NULL CHECK (status IN ('started', 'prepared', 'failed', 'skipped')),
      topic_key TEXT NOT NULL,
      source_manifest_version TEXT NOT NULL,
      source_reviewed_at TEXT NOT NULL,
      risk_class TEXT NOT NULL,
      draft_id TEXT,
      failure_code TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`;
    void this.sql`CREATE INDEX IF NOT EXISTS blog_agent_runs_created_idx
      ON blog_agent_runs(created_at DESC)`;
    void this.sql`CREATE TABLE IF NOT EXISTS blog_agent_events (
      id TEXT PRIMARY KEY,
      draft_id TEXT,
      event_type TEXT NOT NULL,
      actor_id TEXT NOT NULL,
      details_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`;
    void this.sql`CREATE INDEX IF NOT EXISTS blog_agent_events_draft_created_idx
      ON blog_agent_events(draft_id, created_at)`;
    void this.sql`CREATE TABLE IF NOT EXISTS blog_agent_translations (
      slug TEXT NOT NULL,
      locale TEXT NOT NULL,
      content_fingerprint TEXT NOT NULL,
      content_json TEXT NOT NULL,
      model TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (slug, locale, content_fingerprint)
    )`;
  }

  private recordEvent(
    eventType: string,
    actorId: string,
    draftId: string | null,
    details: Record<string, unknown>,
  ) {
    void this.sql`INSERT INTO blog_agent_events (
      id, draft_id, event_type, actor_id, details_json, created_at
    ) VALUES (
      ${crypto.randomUUID()}, ${draftId}, ${eventType}, ${actorId},
      ${JSON.stringify(details)}, ${new Date().toISOString()}
    )`;
  }

  private async cancelEditorialSchedules(keepDailyScheduleId: string | null) {
    const schedules = await this.listSchedules({ type: "cron" });
    const ids = editorialScheduleIdsToCancel(schedules, keepDailyScheduleId);
    await Promise.all(ids.map((id) => this.cancelSchedule(id)));
    return ids;
  }

  private async ensureDailySchedule() {
    const scheduled = await this.schedule(
      DAILY_EDITORIAL_CRON_UTC,
      DAILY_EDITORIAL_CALLBACK,
      { source: "daily_editorial_schedule_v1" },
      { retry: { maxAttempts: 2 } },
    );
    await this.cancelEditorialSchedules(scheduled.id);
    this.setState({
      ...this.refreshedState(new Date()),
      scheduleId: scheduled.id,
      schedulePaused: false,
      nextScheduledRunAt: new Date(scheduled.time * 1_000).toISOString(),
    });
    return scheduled;
  }

  async onStart() {
    this.setupStorage();
    if (this.state.schedulePaused === true) {
      await this.cancelEditorialSchedules(null);
      this.setState({
        ...this.refreshedState(new Date()),
        scheduleId: null,
        schedulePaused: true,
        nextScheduledRunAt: null,
      });
      return;
    }
    await this.ensureDailySchedule();
  }

  validateStateChange(nextState: BlogWritingAgentState) {
    if (!/^\d{4}-\d{2}$/.test(nextState.monthKey)
      || !Number.isInteger(nextState.draftsThisMonth)
      || nextState.draftsThisMonth < 0
      || !Number.isInteger(nextState.translationsThisMonth)
      || nextState.translationsThisMonth < 0
      || !Number.isInteger(nextState.estimatedAiSpendMicros)
      || nextState.estimatedAiSpendMicros < 0
      || typeof nextState.schedulePaused !== "boolean") {
      throw new Error("BLOG_AGENT_STATE_INVALID");
    }
  }

  private refreshedState(now: Date) {
    const current = {
      ...this.state,
      schedulePaused: this.state.schedulePaused === true,
    };
    return current.monthKey === monthKey(now)
      ? current
      : {
          ...current,
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

  private async autonomouslyPublishDraft(
    draftId: string,
    runKey: string,
    brief: DailyEditorialBrief,
    sourceManifestFresh: boolean,
    publicationInput: BlogPublication,
  ) {
    const dayCount = this.sql<CountRow>`SELECT COUNT(*) AS count
      FROM blog_agent_drafts
      WHERE publication_mode = 'autonomous'
        AND status = 'published'
        AND run_key = ${runKey}`[0]?.count ?? 0;
    const runMonth = runKey.slice(0, 7);
    const monthCount = this.sql<CountRow>`SELECT COUNT(*) AS count
      FROM blog_agent_drafts
      WHERE publication_mode = 'autonomous'
        AND status = 'published'
        AND substr(run_key, 1, 7) = ${runMonth}`[0]?.count ?? 0;
    const publishedAt = new Date().toISOString();
    const publication = blogPublicationSchema.parse({
      ...publicationInput,
      publishedAt,
      updatedAt: publishedAt,
      editorialNote:
        "Prepared and released by FarmerBook's source-bounded autonomous publication standing policy. Public visibility is independently verified after release.",
    });
    const decision = evaluateAutonomousPublication({
      publication,
      brief,
      runKey,
      sourceManifestFresh,
      dailyPublishedCount: dayCount,
      monthlyPublishedCount: monthCount,
    });
    if (!decision.eligible) {
      const code = `BLOG_AUTO_${decision.code}`;
      void this.sql`UPDATE blog_agent_drafts SET
        status = 'rejected', failure_code = ${code}, reviewed_at = ${publishedAt},
        reviewer_id = 'blog-autonomous-policy', review_reason = ${code},
        quality_outcome = 'rejected', publication_mode = 'autonomous',
        publication_policy_version = ${AUTONOMOUS_PUBLICATION_POLICY_VERSION},
        visibility_status = 'private'
        WHERE id = ${draftId} AND status = 'awaiting_review'`;
      void this.sql`UPDATE blog_agent_runs SET status = 'skipped',
        failure_code = ${code}, updated_at = ${publishedAt}
        WHERE run_key = ${runKey}`;
      this.setState({
        ...this.refreshedState(new Date()),
        lastFailureCode: code,
      });
      this.recordEvent("autonomous_publication_skipped", "blog-autonomous-policy", draftId, {
        runKey,
        code,
        policyVersion: AUTONOMOUS_PUBLICATION_POLICY_VERSION,
      });
      return { code: "AUTO_SKIPPED" as const, id: draftId, reason: code };
    }

    if (!this.env.BLOG_PUBLICATION_VERIFIER_AGENT) {
      const code = "BLOG_AUTO_VERIFIER_UNAVAILABLE";
      void this.sql`UPDATE blog_agent_drafts SET status = 'rejected',
        failure_code = ${code}, reviewed_at = ${publishedAt},
        reviewer_id = 'blog-autonomous-policy', review_reason = ${code},
        quality_outcome = 'rejected', publication_mode = 'autonomous',
        publication_policy_version = ${AUTONOMOUS_PUBLICATION_POLICY_VERSION},
        visibility_status = 'private'
        WHERE id = ${draftId} AND status = 'awaiting_review'`;
      await this.cancelEditorialSchedules(null);
      this.setState({
        ...this.refreshedState(new Date()),
        scheduleId: null,
        schedulePaused: true,
        nextScheduledRunAt: null,
        lastFailureCode: code,
      });
      throw new Error(code);
    }

    const contentSha256 = await blogPublicationFingerprint(publication);
    const idempotencyKey = [
      "auto-publish",
      AUTONOMOUS_PUBLICATION_POLICY_VERSION,
      runKey,
      draftId,
      "1",
    ].join(":");
    try {
      const verifier = await getAgentByName(
        this.env.BLOG_PUBLICATION_VERIFIER_AGENT,
        "farmerbook-blog-publication-verifier",
      ) as DurableObjectStub<BlogPublicationVerifierAgent>;
      await verifier.enqueueVerification({
        draftId,
        slug: publication.slug,
        contentSha256,
        title: publication.english.title,
        excerpt: publication.english.excerpt,
        canonicalUrl: new URL(
          `/blog/${publication.slug}`,
          this.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://farmerbook.in",
        ).toString(),
        runKey,
      });
    } catch (error) {
      const code = `BLOG_AUTO_${failureCode(error)}`;
      void this.sql`UPDATE blog_agent_drafts SET status = 'rejected',
        failure_code = ${code}, reviewed_at = ${publishedAt},
        reviewer_id = 'blog-autonomous-policy', review_reason = ${code},
        quality_outcome = 'rejected', publication_mode = 'autonomous',
        publication_policy_version = ${AUTONOMOUS_PUBLICATION_POLICY_VERSION},
        visibility_status = 'private'
        WHERE id = ${draftId} AND status = 'awaiting_review'`;
      await this.cancelEditorialSchedules(null);
      this.setState({
        ...this.refreshedState(new Date()),
        scheduleId: null,
        schedulePaused: true,
        nextScheduledRunAt: null,
        lastFailureCode: code,
      });
      throw new Error(code);
    }

    const contentJson = JSON.stringify(publication);
    void this.sql`UPDATE blog_agent_drafts SET status = 'published',
      content_json = ${contentJson}, reviewed_at = ${publishedAt},
      reviewer_id = 'blog-autonomous-policy',
      review_reason = 'STANDING_POLICY_AUTO_PUBLISH', quality_outcome = 'approved',
      publication_verification_status = 'pending', publication_verified_at = NULL,
      publication_verification_code = NULL, publication_mode = 'autonomous',
      publication_policy_version = ${AUTONOMOUS_PUBLICATION_POLICY_VERSION},
      publication_idempotency_key = ${idempotencyKey},
      content_sha256 = ${contentSha256}, visibility_status = 'provisional'
      WHERE id = ${draftId} AND status = 'awaiting_review'`;
    this.recordEvent("autonomous_publication_prepared", "blog-autonomous-policy", draftId, {
      runKey,
      policyVersion: AUTONOMOUS_PUBLICATION_POLICY_VERSION,
      idempotencyKey,
      contentSha256,
      visibilityStatus: "provisional",
    });
    return {
      code: "AUTO_PUBLISHED_PROVISIONAL" as const,
      id: draftId,
      publication,
    };
  }

  private async createDraft(
    runKey: string,
    source: "scheduled" | "manual",
  ) {
    if (this.state.schedulePaused === true) {
      return { code: "AGENT_PAUSED" as const, id: null };
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(runKey)) {
      throw new Error("BLOG_RUN_KEY_INVALID");
    }
    const existingRun = this.sql<DailyRunRow>`SELECT run_key, source, status,
      topic_key, draft_id, failure_code, created_at, updated_at
      FROM blog_agent_runs WHERE run_key = ${runKey} LIMIT 1`[0];
    if (existingRun) {
      return {
        code: existingRun.status === "prepared"
          ? "ALREADY_PREPARED" as const
          : "ALREADY_ATTEMPTED" as const,
        id: existingRun.draft_id,
      };
    }
    const runMonth = runKey.slice(0, 7);
    const runCount = this.sql<CountRow>`SELECT COUNT(*) AS count
      FROM blog_agent_runs WHERE substr(run_key, 1, 7) = ${runMonth}`[0]?.count ?? 0;
    if (runCount >= MONTHLY_DRAFT_LIMIT) {
      this.setState({
        ...this.refreshedState(new Date()),
        lastFailureCode: "BLOG_MONTHLY_DRAFT_LIMIT_REACHED",
      });
      return { code: "MONTHLY_DRAFT_LIMIT_REACHED" as const, id: null };
    }
    const automatic = autonomousPublishingEnabled(this.env.BLOG_AUTONOMOUS_PUBLISHING);
    const brief = automatic
      ? selectDailyAutonomousBrief(runKey)
      : selectDailyEditorialBrief(runKey);
    const health = sourceHealth(brief, new Date());
    const now = new Date();
    const nowIso = now.toISOString();
    void this.sql`INSERT INTO blog_agent_runs (
      run_key, source, status, topic_key, source_manifest_version,
      source_reviewed_at, risk_class, draft_id, failure_code, created_at,
      updated_at
    ) VALUES (
      ${runKey}, ${source}, 'started', ${brief.key},
      ${DAILY_SOURCE_MANIFEST_VERSION},
      ${health.oldestReviewedAt ?? "1970-01-01T00:00:00.000Z"},
      ${brief.riskClass}, NULL, NULL, ${nowIso}, ${nowIso}
    )`;
    if (!health.fresh) {
      void this.sql`UPDATE blog_agent_runs SET status = 'skipped',
        failure_code = 'BLOG_SOURCE_MANIFEST_STALE', updated_at = ${nowIso}
        WHERE run_key = ${runKey}`;
      this.setState({
        ...this.refreshedState(now),
        lastFailureCode: "BLOG_SOURCE_MANIFEST_STALE",
      });
      this.recordEvent("draft_skipped", `blog-writing-agent:${source}`, null, {
        runKey,
        code: "BLOG_SOURCE_MANIFEST_STALE",
        manifestVersion: DAILY_SOURCE_MANIFEST_VERSION,
        staleSourceCount: health.staleUrls.length,
      });
      return { code: "SOURCE_MANIFEST_STALE" as const, id: null };
    }
    const prompt = [
      `Prepare one Indian English FarmerBook blog draft about: ${brief.topic}.`,
      `Source manifest: ${DAILY_SOURCE_MANIFEST_VERSION}. Sources were editorially reviewed no earlier than ${health.oldestReviewedAt}.`,
      `Allowed claim scope: ${brief.allowedClaimScope}`,
      `Prohibited claims: ${JSON.stringify(brief.prohibitedClaims)}`,
      "Use only the source packet below. Do not claim that the sources prove more than their stated scope. Do not browse, identify, quote or profile any farmer, customer or other person.",
      JSON.stringify(brief.sources),
      "Return a JSON object with exactly: title, excerpt, dek, sections, conclusion, safetyNote.",
      "Each section must have heading, paragraphs and bullets. Write 700–1,000 words total.",
      "Use careful, practical language for Indian farmers and consumers. Include only measurements supported by the packet and questions that can be taken to the relevant local authority or qualified professional.",
      ...(automatic ? [
        "This draft is eligible for a strict autonomous lane only if it contains no digits, percentages, prices, yield or income statements, certification conclusions, guarantees, treatment advice, personal stories, contact details, quoted people or external URLs. Use modest observational language and no universal claims.",
      ] : []),
      "End safetyNote by directing high-impact decisions to the relevant KVK, Agriculture Department, Food Safety Department, certification body, laboratory or qualified professional.",
    ].join("\n\n");
    try {
      const english = await this.generateLocalizedContent(
        prompt,
        DRAFT_MAX_OUTPUT_TOKENS,
        "draft",
      );
      const id = crypto.randomUUID();
      const publication = blogPublicationSchema.parse({
        slug: `${brief.key}-${runKey}-${id.slice(0, 8)}`,
        category: brief.category,
        author: "FarmerBook Blog Writing Agent",
        publishedAt: now.toISOString(),
        updatedAt: now.toISOString(),
        readingMinutes: Math.max(
          3,
          Math.min(12, Math.round(JSON.stringify(english).split(/\s+/).length / 180)),
        ),
        editorialNote:
          automatic
            ? "Prepared by FarmerBook's budget-capped Blog Writing Agent for evaluation under the bounded autonomous publication standing policy."
            : "Prepared by FarmerBook's budget-capped managed Blog Writing Agent from the listed source packet. Publication requires an authenticated administrator's explicit review decision.",
        sources: brief.sources.map(({ title, publisher, url }) => ({
          title,
          publisher,
          url,
        })),
        english,
      });
      void this.sql`INSERT INTO blog_agent_drafts (
        id, week_key, run_key, status, topic, content_json, model,
        source_manifest_version, source_reviewed_at, risk_class,
        generation_status, failure_code, revision, created_at
      ) VALUES (
        ${id}, ${runKey}, ${runKey}, 'awaiting_review', ${brief.topic},
        ${JSON.stringify(publication)},
        ${configuredModel(this.env.BLOG_WRITING_MODEL)},
        ${DAILY_SOURCE_MANIFEST_VERSION},
        ${health.oldestReviewedAt ?? "1970-01-01T00:00:00.000Z"},
        ${brief.riskClass}, 'prepared', NULL, 1, ${nowIso}
      )`;
      void this.sql`UPDATE blog_agent_runs SET status = 'prepared',
        draft_id = ${id}, failure_code = NULL, updated_at = ${nowIso}
        WHERE run_key = ${runKey}`;
      this.setState({
        ...this.refreshedState(now),
        lastDraftAt: nowIso,
        lastFailureCode: null,
      });
      this.recordEvent("draft_created", `blog-writing-agent:${source}`, id, {
        runKey,
        topicKey: brief.key,
        manifestVersion: DAILY_SOURCE_MANIFEST_VERSION,
        riskClass: brief.riskClass,
        sourceCount: brief.sources.length,
        contentSha256: await sha256(JSON.stringify(publication)),
        autonomousPublishingEnabled: automatic,
      });
      if (automatic) {
        return this.autonomouslyPublishDraft(
          id,
          runKey,
          brief,
          health.fresh,
          publication,
        );
      }
      return { code: "DRAFT_CREATED" as const, id };
    } catch (error) {
      const code = failureCode(error);
      const failedAt = new Date().toISOString();
      void this.sql`UPDATE blog_agent_runs SET status = 'failed',
        failure_code = ${code}, updated_at = ${failedAt}
        WHERE run_key = ${runKey}`;
      this.setState({
        ...this.refreshedState(new Date()),
        lastFailureCode: code,
      });
      this.recordEvent("draft_failed", `blog-writing-agent:${source}`, null, {
        runKey,
        code,
        manifestVersion: DAILY_SOURCE_MANIFEST_VERSION,
      });
      throw error;
    }
  }

  async prepareDailyDraft() {
    return this.createDraft(indiaDayKey(new Date()), "scheduled");
  }

  async prepareWeeklyDraft() {
    return this.createDraft(indiaDayKey(new Date()), "scheduled");
  }

  async prepareDraftNow() {
    return this.createDraft(indiaDayKey(new Date()), "manual");
  }

  async pauseDailySchedule(rawInput: unknown) {
    const input = blogScheduleControlSchema.parse(rawInput);
    const cancelledScheduleIds = await this.cancelEditorialSchedules(null);
    this.setState({
      ...this.refreshedState(new Date()),
      scheduleId: null,
      schedulePaused: true,
      nextScheduledRunAt: null,
    });
    this.recordEvent("schedule_paused", input.operatorId, null, {
      reason: input.reason,
      cancelledScheduleIds,
    });
    return { code: "PAUSED" as const, cancelledScheduleIds };
  }

  async resumeDailySchedule(rawInput: unknown) {
    const input = blogScheduleControlSchema.parse(rawInput);
    this.setState({
      ...this.refreshedState(new Date()),
      schedulePaused: false,
    });
    const scheduled = await this.ensureDailySchedule();
    this.recordEvent("schedule_resumed", input.operatorId, null, {
      reason: input.reason,
      scheduleId: scheduled.id,
      cronUtc: DAILY_EDITORIAL_CRON_UTC,
    });
    return { code: "SCHEDULED" as const, scheduleId: scheduled.id };
  }

  async listDrafts(limit = 20): Promise<BlogAgentDraft[]> {
    const safeLimit = Number.isInteger(limit) ? Math.max(1, Math.min(limit, 40)) : 20;
    return this.sql<DraftRow>`SELECT id, week_key, run_key, status, topic,
      content_json, model, source_manifest_version, source_reviewed_at,
      risk_class, generation_status, failure_code, revision, created_at,
      reviewed_at, reviewer_id, review_reason, quality_outcome,
      publication_verification_status, publication_verified_at,
      publication_verification_code, publication_mode,
      publication_policy_version, publication_idempotency_key,
      content_sha256, visibility_status
      FROM blog_agent_drafts ORDER BY created_at DESC LIMIT ${safeLimit}`
      .map(draftFromRow);
  }

  async replaceDraft(rawInput: unknown) {
    const input = blogDraftReplacementSchema.parse(rawInput);
    const current = this.sql<DraftRow>`SELECT id, week_key, run_key, status,
      topic, content_json, model, source_manifest_version, source_reviewed_at,
      risk_class, generation_status, failure_code, revision, created_at,
      reviewed_at, reviewer_id, review_reason, quality_outcome,
      publication_verification_status, publication_verified_at,
      publication_verification_code, publication_mode,
      publication_policy_version, publication_idempotency_key,
      content_sha256, visibility_status
      FROM blog_agent_drafts WHERE id = ${input.id} LIMIT 1`[0];
    if (!current) throw new Error("BLOG_DRAFT_NOT_FOUND");
    if (current.status !== "awaiting_review") {
      throw new Error("BLOG_DRAFT_ALREADY_REVIEWED");
    }
    if (current.revision !== input.expectedRevision) {
      throw new Error("BLOG_DRAFT_REVISION_CONFLICT");
    }
    const updatedAt = new Date().toISOString();
    const publication = blogPublicationSchema.parse({
      ...input.publication,
      updatedAt,
    });
    const nextRevision = current.revision + 1;
    const contentJson = JSON.stringify(publication);
    void this.sql`UPDATE blog_agent_drafts SET content_json = ${contentJson},
      revision = ${nextRevision}
      WHERE id = ${input.id} AND status = 'awaiting_review'
        AND revision = ${input.expectedRevision}`;
    this.recordEvent("draft_replaced", input.editorId, input.id, {
      priorRevision: current.revision,
      revision: nextRevision,
      contentSha256: await sha256(contentJson),
    });
    return { code: "DRAFT_REPLACED" as const, revision: nextRevision };
  }

  async reviewDraft(rawInput: unknown) {
    const input = blogDraftReviewSchema.parse(rawInput);
    const current = this.sql<DraftRow>`SELECT id, week_key, run_key, status,
      topic, content_json, model, source_manifest_version, source_reviewed_at,
      risk_class, generation_status, failure_code, revision, created_at,
      reviewed_at, reviewer_id, review_reason, quality_outcome,
      publication_verification_status, publication_verified_at,
      publication_verification_code, publication_mode,
      publication_policy_version, publication_idempotency_key,
      content_sha256, visibility_status
      FROM blog_agent_drafts WHERE id = ${input.id} LIMIT 1`[0];
    if (!current) throw new Error("BLOG_DRAFT_NOT_FOUND");
    if (current.status !== "awaiting_review") {
      return { code: "ALREADY_REVIEWED" as const, status: current.status };
    }
    if (current.revision !== input.expectedRevision) {
      throw new Error("BLOG_DRAFT_REVISION_CONFLICT");
    }
    const status = input.decision === "publish" ? "published" : "rejected";
    const reviewedAt = new Date().toISOString();
    const currentPublication = blogPublicationSchema.parse(
      JSON.parse(current.content_json),
    );
    const publication = status === "published"
      ? blogPublicationSchema.parse({
          ...currentPublication,
          publishedAt: reviewedAt,
          updatedAt: reviewedAt,
        })
      : currentPublication;
    const contentJson = JSON.stringify(publication);
    const contentSha256 = status === "published"
      ? await blogPublicationFingerprint(publication)
      : null;
    const publicationIdempotencyKey = status === "published"
      ? `manual-publish:${input.id}:${input.expectedRevision}`
      : null;
    void this.sql`UPDATE blog_agent_drafts SET
      status = ${status}, content_json = ${contentJson},
      reviewed_at = ${reviewedAt}, reviewer_id = ${input.reviewerId},
      review_reason = ${input.reason}, quality_outcome = ${input.qualityOutcome},
      publication_verification_status = ${status === "published" ? "pending" : null},
      publication_verified_at = NULL, publication_verification_code = NULL,
      publication_mode = 'manual', publication_policy_version = NULL,
      publication_idempotency_key = ${publicationIdempotencyKey},
      content_sha256 = ${contentSha256},
      visibility_status = ${status === "published" ? "provisional" : "private"}
      WHERE id = ${input.id} AND status = 'awaiting_review'
        AND revision = ${input.expectedRevision}`;
    this.recordEvent("draft_reviewed", input.reviewerId, input.id, {
      decision: input.decision,
      qualityOutcome: input.qualityOutcome,
      reason: input.reason,
      revision: current.revision,
      contentSha256: contentSha256 ?? await sha256(contentJson),
    });
    return {
      code: status === "published" ? "PUBLISHED" as const : "REJECTED" as const,
      publication,
    };
  }

  async recordPublicationVerification(rawInput: unknown) {
    const input = blogPublicationVerificationSchema.parse(rawInput);
    const current = this.sql<{
      status: string;
      content_sha256: string | null;
    }>`SELECT status, content_sha256
      FROM blog_agent_drafts WHERE id = ${input.id} LIMIT 1`[0];
    if (!current) throw new Error("BLOG_DRAFT_NOT_FOUND");
    if (current.status !== "published") {
      throw new Error("BLOG_PUBLICATION_NOT_PUBLISHED");
    }
    if (current.content_sha256
      && current.content_sha256 !== input.expectedContentSha256) {
      throw new Error("BLOG_PUBLICATION_VERIFICATION_STALE");
    }
    const verifiedAt = new Date().toISOString();
    void this.sql`UPDATE blog_agent_drafts SET
      publication_verification_status = ${input.status},
      publication_verified_at = ${verifiedAt},
      publication_verification_code = ${input.code},
      content_sha256 = COALESCE(content_sha256, ${input.expectedContentSha256}),
      visibility_status = ${input.status === "verified" ? "public" : "quarantined"}
      WHERE id = ${input.id} AND status = 'published'`;
    this.recordEvent("publication_verified", input.verifierId, input.id, {
      status: input.status,
      code: input.code,
      contentSha256: input.expectedContentSha256,
      visibilityStatus: input.status === "verified" ? "public" : "quarantined",
    });
    if (input.status === "failed") {
      await this.cancelEditorialSchedules(null);
      this.setState({
        ...this.refreshedState(new Date()),
        scheduleId: null,
        schedulePaused: true,
        nextScheduledRunAt: null,
        lastFailureCode: input.code,
      });
    }
    return { code: input.status === "verified" ? "VERIFIED" as const : "FAILED" as const };
  }

  async listPublished(): Promise<BlogPublication[]> {
    return this.sql<PublishedRow>`SELECT content_json FROM blog_agent_drafts
      WHERE status = 'published'
        AND visibility_status IN ('provisional', 'public')
      ORDER BY reviewed_at DESC LIMIT 50`
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
        ...this.refreshedState(new Date()),
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
    const daily = schedules.find((schedule) => schedule.callback === DAILY_EDITORIAL_CALLBACK);
    const currentRunKey = indiaDayKey(now);
    const todayRun = this.sql<DailyRunRow>`SELECT run_key, source, status,
      topic_key, draft_id, failure_code, created_at, updated_at
      FROM blog_agent_runs WHERE run_key = ${currentRunKey} LIMIT 1`[0] ?? null;
    const reviewMetrics = this.sql<ReviewMetricRow>`SELECT
      COALESCE(SUM(CASE WHEN status = 'awaiting_review' THEN 1 ELSE 0 END), 0) AS awaiting_review,
      COALESCE(SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END), 0) AS published,
      COALESCE(SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END), 0) AS rejected,
      COALESCE(SUM(CASE WHEN quality_outcome = 'approved' THEN 1 ELSE 0 END), 0) AS approved,
      COALESCE(SUM(CASE WHEN quality_outcome = 'light_edits' THEN 1 ELSE 0 END), 0) AS light_edits,
      COALESCE(SUM(CASE WHEN quality_outcome = 'heavy_edits' THEN 1 ELSE 0 END), 0) AS heavy_edits,
      MIN(CASE WHEN status = 'awaiting_review' THEN created_at END) AS oldest_awaiting_review_at
      FROM blog_agent_drafts`[0] ?? {
        awaiting_review: 0,
        published: 0,
        rejected: 0,
        approved: 0,
        light_edits: 0,
        heavy_edits: 0,
        oldest_awaiting_review_at: null,
      };
    const publicationMetrics = this.sql<PublicationMetricRow>`SELECT
      COALESCE(SUM(CASE
        WHEN publication_mode = 'autonomous'
          AND status = 'published'
          AND substr(run_key, 1, 7) = ${indiaMonthKey(now)}
        THEN 1 ELSE 0 END), 0) AS autonomous_published_this_month,
      COALESCE(SUM(CASE WHEN visibility_status = 'provisional' THEN 1 ELSE 0 END), 0)
        AS provisional_publications,
      COALESCE(SUM(CASE WHEN visibility_status = 'quarantined' THEN 1 ELSE 0 END), 0)
        AS quarantined_publications
      FROM blog_agent_drafts`[0] ?? {
        autonomous_published_this_month: 0,
        provisional_publications: 0,
        quarantined_publications: 0,
      };
    const sourceReviews = DAILY_EDITORIAL_TOPICS
      .flatMap((brief) => brief.sources)
      .map((source) => source.reviewedAt)
      .sort();
    const staleSourceUrls = new Set(
      DAILY_EDITORIAL_TOPICS.flatMap((brief) => sourceHealth(brief, now).staleUrls),
    );
    return {
      ...current,
      monthKey: monthKey(now),
      scheduleId: daily?.id ?? null,
      schedulePaused: current.schedulePaused,
      scheduleState: current.schedulePaused
        ? "paused"
        : daily
          ? "scheduled"
          : "missing",
      scheduleCronUtc: DAILY_EDITORIAL_CRON_UTC,
      scheduleTimeZone: DAILY_EDITORIAL_TIME_ZONE,
      nextScheduledRunAt: daily
        ? new Date(daily.time * 1_000).toISOString()
        : null,
      currentRunKey,
      todayRun: todayRun ? dailyRunFromRow(todayRun) : null,
      dailyDraftLimit: DAILY_DRAFT_LIMIT,
      monthlyDraftLimit: MONTHLY_DRAFT_LIMIT,
      sourceManifestVersion: DAILY_SOURCE_MANIFEST_VERSION,
      oldestSourceReviewedAt: sourceReviews[0] ?? null,
      staleSourceCount: staleSourceUrls.size,
      reviewMetrics: {
        awaitingReview: reviewMetrics.awaiting_review,
        published: reviewMetrics.published,
        rejected: reviewMetrics.rejected,
        approved: reviewMetrics.approved,
        lightEdits: reviewMetrics.light_edits,
        heavyEdits: reviewMetrics.heavy_edits,
        oldestAwaitingReviewAt: reviewMetrics.oldest_awaiting_review_at,
      },
      autonomousPublishingEnabled: autonomousPublishingEnabled(
        this.env.BLOG_AUTONOMOUS_PUBLISHING,
      ),
      autonomousPolicyVersion: AUTONOMOUS_PUBLICATION_POLICY_VERSION,
      autonomousPublishedThisMonth:
        publicationMetrics.autonomous_published_this_month,
      provisionalPublications: publicationMetrics.provisional_publications,
      quarantinedPublications: publicationMetrics.quarantined_publications,
      monthlyBudgetUsd: boundedMoney(this.env.BLOG_WRITING_MONTHLY_BUDGET_USD),
      model: configuredModel(this.env.BLOG_WRITING_MODEL),
    };
  }
}
