import { Agent, type AgentContext } from "agents";
import {
  websiteGreeterRequestSchema,
  websiteGreeterClearRequestSchema,
  websiteVisitRequestSchema,
  type WebsiteGreeterRequest,
  type WebsiteGreeterReply,
  type WebsiteGreeterSurface,
  type WebsiteGreeterState,
} from "./contracts";
import {
  approvedGreeterAnswer,
  safeHandoffAnswer,
  WEBSITE_GREETER_SYSTEM_PROMPT,
} from "./knowledge";
import { aiText } from "./response";
import type { AiFleetBudgetAgent } from "@/features/ai-budget/agent";
import {
  APPLICATION_MONTHLY_AI_SPEND_CEILING_USD,
  isGoogleWebsiteGreeterCanaryEnabled,
  resolveWebsiteGreeterMonthlyBudgetUsd,
  resolveWebsiteGreeterProviderConfiguration,
} from "./provider-config";
import {
  deleteGoogleWebsiteGreeterMemoryForSession,
  resolveWebsiteGreeterProvider,
  resolveWebsiteGreeterProviderForSurface,
  type WebsiteGreeterInferenceRequest,
  type WebsiteGreeterProviderRuntimeEnvironment,
} from "./provider.server";
import {
  WEBSITE_GREETER_CONTEXT_CONSENT_VERSION,
  WEBSITE_GREETER_CONTEXT_RETENTION_HOURS,
  WEBSITE_GREETER_MAX_CONTEXT_TURNS,
  boundWebsiteGreeterContext,
  createWebsiteGreeterMemoryScopeId,
  isWebsiteGreeterMemoryScopeId,
  sanitizeWebsiteGreeterContextText,
  type WebsiteGreeterAnonymousConversation,
  type WebsiteGreeterContextTurn,
} from "./conversation";
import type { WebsiteGreeterProviderId } from "./provider-config";

const MAX_SESSION_REPLIES = 8;
const DEFAULT_MONTHLY_REPLY_LIMIT = 25_000;
const DEFAULT_DAILY_AI_REPLY_LIMIT = 1_000;
const MAX_MODEL_OUTPUT_TOKENS = 160;
const MEMORY_WITHDRAWAL_PENDING_VERSION = "memory-withdrawal-pending-v1";

interface WebsiteGreetingAgentEnv
  extends Cloudflare.Env, WebsiteGreeterProviderRuntimeEnvironment {
  AI_FLEET_BUDGET_AGENT?: DurableObjectNamespace<AiFleetBudgetAgent>;
  WEBSITE_GREETER_MONTHLY_REPLY_LIMIT?: string;
  WEBSITE_GREETER_DAILY_AI_REPLY_LIMIT?: string;
  WEBSITE_GREETER_MONTHLY_BUDGET_USD?: string;
}

type SessionRow = {
  month_key: string;
  reply_count: number;
};

type DayRow = {
  ai_reply_count: number;
};

type VisitRow = {
  day_key: string;
};

type VisitTotalRow = {
  total_visits: number;
};

type ConversationTurnRow = {
  role: "user" | "assistant";
  content: string;
  locale: WebsiteGreeterContextTurn["locale"];
};

type ConversationSessionRow = {
  consent_version: string;
  provider_id: WebsiteGreeterProviderId | null;
  provider_session_id: string | null;
  expires_at: string;
};

function boundedInteger(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
}

