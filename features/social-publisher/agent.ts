import { Agent, type AgentContext } from "agents";
import {
  ownedSocialConnectorResponseSchema,
  socialChannelControlSchema,
  verifiedArticleEnvelopeSchema,
  type OwnedSocialChannel,
  type OwnedSocialPublisherStatus,
} from "./contracts";
import { buildOwnedSocialPost } from "./copy";
import { blogPublicationFingerprint } from "@/features/blog/autonomous-publication-policy";
import { indiaDayKey } from "@/features/blog/daily-editorial";
import { STATIC_BLOG_PUBLICATIONS } from "@/features/blog/published";
import { selectStaticPublicationForSyndication } from "./static-syndication";
import { rightsClearedSocialMediaFor } from "./media-registry";

const CHANNELS = ["facebook", "instagram"] as const;
const DAILY_CHANNEL_LIMIT = 1;
const MONTHLY_CHANNEL_LIMIT = 31;
const PROVIDER_FAILURES_REQUIRING_PAUSE = new Set([
  "META_CONNECTOR_NOT_READY",
  "META_CREATE_REJECTED",
  "META_INSTAGRAM_MEDIA_REJECTED",
  "META_INSTAGRAM_PUBLISH_REJECTED",
  "CONNECTOR_INPUT_INVALID",
]);
const CONFIRMED_FAILURES_RETRYABLE_AFTER_OPERATOR_RESUME = new Set([
  "META_CONNECTOR_NOT_READY",
  "META_CREATE_REJECTED",
  "META_INSTAGRAM_MEDIA_REJECTED",
  "META_INSTAGRAM_PUBLISH_REJECTED",
]);

function hasFailureCodePrefix(code: string, prefix: string) {
  return code === prefix || code.startsWith(`${prefix}_`);
}

function providerFailureRequiresPause(code: string) {
  return PROVIDER_FAILURES_REQUIRING_PAUSE.has(code)
    || hasFailureCodePrefix(code, "META_CREATE_REJECTED")
    || hasFailureCodePrefix(code, "META_INSTAGRAM_MEDIA_REJECTED")
    || hasFailureCodePrefix(code, "META_INSTAGRAM_PUBLISH_REJECTED");
}

function confirmedFailureCanRetry(code: string) {
  return CONFIRMED_FAILURES_RETRYABLE_AFTER_OPERATOR_RESUME.has(code)
    || hasFailureCodePrefix(code, "META_CREATE_REJECTED")
    || hasFailureCodePrefix(code, "META_INSTAGRAM_MEDIA_REJECTED")
    || hasFailureCodePrefix(code, "META_INSTAGRAM_PUBLISH_REJECTED");
}

type OwnedSocialPublisherState = {
  paused: Record<OwnedSocialChannel, boolean>;
  lastCode: Record<OwnedSocialChannel, string | null>;
  retryConfirmedFailureOnce?: Record<OwnedSocialChannel, boolean>;
  lastSyndicationScanAt?: string | null;
  lastSyndicationCode?: string | null;
};

interface OwnedSocialPublisherEnv extends Cloudflare.Env {
  OWNED_SOCIAL_CONNECTOR?: Fetcher;
  OWNED_SOCIAL_PUBLISHING?: string;
  OWNED_SOCIAL_FACEBOOK_ENABLED?: string;
  OWNED_SOCIAL_INSTAGRAM_ENABLED?: string;
  OWNED_SOCIAL_INSTAGRAM_MEDIA_READY?: string;
  OWNED_SOCIAL_STATIC_SYNDICATION?: string;
  NEXT_PUBLIC_SITE_URL?: string;
}

type CountRow = { count: number };
type ExistingOutboxRow = {
  id: string;
  attempt_id: string;
  idempotency_key: string;
  state: "prepared" | "verified" | "failed" | "unknown";
  provider_receipt_sha256: string | null;
  failure_code: string | null;
  created_at: string;
  completed_at: string | null;
};

