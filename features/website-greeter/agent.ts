import { Agent, type AgentContext } from "agents";
import type { WorkersAiBinding } from "@/lib/cloudflare-bindings";
import {
  websiteGreeterRequestSchema,
  type WebsiteGreeterReply,
  type WebsiteGreeterState,
} from "./contracts";
import {
  approvedGreeterAnswer,
  safeHandoffAnswer,
  WEBSITE_GREETER_SYSTEM_PROMPT,
} from "./knowledge";
import { aiText } from "./response";
import type { AiFleetBudgetAgent } from "@/features/ai-budget/agent";
import { runBudgetedAi } from "@/features/ai-budget/inference";
import { createBudgetedAiRuntime } from "@/features/ai-budget/runtime";

const DEFAULT_MODEL = "@cf/ibm-granite/granite-4.0-h-micro";
const SUPPORTED_MODELS = new Set([DEFAULT_MODEL]);
const MAX_SESSION_REPLIES = 8;
const DEFAULT_MONTHLY_REPLY_LIMIT = 25_000;
const DEFAULT_DAILY_AI_REPLY_LIMIT = 1_000;
const DEFAULT_MONTHLY_AI_BUDGET_USD = 5;
const MODEL_INPUT_USD_PER_MILLION = 0.017;
const MODEL_OUTPUT_USD_PER_MILLION = 0.112;
const MAX_MODEL_OUTPUT_TOKENS = 160;

interface WebsiteGreetingAgentEnv extends Cloudflare.Env {
  AI?: WorkersAiBinding;
  AI_FLEET_BUDGET_AGENT?: DurableObjectNamespace<AiFleetBudgetAgent>;
  WEBSITE_GREETER_MODEL?: string;
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

function boundedInteger(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
}

function boundedMoney(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
}

function monthKey(date: Date) {
  return date.toISOString().slice(0, 7);
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function estimateTokens(value: string) {
  return Math.ceil(value.length / 3);
}

function conservativeInferenceMicros(message: string) {
  const inputTokens = estimateTokens(WEBSITE_GREETER_SYSTEM_PROMPT) + estimateTokens(message) + 32;
  const inputUsd = (inputTokens / 1_000_000) * MODEL_INPUT_USD_PER_MILLION;
  const outputUsd = (MAX_MODEL_OUTPUT_TOKENS / 1_000_000) * MODEL_OUTPUT_USD_PER_MILLION;
  return Math.max(1, Math.ceil((inputUsd + outputUsd) * 1_000_000));
}

function configuredModel(value: string | undefined) {
  const requested = value?.trim();
  return requested && SUPPORTED_MODELS.has(requested) ? requested : DEFAULT_MODEL;
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
    const retentionCutoff = new Date(Date.now() - 62 * 86_400_000).toISOString();
    void this.sql`DELETE FROM website_greeter_sessions WHERE last_seen_at < ${retentionCutoff}`;
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
      || nextState.uniqueSessionsThisMonth < 0) {
      throw new Error("WEBSITE_GREETER_STATE_INVALID");
    }
  }