function monthKey(date: Date) {
  return date.toISOString().slice(0, 7);
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function aiFailureCode(error: unknown): `AI_${string}` {
  const message = error instanceof Error ? error.message : "";
  const upstreamCode = message.match(/(?:code\D{0,4})?(\d{3,6})/i)?.[1];
  if (upstreamCode) return `AI_ERROR_${upstreamCode}`;
  if (/billing|credit|payment|quota|rate.?limit/i.test(message)) {
    return "AI_QUOTA_UNAVAILABLE";
  }
  if (/budget/i.test(message)) return "AI_BUDGET_UNAVAILABLE";
  if (/model|not found|unsupported/i.test(message)) {
    return "AI_MODEL_UNAVAILABLE";
  }
  if (/binding|undefined|not a function/i.test(message)) {
    return "AI_BINDING_UNAVAILABLE";
  }
  return "AI_INFERENCE_UNAVAILABLE";
}

function aiEmptyResponseCode(result: unknown): `AI_${string}` {
  if (!result || typeof result !== "object") {
    return `AI_EMPTY_${typeof result}`.toUpperCase() as `AI_${string}`;
  }
  const responseType = typeof (result as { response?: unknown }).response;
  const keys = Object.keys(result)
    .slice(0, 6)
    .map((key) => key.replace(/[^A-Za-z0-9]/g, "").toUpperCase())
    .filter(Boolean)
    .join("_") || "NO_KEYS";
  return `AI_EMPTY_${responseType.toUpperCase()}_${keys}`;
}

export class WebsiteGreetingAgent extends Agent<
  WebsiteGreetingAgentEnv,
  WebsiteGreeterState
> {
  initialState: WebsiteGreeterState = {
    monthKey: "1970-01",
    repliesThisMonth: 0,
    aiRepliesThisMonth: 0,
    estimatedAiSpendMicros: 0,
    uniqueSessionsThisMonth: 0,
    lastReplyAt: null,
    totalVisits: 0,
    visitsThisMonth: 0,
  };

  constructor(ctx: AgentContext, env: WebsiteGreetingAgentEnv) {
    super(ctx, env);
  }

  async onStart() {
    void this.sql`CREATE TABLE IF NOT EXISTS website_greeter_sessions (
      session_id TEXT PRIMARY KEY,
      month_key TEXT NOT NULL,
      reply_count INTEGER NOT NULL,
      last_seen_at TEXT NOT NULL
    )`;
    void this.sql`CREATE TABLE IF NOT EXISTS website_greeter_days (
      day_key TEXT PRIMARY KEY,
      ai_reply_count INTEGER NOT NULL
    )`;
    void this.sql`CREATE TABLE IF NOT EXISTS website_visit_sessions (
      session_id TEXT PRIMARY KEY,
      day_key TEXT NOT NULL,
      last_seen_at TEXT NOT NULL,
      last_path TEXT NOT NULL
    )`;
    void this.sql`CREATE TABLE IF NOT EXISTS website_visit_totals (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      total_visits INTEGER NOT NULL,
      last_updated_at TEXT NOT NULL
    )`;
    void this.sql`CREATE TABLE IF NOT EXISTS website_greeter_conversations (
      session_id TEXT PRIMARY KEY,
      consent_version TEXT NOT NULL,
      provider_id TEXT,
      provider_session_id TEXT,
      created_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    )`;
    void this.sql`CREATE TABLE IF NOT EXISTS website_greeter_conversation_turns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      locale TEXT NOT NULL CHECK (locale IN ('en-IN', 'te-IN', 'hi-IN')),
      created_at TEXT NOT NULL
    )`;
    void this.sql`CREATE INDEX IF NOT EXISTS website_greeter_turns_session_created
      ON website_greeter_conversation_turns (session_id, created_at, id)`;
    // Seed the lifetime counter once from the prior Agent state. The conflict
    // clause is deliberate: deployments must never replace the existing total.
    void this.sql`INSERT INTO website_visit_totals (
        id, total_visits, last_updated_at
      ) VALUES (1, ${Math.max(0, this.state.totalVisits)}, ${new Date().toISOString()})
      ON CONFLICT(id) DO NOTHING`;
    const retentionCutoff = new Date(Date.now() - 62 * 86_400_000).toISOString();
    void this.sql`DELETE FROM website_greeter_sessions WHERE last_seen_at < ${retentionCutoff}`;
    void this.sql`DELETE FROM website_visit_sessions WHERE last_seen_at < ${retentionCutoff}`;
    void this.pruneExpiredConversations();
  }

  validateStateChange(nextState: WebsiteGreeterState) {
    if (!/^\d{4}-\d{2}$/.test(nextState.monthKey)
      || !Number.isInteger(nextState.repliesThisMonth)
      || nextState.repliesThisMonth < 0
      || !Number.isInteger(nextState.aiRepliesThisMonth)
      || nextState.aiRepliesThisMonth < 0
      || !Number.isInteger(nextState.estimatedAiSpendMicros)
      || nextState.estimatedAiSpendMicros < 0
      || !Number.isInteger(nextState.uniqueSessionsThisMonth)
      || nextState.uniqueSessionsThisMonth < 0
      || !Number.isInteger(nextState.totalVisits)
      || nextState.totalVisits < 0
      || !Number.isInteger(nextState.visitsThisMonth)
      || nextState.visitsThisMonth < 0) {
      throw new Error("WEBSITE_GREETER_STATE_INVALID");
    }
  }

  private refreshedState(now: Date) {
    const currentMonth = monthKey(now);
    const stored = { ...this.initialState, ...this.state };
    return stored.monthKey === currentMonth
      ? stored
      : {
          ...this.initialState,
          monthKey: currentMonth,
        };
  }

  private recordReply(sessionId: string, now: Date, ai: boolean, reservedMicros: number) {
    const current = this.refreshedState(now);
    const currentMonth = monthKey(now);
    const rows = this.sql<SessionRow>`SELECT month_key, reply_count
      FROM website_greeter_sessions WHERE session_id = ${sessionId} LIMIT 1`;
    const existing = rows[0];
    const replyCount = existing?.month_key === currentMonth ? existing.reply_count + 1 : 1;
    const newSession = !existing || existing.month_key !== currentMonth;
    void this.sql`INSERT INTO website_greeter_sessions (
        session_id, month_key, reply_count, last_seen_at
      ) VALUES (${sessionId}, ${currentMonth}, ${replyCount}, ${now.toISOString()})
      ON CONFLICT(session_id) DO UPDATE SET
        month_key = excluded.month_key,
        reply_count = excluded.reply_count,
        last_seen_at = excluded.last_seen_at`;
    if (ai) {
      const currentDay = dayKey(now);
      void this.sql`INSERT INTO website_greeter_days (day_key, ai_reply_count)
        VALUES (${currentDay}, 1)
        ON CONFLICT(day_key) DO UPDATE SET
          ai_reply_count = website_greeter_days.ai_reply_count + 1`;
    }
    this.setState({
      ...current,
      repliesThisMonth: current.repliesThisMonth + 1,
      aiRepliesThisMonth: current.aiRepliesThisMonth + (ai ? 1 : 0),
      estimatedAiSpendMicros: current.estimatedAiSpendMicros + reservedMicros,
      uniqueSessionsThisMonth: current.uniqueSessionsThisMonth + (newSession ? 1 : 0),
      lastReplyAt: now.toISOString(),
    });
    return replyCount;
  }

  async recordVisit(rawInput: unknown) {
    const input = websiteVisitRequestSchema.parse(rawInput);
    const now = new Date();
    const current = this.refreshedState(now);
    const today = dayKey(now);
    const existing = this.sql<VisitRow>`SELECT day_key
      FROM website_visit_sessions WHERE session_id = ${input.sessionId} LIMIT 1`[0];
    const newVisit = !existing || existing.day_key !== today;
    const storedTotal = this.sql<VisitTotalRow>`SELECT total_visits
      FROM website_visit_totals WHERE id = 1 LIMIT 1`[0]?.total_visits
      ?? current.totalVisits;

    void this.sql`INSERT INTO website_visit_sessions (
        session_id, day_key, last_seen_at, last_path
      ) VALUES (${input.sessionId}, ${today}, ${now.toISOString()}, ${input.path})
      ON CONFLICT(session_id) DO UPDATE SET
        day_key = excluded.day_key,
        last_seen_at = excluded.last_seen_at,
        last_path = excluded.last_path`;

    if (newVisit) {
      const nextTotal = storedTotal + 1;
      void this.sql`UPDATE website_visit_totals
        SET total_visits = ${nextTotal}, last_updated_at = ${now.toISOString()}
        WHERE id = 1`;
      this.setState({
        ...current,
        totalVisits: nextTotal,
        visitsThisMonth: current.visitsThisMonth + 1,
      });
    }

    return this.visitCount();
  }

  visitCount() {
    const current = this.refreshedState(new Date());
    const storedTotal = this.sql<VisitTotalRow>`SELECT total_visits
      FROM website_visit_totals WHERE id = 1 LIMIT 1`[0]?.total_visits
      ?? current.totalVisits;
    return {
      totalVisits: storedTotal,
      visitsThisMonth: current.visitsThisMonth,
    };
  }

  private pruneConversationHistory(now: Date) {
    try {
      const cutoff = new Date(
        now.getTime() - WEBSITE_GREETER_CONTEXT_RETENTION_HOURS * 3_600_000,
      ).toISOString();
      void this.sql`DELETE FROM website_greeter_conversation_turns
        WHERE created_at < ${cutoff}`;
      void this.sql`DELETE FROM website_greeter_conversations
        WHERE expires_at <= ${now.toISOString()}
          AND provider_session_id IS NULL`;
    } catch {
      // Context is optional. Reply generation must remain available if its
      // local persistence is temporarily unavailable.
    }
  }

  async pruneExpiredConversations() {
    const now = new Date();
    this.pruneConversationHistory(now);
    let cleared = true;
    try {
      const expired = this.sql<{ session_id: string }>`SELECT session_id
        FROM website_greeter_conversations
        WHERE expires_at <= ${now.toISOString()}
        ORDER BY expires_at ASC
        LIMIT 50`;
      for (const row of expired) {
        cleared = await this.clearConversationData(row.session_id) && cleared;
      }
    } catch {
      cleared = false;
    }
    return { ok: cleared };
  }

  private conversationSessionRow(sessionId: string) {
    return this.sql<ConversationSessionRow>`SELECT
        consent_version, provider_id, provider_session_id, expires_at
      FROM website_greeter_conversations
      WHERE session_id = ${sessionId}
      LIMIT 1`[0] ?? null;
  }

  private anonymousConversation(
    sessionId: string,
    row: ConversationSessionRow,
  ): WebsiteGreeterAnonymousConversation {
    const providerSessionId = row.provider_session_id;
    const providerSession = row.provider_id === "google_vertex_agent_engine"
      && isWebsiteGreeterMemoryScopeId(providerSessionId)
      ? {
          providerId: "google_vertex_agent_engine" as const,
          providerSessionId: providerSessionId as string,
        }
      : null;
    return {
      anonymousSessionId: sessionId,
      consentVersion: WEBSITE_GREETER_CONTEXT_CONSENT_VERSION,
      expiresAt: row.expires_at,
      providerSession,
    };
  }

  private async ensureGoogleMemorySession(
    sessionId: string,
    now: Date,
  ): Promise<WebsiteGreeterAnonymousConversation | null> {
    try {
      const existing = this.conversationSessionRow(sessionId);
      if (existing
        && existing.consent_version === WEBSITE_GREETER_CONTEXT_CONSENT_VERSION
        && existing.provider_id === "google_vertex_agent_engine"
        && isWebsiteGreeterMemoryScopeId(existing.provider_session_id)
        && Date.parse(existing.expires_at) > now.getTime()) {
        const expiresAt = new Date(
          now.getTime() + WEBSITE_GREETER_CONTEXT_RETENTION_HOURS * 3_600_000,
        ).toISOString();
        void this.sql`UPDATE website_greeter_conversations
          SET last_seen_at = ${now.toISOString()}, expires_at = ${expiresAt}
          WHERE session_id = ${sessionId}`;
        return this.anonymousConversation(sessionId, {
          ...existing,
          expires_at: expiresAt,
        });
      }
      if (existing && !await this.clearConversationData(sessionId)) return null;

      const timestamp = now.toISOString();
      const expiresAt = new Date(
        now.getTime() + WEBSITE_GREETER_CONTEXT_RETENTION_HOURS * 3_600_000,
      ).toISOString();
      const scopeId = createWebsiteGreeterMemoryScopeId();
      void this.sql`INSERT INTO website_greeter_conversations (
          session_id, consent_version, provider_id, provider_session_id,
          created_at, last_seen_at, expires_at
        ) VALUES (
          ${sessionId}, ${WEBSITE_GREETER_CONTEXT_CONSENT_VERSION},
          'google_vertex_agent_engine', ${scopeId},
          ${timestamp}, ${timestamp}, ${expiresAt}
        )`;
      return {
        anonymousSessionId: sessionId,
        consentVersion: WEBSITE_GREETER_CONTEXT_CONSENT_VERSION,
        expiresAt,
        providerSession: {
          providerId: "google_vertex_agent_engine" as const,
          providerSessionId: scopeId,
        },
      };
    } catch {
      return null;
    }
  }

  private conversationContext(sessionId: string, now: Date) {
    try {
      this.pruneConversationHistory(now);
      const session = this.sql<{ expires_at: string }>`SELECT expires_at
        FROM website_greeter_conversations
        WHERE session_id = ${sessionId}
          AND consent_version = ${WEBSITE_GREETER_CONTEXT_CONSENT_VERSION}
        LIMIT 1`[0];
      if (!session || Date.parse(session.expires_at) <= now.getTime()) return [];
      const rows = this.sql<ConversationTurnRow>`SELECT role, content, locale
        FROM website_greeter_conversation_turns
        WHERE session_id = ${sessionId}
        ORDER BY created_at DESC, id DESC
        LIMIT ${WEBSITE_GREETER_MAX_CONTEXT_TURNS}`;
      return boundWebsiteGreeterContext([...rows].reverse());
    } catch {
      return [];
    }
  }

  private async clearConversationData(sessionId: string) {
    try {
      void this.sql`DELETE FROM website_greeter_conversation_turns
        WHERE session_id = ${sessionId}`;
      const row = this.conversationSessionRow(sessionId);
      if (!row) return true;
      void this.sql`UPDATE website_greeter_conversations
        SET consent_version = ${MEMORY_WITHDRAWAL_PENDING_VERSION}
        WHERE session_id = ${sessionId}`;
      if (row
        && row.provider_id === "google_vertex_agent_engine"
        && isWebsiteGreeterMemoryScopeId(row.provider_session_id)) {
        try {
          const conversation = this.anonymousConversation(sessionId, row);
          await deleteGoogleWebsiteGreeterMemoryForSession(
            this.env,
            conversation.providerSession,
          );
        } catch {
          // Keep the opaque mapping so withdrawal/expiry cleanup can retry.
          return false;
        }
      } else if (row.provider_id === "google_vertex_agent_engine"
        && row.provider_session_id) {
        // Never discard a Google mapping that cannot be validated and safely
        // targeted. An operator can inspect it without risking a broad delete.
        return false;
      }
      void this.sql`DELETE FROM website_greeter_conversations
        WHERE session_id = ${sessionId}
          AND consent_version = ${MEMORY_WITHDRAWAL_PENDING_VERSION}`;
      return true;
    } catch {
      return false;
    }
  }

  async clearConversation(rawInput: unknown) {
    const input = websiteGreeterClearRequestSchema.parse(rawInput);
    return { cleared: await this.clearConversationData(input.sessionId) };
  }

  private recordConversationExchange(options: {
    input: WebsiteGreeterRequest;
    reply: WebsiteGreeterReply;
    providerId: WebsiteGreeterProviderId | null;
    now: Date;
  }) {
    if (!options.input.contextConsent) return;
    const userMessage = sanitizeWebsiteGreeterContextText(options.input.message);
    const assistantMessage = sanitizeWebsiteGreeterContextText(options.reply.text);
    if (!userMessage || !assistantMessage) return;
    try {
      if (this.conversationSessionRow(options.input.sessionId)?.consent_version
        === MEMORY_WITHDRAWAL_PENDING_VERSION) return;
      const timestamp = options.now.toISOString();
      const expiresAt = new Date(
        options.now.getTime() + WEBSITE_GREETER_CONTEXT_RETENTION_HOURS * 3_600_000,
      ).toISOString();
      void this.sql`INSERT INTO website_greeter_conversations (
          session_id, consent_version, provider_id, provider_session_id,
          created_at, last_seen_at, expires_at
        ) VALUES (
          ${options.input.sessionId}, ${WEBSITE_GREETER_CONTEXT_CONSENT_VERSION},
          ${options.providerId}, NULL, ${timestamp}, ${timestamp}, ${expiresAt}
        )
        ON CONFLICT(session_id) DO UPDATE SET
          consent_version = excluded.consent_version,
          provider_id = CASE
            WHEN website_greeter_conversations.provider_session_id IS NOT NULL
              THEN website_greeter_conversations.provider_id
            ELSE COALESCE(excluded.provider_id, website_greeter_conversations.provider_id)
          END,
          last_seen_at = excluded.last_seen_at,
          expires_at = excluded.expires_at`;
      void this.sql`INSERT INTO website_greeter_conversation_turns (
          session_id, role, content, locale, created_at
        ) VALUES (
          ${options.input.sessionId}, 'user', ${userMessage},
          ${options.input.locale}, ${timestamp}
        )`;
      void this.sql`INSERT INTO website_greeter_conversation_turns (
          session_id, role, content, locale, created_at
        ) VALUES (
          ${options.input.sessionId}, 'assistant', ${assistantMessage},
          ${options.input.locale}, ${timestamp}
        )`;
      void this.sql`DELETE FROM website_greeter_conversation_turns
        WHERE session_id = ${options.input.sessionId}
          AND id NOT IN (
            SELECT id FROM website_greeter_conversation_turns
            WHERE session_id = ${options.input.sessionId}
            ORDER BY created_at DESC, id DESC
            LIMIT ${WEBSITE_GREETER_MAX_CONTEXT_TURNS}
          )`;
    } catch {
      // A transcript failure degrades to the pre-existing single-turn path.
    }
  }

  private completeReply(
    input: WebsiteGreeterRequest,
    reply: WebsiteGreeterReply,
    now: Date,
    providerId: WebsiteGreeterProviderId | null = null,
  ) {
    this.recordConversationExchange({ input, reply, providerId, now });
    return reply;
  }

  async reply(
    rawInput: unknown,
    surface: WebsiteGreeterSurface = "site_launcher",
  ): Promise<WebsiteGreeterReply> {
    const input = websiteGreeterRequestSchema.parse(rawInput);
    const now = new Date();
    if (!input.contextConsent) await this.clearConversationData(input.sessionId);
    const current = this.refreshedState(now);
    const monthlyReplyLimit = boundedInteger(
      this.env.WEBSITE_GREETER_MONTHLY_REPLY_LIMIT,
      DEFAULT_MONTHLY_REPLY_LIMIT,
      100,
      100_000,
    );
    const session = this.sql<SessionRow>`SELECT month_key, reply_count
      FROM website_greeter_sessions WHERE session_id = ${input.sessionId} LIMIT 1`[0];
    const repliesInSession = session?.month_key === monthKey(now) ? session.reply_count : 0;
    if (repliesInSession >= MAX_SESSION_REPLIES) {
      return this.completeReply(input, {
        ...safeHandoffAnswer("session", input.locale),
        source: "handoff",
        remainingSessionReplies: 0,
      }, now);
    }
    if (current.repliesThisMonth >= monthlyReplyLimit) {
      return this.completeReply(input, {
        ...safeHandoffAnswer("budget", input.locale),
        source: "handoff",
        remainingSessionReplies: MAX_SESSION_REPLIES - repliesInSession,
      }, now);
    }

    const approved = approvedGreeterAnswer(input.message, input.locale);
    if (approved) {
      const replyCount = this.recordReply(input.sessionId, now, false, 0);
      return this.completeReply(input, {
        ...approved,
        source: "approved_answer",
        remainingSessionReplies: Math.max(0, MAX_SESSION_REPLIES - replyCount),
      }, now);
    }

    const dailyAiLimit = boundedInteger(
      this.env.WEBSITE_GREETER_DAILY_AI_REPLY_LIMIT,
      DEFAULT_DAILY_AI_REPLY_LIMIT,
      10,
      10_000,
    );
    const aiToday = this.sql<DayRow>`SELECT ai_reply_count FROM website_greeter_days
      WHERE day_key = ${dayKey(now)} LIMIT 1`[0]?.ai_reply_count ?? 0;
    // The dedicated /chat surface is the only Google canary. The existing
    // public launcher remains on Cloudflare for an immediate rollback path.
    const providerResolution = resolveWebsiteGreeterProviderForSurface(
      this.env,
      surface,
    );
    const providerSession = input.contextConsent
      && providerResolution.ok
      && providerResolution.provider.id === "google_vertex_agent_engine"
      ? await this.ensureGoogleMemorySession(input.sessionId, now)
      : null;
    const inferenceRequest: WebsiteGreeterInferenceRequest = {
      systemPrompt: WEBSITE_GREETER_SYSTEM_PROMPT,
      message: input.message,
      locale: input.locale,
      history: input.contextConsent
        ? this.conversationContext(input.sessionId, now)
        : [],
      session: input.contextConsent
        ? providerSession ?? {
            anonymousSessionId: input.sessionId,
            consentVersion: WEBSITE_GREETER_CONTEXT_CONSENT_VERSION,
            expiresAt: new Date(
              now.getTime() + WEBSITE_GREETER_CONTEXT_RETENTION_HOURS * 3_600_000,
            ).toISOString(),
            providerSession: null,
          }
        : null,
      maxOutputTokens: MAX_MODEL_OUTPUT_TOKENS,
      temperature: 0.2,
    };
    const reservedMicros = providerResolution.ok
      ? providerResolution.provider.conservativeCostMicros(inferenceRequest)
      : 0;
    const monthlyBudgetMicros = Math.floor(
      resolveWebsiteGreeterMonthlyBudgetUsd(
        this.env.WEBSITE_GREETER_MONTHLY_BUDGET_USD,
      ) * 1_000_000,
    );
    if (!providerResolution.ok
      || aiToday >= dailyAiLimit
      || current.estimatedAiSpendMicros + reservedMicros > monthlyBudgetMicros) {
      const replyCount = this.recordReply(input.sessionId, now, false, 0);
      return this.completeReply(input, {
        ...safeHandoffAnswer("budget", input.locale),
        source: "handoff",
        remainingSessionReplies: Math.max(0, MAX_SESSION_REPLIES - replyCount),
      }, now);
    }

    // Reserve the full conservative inference cost before yielding to the
    // model call. Durable Objects may interleave requests during I/O; an
    // up-front reservation prevents concurrent calls from crossing the cap.
    const replyCount = this.recordReply(input.sessionId, now, true, reservedMicros);
    try {
      const generated = await providerResolution.provider.generate(inferenceRequest);
      const text = aiText(generated.value);
      if (!text) {
        console.warn("WEBSITE_GREETER_AI_EMPTY_RESPONSE", {
          responseType:
            generated.value && typeof generated.value === "object"
              ? typeof (generated.value as { response?: unknown }).response
              : typeof generated.value,
          resultKeys:
            generated.value && typeof generated.value === "object"
              ? Object.keys(generated.value).slice(0, 8)
              : [],
        });
      }
      const answer = text
        ? {
            text,
            actions: [],
            source: generated.providerId === "google_vertex_agent_engine"
              ? "google_agent_engine" as const
              : "workers_ai" as const,
          }
        : { ...safeHandoffAnswer(undefined, input.locale), source: "handoff" as const };
      return this.completeReply(input, {
        ...answer,
        ...(!text ? { diagnosticCode: aiEmptyResponseCode(generated.value) } : {}),
        remainingSessionReplies: Math.max(0, MAX_SESSION_REPLIES - replyCount),
      }, now, generated.providerId);
    } catch (error) {
      console.error(
        "WEBSITE_GREETER_AI_FAILED",
        error instanceof Error ? `${error.name}: ${error.message}` : "Unknown error",
      );
      return this.completeReply(input, {
        ...safeHandoffAnswer(undefined, input.locale),
        source: "handoff",
        diagnosticCode: aiFailureCode(error),
        remainingSessionReplies: Math.max(0, MAX_SESSION_REPLIES - replyCount),
      }, now, providerResolution.provider.id);
    }
  }

  async budgetStatus() {
    const now = new Date();
    const current = this.refreshedState(now);
    const provider = resolveWebsiteGreeterProviderConfiguration(this.env);
    const providerRuntime = resolveWebsiteGreeterProvider(this.env);
    const googleCanaryEnabled = isGoogleWebsiteGreeterCanaryEnabled(
      this.env.WEBSITE_GREETER_GOOGLE_CANARY_ENABLED,
    );
    const googleCanaryRuntime = resolveWebsiteGreeterProvider({
      ...this.env,
      WEBSITE_GREETER_PROVIDER: "google_vertex_agent_engine",
    });
    return {
      ...current,
      provider: provider.ok ? provider.configuration.provider : null,
      providerConfigurationCode: provider.ok ? null : provider.code,
      providerReady: providerRuntime.ok,
      providerRuntimeCode: providerRuntime.ok ? null : providerRuntime.code,
      model: provider.ok && provider.configuration.provider === "cloudflare_workers_ai"
        ? provider.configuration.model
        : null,
      googleCanaryEnabled,
      googleCanaryReady: googleCanaryRuntime.ok,
      googleCanaryRuntimeCode: googleCanaryRuntime.ok
        ? null
        : googleCanaryRuntime.code,
      monthlyBudgetUsd: resolveWebsiteGreeterMonthlyBudgetUsd(
        this.env.WEBSITE_GREETER_MONTHLY_BUDGET_USD,
      ),
      applicationMonthlyAiSpendCeilingUsd:
        APPLICATION_MONTHLY_AI_SPEND_CEILING_USD,
      monthlyReplyLimit: boundedInteger(
        this.env.WEBSITE_GREETER_MONTHLY_REPLY_LIMIT,
        DEFAULT_MONTHLY_REPLY_LIMIT,
        100,
        100_000,
      ),
    };
  }
}
