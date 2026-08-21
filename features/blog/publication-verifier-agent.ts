import { Agent, getAgentByName, type AgentContext } from "agents";
import type { BlogWritingAgent } from "./agent";
import type { OwnedSocialPublisherAgent } from "@/features/social-publisher/agent";
import { blogPublicationVerificationJobSchema } from "./contracts";

type BlogPublicationVerifierState = {
  queued: number;
  verified: number;
  failed: number;
  lastCode: string | null;
  lastRunAt: string | null;
};

interface BlogPublicationVerifierEnv extends Cloudflare.Env {
  BLOG_WRITING_AGENT?: DurableObjectNamespace<BlogWritingAgent>;
  NEXT_PUBLIC_SITE_URL?: string;
  OWNED_SOCIAL_PUBLISHER_AGENT?: DurableObjectNamespace<OwnedSocialPublisherAgent>;
}

type VerificationJobRow = {
  idempotency_key: string;
  schedule_id: string | null;
  status: "scheduled" | "verified" | "failed";
};

function siteOrigin(value: string | undefined) {
  const parsed = new URL(value?.trim() || "https://farmerbook.in");
  if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") {
    throw new Error("BLOG_VERIFIER_SITE_ORIGIN_INVALID");
  }
  return parsed.origin;
}

export class BlogPublicationVerifierAgent extends Agent<
  BlogPublicationVerifierEnv,
  BlogPublicationVerifierState