  private refreshedState(now: Date) {
    const currentMonth = monthKey(now);
    return this.state.monthKey === currentMonth
      ? this.state
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

  async reply(rawInput: unknown): Promise<WebsiteGreeterReply> {
    const input = websiteGreeterRequestSchema.parse(rawInput);
    const now = new Date();
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
      return {
        ...safeHandoffAnswer("session"),
        source: "handoff",
        remainingSessionReplies: 0,
      };
    }
    if (current.repliesThisMonth >= monthlyReplyLimit) {
      return {
        ...safeHandoffAnswer("budget"),
        source: "handoff",
        remainingSessionReplies: MAX_SESSION_REPLIES - repliesInSession,
      };
    }

    const approved = approvedGreeterAnswer(input.message);
    if (approved) {
      const replyCount = this.recordReply(input.sessionId, now, false, 0);
      return {
        ...approved,
        source: "approved_answer",
        remainingSessionReplies: Math.max(0, MAX_SESSION_REPLIES - replyCount),
      };
    }

    const dailyAiLimit = boundedInteger(
      this.env.WEBSITE_GREETER_DAILY_AI_REPLY_LIMIT,
      DEFAULT_DAILY_AI_REPLY_LIMIT,
      10,
      10_000,
    );
    const aiToday = this.sql<DayRow>`SELECT ai_reply_count FROM website_greeter_days
      WHERE day_key = ${dayKey(now)} LIMIT 1`[0]?.ai_reply_count ?? 0;
    const reservedMicros = conservativeInferenceMicros(input.message);
    const monthlyBudgetMicros = Math.floor(boundedMoney(
      this.env.WEBSITE_GREETER_MONTHLY_BUDGET_USD,
      DEFAULT_MONTHLY_AI_BUDGET_USD,
      1,
      5,
    ) * 1_000_000);
    if (!this.env.AI
      || !this.env.AI_FLEET_BUDGET_AGENT
      || aiToday >= dailyAiLimit
      || current.estimatedAiSpendMicros + reservedMicros > monthlyBudgetMicros) {
      const replyCount = this.recordReply(input.sessionId, now, false, 0);
      return {
        ...safeHandoffAnswer("budget"),
        source: "handoff",
        remainingSessionReplies: Math.max(0, MAX_SESSION_REPLIES - replyCount),
      };
    }

    // Reserve the full conservative inference cost before yielding to the
    // model call. Durable Objects may interleave requests during I/O; an
    // up-front reservation prevents concurrent calls from crossing the cap.
    const replyCount = this.recordReply(input.sessionId, now, true, reservedMicros);
    try {
      const model = configuredModel(this.env.WEBSITE_GREETER_MODEL);
      const result = await runBudgetedAi(
        await createBudgetedAiRuntime(this.env),
        {
          workstream: "website_greeting",
          operation: "website_reply",
          model,
          input: {
            messages: [
              { role: "system", content: WEBSITE_GREETER_SYSTEM_PROMPT },
              { role: "user", content: `Visitor locale: ${input.locale}\nVisitor question: ${input.message}` },
            ],
            max_tokens: MAX_MODEL_OUTPUT_TOKENS,
            temperature: 0.2,
          },
        },
      );
      const text = aiText(result);
      if (!text) {
        console.warn("WEBSITE_GREETER_AI_EMPTY_RESPONSE", {
          responseType:
            result && typeof result === "object"
              ? typeof (result as { response?: unknown }).response
              : typeof result,
          resultKeys:
            result && typeof result === "object"
              ? Object.keys(result).slice(0, 8)
              : [],
        });
      }
      const answer = text
        ? { text, actions: [], source: "workers_ai" as const }
        : { ...safeHandoffAnswer(), source: "handoff" as const };
      return {
        ...answer,
        ...(!text ? { diagnosticCode: aiEmptyResponseCode(result) } : {}),
        remainingSessionReplies: Math.max(0, MAX_SESSION_REPLIES - replyCount),
      };
    } catch (error) {
      console.error(
        "WEBSITE_GREETER_AI_FAILED",
        error instanceof Error ? `${error.name}: ${error.message}` : "Unknown error",
      );
      return {
        ...safeHandoffAnswer(),
        source: "handoff",
        diagnosticCode: aiFailureCode(error),
        remainingSessionReplies: Math.max(0, MAX_SESSION_REPLIES - replyCount),
      };
    }
  }

  async budgetStatus() {
    const now = new Date();
    const current = this.refreshedState(now);
    return {
      ...current,
      model: configuredModel(this.env.WEBSITE_GREETER_MODEL),
      monthlyBudgetUsd: boundedMoney(
        this.env.WEBSITE_GREETER_MONTHLY_BUDGET_USD,
        DEFAULT_MONTHLY_AI_BUDGET_USD,
        1,
        5,
      ),
      monthlyReplyLimit: boundedInteger(
        this.env.WEBSITE_GREETER_MONTHLY_REPLY_LIMIT,
        DEFAULT_MONTHLY_REPLY_LIMIT,
        100,
        100_000,
      ),
    };
  }
}
