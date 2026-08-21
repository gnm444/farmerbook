import { Agent, type AgentContext } from "agents";
import {
  ownedSocialConnectorResponseSchema,
  socialChannelControlSchema,
  verifiedArticleEnvelopeSchema,
  type OwnedSocialChannel,
  type OwnedSocialPublisherStatus,
} from "./contracts";
import { buildOwnedSocialPost } from "./copy";

const CHANNELS = ["facebook", "instagram"] as const;
const DAILY_CHANNEL_LIMIT = 1;
const MONTHLY_CHANNEL_LIMIT = 31;

type OwnedSocialPublisherState = {
  paused: Record<OwnedSocialChannel, boolean>;
  lastCode: Record<OwnedSocialChannel, string | null>;
};

interface OwnedSocialPublisherEnv extends Cloudflare.Env {
  OWNED_SOCIAL_CONNECTOR?: Fetcher;
  OWNED_SOCIAL_PUBLISHING?: string;
  OWNED_SOCIAL_FACEBOOK_ENABLED?: string;
  OWNED_SOCIAL_INSTAGRAM_ENABLED?: string;
  OWNED_SOCIAL_INSTAGRAM_MEDIA_READY?: string;
}

type CountRow = { count: number };

function enabled(value: string | undefined) {
  return value?.trim().toLowerCase() === "true";
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

export class OwnedSocialPublisherAgent extends Agent<
  OwnedSocialPublisherEnv,
  OwnedSocialPublisherState
> {
  initialState: OwnedSocialPublisherState = {
    paused: { facebook: true, instagram: true },
    lastCode: { facebook: null, instagram: null },
  };

  constructor(ctx: AgentContext, env: OwnedSocialPublisherEnv) {
    super(ctx, env);
  }

  private setupStorage() {
    void this.sql`CREATE TABLE IF NOT EXISTS owned_social_outbox (
      id TEXT PRIMARY KEY,
      channel TEXT NOT NULL CHECK (channel IN ('facebook', 'instagram')),
      article_slug TEXT NOT NULL,
      article_content_sha256 TEXT NOT NULL,
      run_key TEXT NOT NULL,
      india_month TEXT NOT NULL,
      post_text_sha256 TEXT NOT NULL,
      idempotency_key TEXT NOT NULL UNIQUE,
      attempt_id TEXT NOT NULL,
      state TEXT NOT NULL CHECK (state IN ('prepared', 'verified', 'failed', 'unknown')),
      provider_receipt_sha256 TEXT,
      failure_code TEXT,
      created_at TEXT NOT NULL,
      completed_at TEXT,
      UNIQUE(channel, article_content_sha256)
    )`;
    void this.sql`CREATE INDEX IF NOT EXISTS owned_social_outbox_channel_run_idx
      ON owned_social_outbox(channel, run_key, created_at DESC)`;
  }

  async onStart() {
    this.setupStorage();
  }

  validateStateChange(nextState: OwnedSocialPublisherState) {
    if (typeof nextState.paused.facebook !== "boolean"
      || typeof nextState.paused.instagram !== "boolean") {
      throw new Error("OWNED_SOCIAL_STATE_INVALID");
    }
  }

  private channelConfigured(channel: OwnedSocialChannel) {
    return channel === "facebook"
      ? enabled(this.env.OWNED_SOCIAL_FACEBOOK_ENABLED)
      : enabled(this.env.OWNED_SOCIAL_INSTAGRAM_ENABLED)
        && enabled(this.env.OWNED_SOCIAL_INSTAGRAM_MEDIA_READY);
  }

  async controlChannel(rawInput: unknown) {
    const input = socialChannelControlSchema.parse(rawInput);
    if (!input.paused && (!enabled(this.env.OWNED_SOCIAL_PUBLISHING)
      || !this.env.OWNED_SOCIAL_CONNECTOR
      || !this.channelConfigured(input.channel))) {
      throw new Error("OWNED_SOCIAL_CHANNEL_NOT_READY");
    }
    this.setState({
      paused: { ...this.state.paused, [input.channel]: input.paused },
      lastCode: {
        ...this.state.lastCode,
        [input.channel]: input.paused ? "OPERATOR_PAUSED" : "OPERATOR_ENABLED",
      },
    });
    return {
      code: input.paused ? "CHANNEL_PAUSED" as const : "CHANNEL_ENABLED" as const,
      channel: input.channel,
    };
  }

  private async publishToChannel(
    channel: OwnedSocialChannel,
    rawArticle: unknown,
  ) {
    const article = verifiedArticleEnvelopeSchema.parse(rawArticle);
    if (this.state.paused[channel]) {
      return { channel, code: "CHANNEL_PAUSED" as const };
    }
    if (!this.channelConfigured(channel)) {
      return { channel, code: "CHANNEL_NOT_CONFIGURED" as const };
    }
    if (!this.env.OWNED_SOCIAL_CONNECTOR) {
      return { channel, code: "CONNECTOR_NOT_CONFIGURED" as const };
    }
    if (channel === "instagram") {
      return { channel, code: "RIGHTS_CLEARED_MEDIA_REQUIRED" as const };
    }
    const dailyCount = this.sql<CountRow>`SELECT COUNT(*) AS count
      FROM owned_social_outbox WHERE channel = ${channel}
        AND run_key = ${article.runKey}`[0]?.count ?? 0;
    if (dailyCount >= DAILY_CHANNEL_LIMIT) {
      return { channel, code: "DAILY_LIMIT_REACHED" as const };
    }
    const monthlyCount = this.sql<CountRow>`SELECT COUNT(*) AS count
      FROM owned_social_outbox WHERE channel = ${channel}
        AND india_month = ${article.runKey.slice(0, 7)}`[0]?.count ?? 0;
    if (monthlyCount >= MONTHLY_CHANNEL_LIMIT) {
      return { channel, code: "MONTHLY_LIMIT_REACHED" as const };
    }
    const existing = this.sql<CountRow>`SELECT COUNT(*) AS count
      FROM owned_social_outbox WHERE channel = ${channel}
        AND article_content_sha256 = ${article.contentSha256}`[0]?.count ?? 0;
    if (existing > 0) {
      return { channel, code: "ALREADY_RECORDED" as const };
    }

    const post = buildOwnedSocialPost(channel, article);
    const attemptId = crypto.randomUUID();
    const idempotencyKey = [
      "owned-social",
      channel,
      article.contentSha256,
    ].join(":");
    const createdAt = new Date().toISOString();
    void this.sql`INSERT INTO owned_social_outbox (
      id, channel, article_slug, article_content_sha256, run_key, india_month,
      post_text_sha256, idempotency_key, attempt_id, state,
      provider_receipt_sha256, failure_code, created_at, completed_at
    ) VALUES (
      ${crypto.randomUUID()}, ${channel}, ${article.slug},
      ${article.contentSha256}, ${article.runKey}, ${article.runKey.slice(0, 7)},
      ${await sha256(post.text)}, ${idempotencyKey}, ${attemptId}, 'prepared',
      NULL, NULL, ${createdAt}, NULL
    )`;

    let result: ReturnType<typeof ownedSocialConnectorResponseSchema.parse>;
    try {
      const response = await this.env.OWNED_SOCIAL_CONNECTOR.fetch(
        "https://owned-social-connector.internal/v1/publish",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            attemptId,
            providerIdempotencyKey: idempotencyKey,
            channel,
            text: post.text,
            canonicalUrl: post.canonicalUrl,
          }),
        },
      );
      if (!response.ok) throw new Error("CONNECTOR_HTTP_FAILURE");
      result = ownedSocialConnectorResponseSchema.parse(await response.json());
    } catch {
      result = { code: "UNKNOWN", failureCode: "CONNECTOR_OUTCOME_UNKNOWN" };
    }

    const state = result.code === "VERIFIED"
      ? "verified"
      : result.code === "FAILED"
        ? "failed"
        : "unknown";
    const completedAt = new Date().toISOString();
    const receiptSha256 = result.providerReceiptId
      ? await sha256(result.providerReceiptId)
      : null;
    void this.sql`UPDATE owned_social_outbox SET state = ${state},
      provider_receipt_sha256 = ${receiptSha256},
      failure_code = ${result.failureCode ?? null}, completed_at = ${completedAt}
      WHERE attempt_id = ${attemptId} AND state = 'prepared'`;

    const shouldPause = state === "unknown";
    this.setState({
      paused: shouldPause
        ? { ...this.state.paused, [channel]: true }
        : this.state.paused,
      lastCode: {
        ...this.state.lastCode,
        [channel]: result.failureCode ?? result.code,
      },
    });
    return { channel, code: result.code, failureCode: result.failureCode ?? null };
  }

  async enqueueVerifiedArticle(rawInput: unknown) {
    this.setupStorage();
    const article = verifiedArticleEnvelopeSchema.parse(rawInput);
    if (!enabled(this.env.OWNED_SOCIAL_PUBLISHING)) {
      return { code: "OWNED_SOCIAL_DISABLED" as const, results: [] };
    }
    const results = [];
    for (const channel of CHANNELS) {
      results.push(await this.publishToChannel(channel, article));
    }
    return { code: "OWNED_SOCIAL_PROCESSED" as const, results };
  }

  async status(): Promise<OwnedSocialPublisherStatus> {
    this.setupStorage();
    const currentMonth = new Date().toISOString().slice(0, 7);
    const channels = Object.fromEntries(CHANNELS.map((channel) => {
      const verifiedThisMonth = this.sql<CountRow>`SELECT COUNT(*) AS count
        FROM owned_social_outbox WHERE channel = ${channel}
          AND india_month = ${currentMonth} AND state = 'verified'`[0]?.count ?? 0;
      return [channel, {
        configured: this.channelConfigured(channel),
        paused: this.state.paused[channel],
        verifiedThisMonth,
        lastCode: this.state.lastCode[channel],
      }];
    })) as OwnedSocialPublisherStatus["channels"];
    return {
      globallyEnabled: enabled(this.env.OWNED_SOCIAL_PUBLISHING),
      connectorConfigured: Boolean(this.env.OWNED_SOCIAL_CONNECTOR),
      channels,
    };
  }
}