function enabled(value: string | undefined) {
  return value?.trim().toLowerCase() === "true";
}

async function sha256(value: string | ArrayBuffer) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    typeof value === "string" ? new TextEncoder().encode(value) : value,
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
    retryConfirmedFailureOnce: { facebook: false, instagram: false },
    lastSyndicationScanAt: null,
    lastSyndicationCode: null,
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
    void this.sql`CREATE TABLE IF NOT EXISTS owned_social_attempt_history (
      id TEXT PRIMARY KEY,
      outbox_id TEXT NOT NULL,
      channel TEXT NOT NULL CHECK (channel IN ('facebook', 'instagram')),
      article_content_sha256 TEXT NOT NULL,
      attempt_id TEXT NOT NULL UNIQUE,
      idempotency_key TEXT NOT NULL,
      state TEXT NOT NULL CHECK (state IN ('verified', 'failed', 'unknown')),
      provider_receipt_sha256 TEXT,
      failure_code TEXT,
      created_at TEXT NOT NULL,
      completed_at TEXT NOT NULL
    )`;
  }

  async onStart() {
    this.setupStorage();
    const paused = { ...this.state.paused };
    for (const channel of CHANNELS) {
      if (this.state.lastCode[channel]
        && providerFailureRequiresPause(this.state.lastCode[channel]!)) {
        paused[channel] = true;
      }
    }
    if (paused.facebook !== this.state.paused.facebook
      || paused.instagram !== this.state.paused.instagram) {
      this.setState({ ...this.state, paused });
    }
  }

  validateStateChange(nextState: OwnedSocialPublisherState) {
    if (typeof nextState.paused.facebook !== "boolean"
      || typeof nextState.paused.instagram !== "boolean") {
      throw new Error("OWNED_SOCIAL_STATE_INVALID");
    }
    if (nextState.retryConfirmedFailureOnce
      && (typeof nextState.retryConfirmedFailureOnce.facebook !== "boolean"
        || typeof nextState.retryConfirmedFailureOnce.instagram !== "boolean")) {
      throw new Error("OWNED_SOCIAL_RETRY_STATE_INVALID");
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
      ...this.state,
      paused: { ...this.state.paused, [input.channel]: input.paused },
      retryConfirmedFailureOnce: {
        facebook: this.state.retryConfirmedFailureOnce?.facebook ?? false,
        instagram: this.state.retryConfirmedFailureOnce?.instagram ?? false,
        [input.channel]: input.paused ? false : true,
      },
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
    if (channel === "instagram" && !article.media) {
      return { channel, code: "RIGHTS_CLEARED_MEDIA_REQUIRED" as const };
    }
    const dailyCount = this.sql<CountRow>`SELECT COUNT(*) AS count
      FROM owned_social_outbox WHERE channel = ${channel}
        AND run_key = ${article.runKey}
        AND state IN ('prepared', 'verified', 'unknown')`[0]?.count ?? 0;
    if (dailyCount >= DAILY_CHANNEL_LIMIT) {
      return { channel, code: "DAILY_LIMIT_REACHED" as const };
    }
    const monthlyCount = this.sql<CountRow>`SELECT COUNT(*) AS count
      FROM owned_social_outbox WHERE channel = ${channel}
        AND india_month = ${article.runKey.slice(0, 7)}
        AND state IN ('prepared', 'verified', 'unknown')`[0]?.count ?? 0;
    if (monthlyCount >= MONTHLY_CHANNEL_LIMIT) {
      return { channel, code: "MONTHLY_LIMIT_REACHED" as const };
    }
    const post = buildOwnedSocialPost(channel, article);
    const attemptId = crypto.randomUUID();
    const idempotencyKey = [
      "owned-social",
      channel,
      article.contentSha256,
      attemptId,
    ].join(":");
    const createdAt = new Date().toISOString();
    const existing = this.sql<ExistingOutboxRow>`SELECT id, attempt_id,
      idempotency_key, state, provider_receipt_sha256, failure_code, created_at,
      completed_at FROM owned_social_outbox WHERE channel = ${channel}
        AND article_content_sha256 = ${article.contentSha256} LIMIT 1`[0] ?? null;
    const retryAllowed = this.state.retryConfirmedFailureOnce?.[channel] ?? false;
    const canRetry = existing?.state === "failed"
      && retryAllowed
      && Boolean(existing.failure_code)
      && confirmedFailureCanRetry(existing.failure_code!);
    let outboxId: string;
    if (existing) {
      if (!canRetry) {
        return { channel, code: "ALREADY_RECORDED" as const };
      }
      outboxId = existing.id;
      if (existing.completed_at) {
        void this.sql`INSERT OR IGNORE INTO owned_social_attempt_history (
          id, outbox_id, channel, article_content_sha256, attempt_id,
          idempotency_key, state, provider_receipt_sha256, failure_code,
          created_at, completed_at
        ) VALUES (
          ${crypto.randomUUID()}, ${existing.id}, ${channel},
          ${article.contentSha256}, ${existing.attempt_id},
          ${existing.idempotency_key}, ${existing.state},
          ${existing.provider_receipt_sha256}, ${existing.failure_code},
          ${existing.created_at}, ${existing.completed_at}
        )`;
      }
      void this.sql`UPDATE owned_social_outbox SET
        run_key = ${article.runKey}, india_month = ${article.runKey.slice(0, 7)},
        post_text_sha256 = ${await sha256(post.text)},
        idempotency_key = ${idempotencyKey}, attempt_id = ${attemptId},
        state = 'prepared', provider_receipt_sha256 = NULL,
        failure_code = NULL, created_at = ${createdAt}, completed_at = NULL
        WHERE id = ${existing.id} AND state = 'failed'`;
    } else {
      outboxId = crypto.randomUUID();
      void this.sql`INSERT INTO owned_social_outbox (
        id, channel, article_slug, article_content_sha256, run_key, india_month,
        post_text_sha256, idempotency_key, attempt_id, state,
        provider_receipt_sha256, failure_code, created_at, completed_at
      ) VALUES (
        ${outboxId}, ${channel}, ${article.slug},
        ${article.contentSha256}, ${article.runKey}, ${article.runKey.slice(0, 7)},
        ${await sha256(post.text)}, ${idempotencyKey}, ${attemptId}, 'prepared',
        NULL, NULL, ${createdAt}, NULL
      )`;
    }
    this.setState({
      ...this.state,
      retryConfirmedFailureOnce: {
        facebook: this.state.retryConfirmedFailureOnce?.facebook ?? false,
        instagram: this.state.retryConfirmedFailureOnce?.instagram ?? false,
        [channel]: false,
      },
    });

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
            mediaUrl: channel === "instagram" ? article.media?.url : undefined,
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
    void this.sql`INSERT OR IGNORE INTO owned_social_attempt_history (
      id, outbox_id, channel, article_content_sha256, attempt_id,
      idempotency_key, state, provider_receipt_sha256, failure_code,
      created_at, completed_at
    ) VALUES (
      ${crypto.randomUUID()}, ${outboxId}, ${channel}, ${article.contentSha256},
      ${attemptId}, ${idempotencyKey}, ${state}, ${receiptSha256},
      ${result.failureCode ?? null}, ${createdAt}, ${completedAt}
    )`;

    const shouldPause = state === "unknown"
      || (state === "failed"
        && Boolean(result.failureCode)
        && providerFailureRequiresPause(result.failureCode!));
    this.setState({
      ...this.state,
      retryConfirmedFailureOnce: {
        facebook: this.state.retryConfirmedFailureOnce?.facebook ?? false,
        instagram: this.state.retryConfirmedFailureOnce?.instagram ?? false,
        [channel]: false,
      },
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

  async scanStaticPublications() {
    this.setupStorage();
    const scannedAt = new Date();
    const finish = (code: string) => {
      this.setState({
        ...this.state,
        lastSyndicationScanAt: scannedAt.toISOString(),
        lastSyndicationCode: code,
      });
      return { code };
    };
    if (!enabled(this.env.OWNED_SOCIAL_STATIC_SYNDICATION)) {
      return finish("STATIC_SYNDICATION_DISABLED");
    }
    const publication = selectStaticPublicationForSyndication(
      STATIC_BLOG_PUBLICATIONS,
      scannedAt,
    );
    if (!publication) return finish("STATIC_SYNDICATION_NO_RECENT_ARTICLE");

    const contentSha256 = await blogPublicationFingerprint(publication);
    const origin = new URL(
      this.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://farmerbook.in",
    ).origin;
    const canonicalUrl = new URL(`/blog/${publication.slug}`, origin);
    canonicalUrl.searchParams.set(
      "publication_verify",
      contentSha256.slice(0, 12),
    );
    let response: Response;
    try {
      response = await fetch(canonicalUrl, {
        headers: { "cache-control": "no-cache" },
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      return finish("STATIC_SYNDICATION_ROUTE_FETCH_FAILED");
    }
    const body = await response.text();
    if (!response.ok) {
      return finish(`STATIC_SYNDICATION_ROUTE_HTTP_${response.status}`);
    }
    if (!body.includes(`data-publication-sha256="${contentSha256}"`)) {
      return finish("STATIC_SYNDICATION_CONTENT_MISMATCH");
    }

    const registeredMedia = rightsClearedSocialMediaFor(publication);
    let media: { url: string; provenance: "ai_generated" | "rights_approved_original"; sha256: string } | undefined;
    if (registeredMedia) {
      const mediaUrl = new URL(registeredMedia.path, origin);
      let mediaResponse: Response;
      try {
        mediaResponse = await fetch(mediaUrl, {
          headers: { "cache-control": "no-cache" },
          signal: AbortSignal.timeout(15_000),
        });
      } catch {
        return finish("STATIC_SYNDICATION_MEDIA_FETCH_FAILED");
      }
      if (!mediaResponse.ok) {
        return finish(`STATIC_SYNDICATION_MEDIA_HTTP_${mediaResponse.status}`);
      }
      const mediaSha256 = await sha256(await mediaResponse.arrayBuffer());
      if (mediaSha256 !== registeredMedia.sha256) {
        return finish("STATIC_SYNDICATION_MEDIA_MISMATCH");
      }
      media = {
        url: mediaUrl.toString(),
        provenance: registeredMedia.provenance,
        sha256: registeredMedia.sha256,
      };
    }

    const runKey = indiaDayKey(scannedAt);
    const result = await this.enqueueVerifiedArticle({
      slug: publication.slug,
      title: publication.english.title,
      excerpt: publication.english.excerpt,
      canonicalUrl: new URL(`/blog/${publication.slug}`, origin).toString(),
      contentSha256,
      runKey,
      locale: "en-IN",
      campaignCode: `founder_editorial_${runKey.replaceAll("-", "")}`,
      media,
    });
    const resultCode = result.results.some((item) => item.code === "VERIFIED")
      ? "STATIC_SYNDICATION_VERIFIED"
      : result.results.every((item) =>
        item.code === "ALREADY_RECORDED" || item.code === "CHANNEL_PAUSED")
        ? "STATIC_SYNDICATION_ALREADY_HANDLED"
        : "STATIC_SYNDICATION_PROCESSED";
    this.setState({
      ...this.state,
      lastSyndicationScanAt: scannedAt.toISOString(),
      lastSyndicationCode: resultCode,
    });
    return { code: resultCode, results: result.results };
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
      staticSyndication: {
        enabled: enabled(this.env.OWNED_SOCIAL_STATIC_SYNDICATION),
        lastScanAt: this.state.lastSyndicationScanAt ?? null,
        lastCode: this.state.lastSyndicationCode ?? null,
      },
      channels,
    };
  }
}