> {
  initialState: BlogPublicationVerifierState = {
    queued: 0,
    verified: 0,
    failed: 0,
    lastCode: null,
    lastRunAt: null,
  };

  constructor(ctx: AgentContext, env: BlogPublicationVerifierEnv) {
    super(ctx, env);
  }

  private setupStorage() {
    void this.sql`CREATE TABLE IF NOT EXISTS blog_publication_verification_jobs (
      idempotency_key TEXT PRIMARY KEY,
      draft_id TEXT NOT NULL,
      slug TEXT NOT NULL,
      content_sha256 TEXT NOT NULL,
      schedule_id TEXT,
      status TEXT NOT NULL CHECK (status IN ('scheduled', 'verified', 'failed')),
      result_code TEXT,
      created_at TEXT NOT NULL,
      completed_at TEXT
    )`;
  }

  async onStart() {
    this.setupStorage();
  }

  validateStateChange(nextState: BlogPublicationVerifierState) {
    if (!Number.isInteger(nextState.queued) || nextState.queued < 0
      || !Number.isInteger(nextState.verified) || nextState.verified < 0
      || !Number.isInteger(nextState.failed) || nextState.failed < 0) {
      throw new Error("BLOG_VERIFIER_STATE_INVALID");
    }
  }

  async enqueueVerification(rawInput: unknown) {
    this.setupStorage();
    const input = blogPublicationVerificationJobSchema.parse(rawInput);
    const idempotencyKey = `${input.draftId}:${input.contentSha256}`;
    const existing = this.sql<VerificationJobRow>`SELECT idempotency_key,
      schedule_id, status FROM blog_publication_verification_jobs
      WHERE idempotency_key = ${idempotencyKey} LIMIT 1`[0];
    if (existing) {
      return {
        code: "ALREADY_SCHEDULED" as const,
        scheduleId: existing.schedule_id,
        status: existing.status,
      };
    }
    const now = new Date().toISOString();
    void this.sql`INSERT INTO blog_publication_verification_jobs (
      idempotency_key, draft_id, slug, content_sha256, schedule_id, status,
      result_code, created_at, completed_at
    ) VALUES (
      ${idempotencyKey}, ${input.draftId}, ${input.slug},
      ${input.contentSha256}, NULL, 'scheduled', NULL, ${now}, NULL
    )`;
    const scheduled = await this.schedule(
      90,
      "verifyPublication",
      input,
      { retry: { maxAttempts: 3 } },
    );
    void this.sql`UPDATE blog_publication_verification_jobs
      SET schedule_id = ${scheduled.id}
      WHERE idempotency_key = ${idempotencyKey}`;
    this.setState({ ...this.state, queued: this.state.queued + 1 });
    return {
      code: "VERIFICATION_SCHEDULED" as const,
      scheduleId: scheduled.id,
      status: "scheduled" as const,
    };
  }

  async verifyPublication(rawInput: unknown) {
    this.setupStorage();
    const input = blogPublicationVerificationJobSchema.parse(rawInput);
    const idempotencyKey = `${input.draftId}:${input.contentSha256}`;
    const current = this.sql<VerificationJobRow>`SELECT idempotency_key,
      schedule_id, status FROM blog_publication_verification_jobs
      WHERE idempotency_key = ${idempotencyKey} LIMIT 1`[0];
    if (!current) throw new Error("BLOG_VERIFICATION_JOB_NOT_FOUND");
    if (current.status !== "scheduled") {
      return { code: "ALREADY_VERIFIED" as const, status: current.status };
    }
    if (!this.env.BLOG_WRITING_AGENT) {
      throw new Error("BLOG_WRITING_AGENT_UNAVAILABLE");
    }

    let status: "verified" | "failed" = "failed";
    let code = "PUBLICATION_ROUTE_FETCH_FAILED";
    try {
      const url = new URL(`/blog/${input.slug}`, siteOrigin(this.env.NEXT_PUBLIC_SITE_URL));
      url.searchParams.set("publication_verify", input.contentSha256.slice(0, 12));
      const response = await fetch(url, {
        headers: { "cache-control": "no-cache" },
      });
      const body = await response.text();
      if (!response.ok) {
        code = `PUBLICATION_ROUTE_HTTP_${response.status}`;
      } else if (!body.includes(`data-publication-sha256="${input.contentSha256}"`)) {
        code = "PUBLICATION_ROUTE_CONTENT_MISMATCH";
      } else {
        status = "verified";
        code = "PUBLICATION_ROUTE_VERIFIED";
      }
    } catch {
      code = "PUBLICATION_ROUTE_FETCH_FAILED";
    }

    const writer = await getAgentByName(
      this.env.BLOG_WRITING_AGENT,
      "farmerbook-blog-writing",
    ) as DurableObjectStub<BlogWritingAgent>;
    await writer.recordPublicationVerification({
      id: input.draftId,
      verifierId: "blog-publication-verifier-agent",
      status,
      code,
      expectedContentSha256: input.contentSha256,
    });
    if (status === "verified" && this.env.OWNED_SOCIAL_PUBLISHER_AGENT) {
      try {
        const socialPublisher = await getAgentByName(
          this.env.OWNED_SOCIAL_PUBLISHER_AGENT,
          "farmerbook-owned-social-publisher",
        ) as DurableObjectStub<OwnedSocialPublisherAgent>;
        await socialPublisher.enqueueVerifiedArticle({
          slug: input.slug,
          title: input.title,
          excerpt: input.excerpt,
          canonicalUrl: input.canonicalUrl,
          contentSha256: input.contentSha256,
          runKey: input.runKey,
          locale: "en-IN",
          campaignCode: `daily_blog_${input.runKey.replaceAll("-", "")}`,
        });
      } catch {
        // Blog verification remains independent; the social Agent records and
        // pauses its own provider boundary when it is enabled.
      }
    }
    const completedAt = new Date().toISOString();
    void this.sql`UPDATE blog_publication_verification_jobs
      SET status = ${status}, result_code = ${code}, completed_at = ${completedAt}
      WHERE idempotency_key = ${idempotencyKey} AND status = 'scheduled'`;
    this.setState({
      ...this.state,
      verified: this.state.verified + (status === "verified" ? 1 : 0),
      failed: this.state.failed + (status === "failed" ? 1 : 0),
      lastCode: code,
      lastRunAt: completedAt,
    });
    return { code, status };
  }
}
