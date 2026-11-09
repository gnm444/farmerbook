import { Agent, type AgentContext } from "agents";
import { z } from "zod";
import {
  HARI_BABU_WORKSHOP_CONSENT_VERSION,
} from "./registration-contracts";

const registrationWriteSchema = z.strictObject({
  submissionId: z.uuid(),
  phoneHash: z.string().regex(/^[A-Za-z0-9_-]{43}$/u),
  ipHash: z.string().regex(/^[A-Za-z0-9_-]{43}$/u),
  encryptedPayload: z.string().min(30).max(16_384),
  createdAt: z.iso.datetime({ offset: true }),
  consentVersion: z.literal(HARI_BABU_WORKSHOP_CONSENT_VERSION),
});

type ExistingRow = { submission_id: string; phone_hash: string };
type CountRow = { count: number };
export type WorkshopEncryptedRow = {
  submission_id: string;
  encrypted_payload: string;
  created_at: string;
  consent_version: string;
};

export class WorkshopRegistrationAgent extends Agent<
  Cloudflare.Env,
  { ready: boolean }
> {
  initialState = { ready: true };

  constructor(ctx: AgentContext, env: Cloudflare.Env) {
    super(ctx, env);
  }

  private setupStorage() {
    void this.sql`CREATE TABLE IF NOT EXISTS workshop_registrations (
      submission_id TEXT PRIMARY KEY,
      phone_hash TEXT NOT NULL UNIQUE,
      encrypted_payload TEXT NOT NULL,
      created_at TEXT NOT NULL,
      consent_version TEXT NOT NULL
    )`;
    void this.sql`CREATE INDEX IF NOT EXISTS workshop_registrations_created
      ON workshop_registrations (created_at, submission_id)`;
    void this.sql`CREATE TABLE IF NOT EXISTS workshop_rate_events (
      id TEXT PRIMARY KEY,
      ip_hash TEXT NOT NULL,
      occurred_at_ms INTEGER NOT NULL
    )`;
    void this.sql`CREATE INDEX IF NOT EXISTS workshop_rate_events_ip_time
      ON workshop_rate_events (ip_hash, occurred_at_ms)`;
  }

  async onStart() {
    this.setupStorage();
  }

  register(rawInput: unknown):
    | { status: "registered" | "already_registered" }
    | { status: "conflict" | "rate_limited" } {
    this.setupStorage();
    const input = registrationWriteSchema.parse(rawInput);
    const now = Date.now();
    const minuteAgo = now - 60_000;
    const dayAgo = now - 86_400_000;
    void this.sql`DELETE FROM workshop_rate_events
      WHERE occurred_at_ms < ${dayAgo}`;
    const minuteCount = this.sql<CountRow>`SELECT COUNT(*) AS count
      FROM workshop_rate_events
      WHERE ip_hash = ${input.ipHash} AND occurred_at_ms >= ${minuteAgo}`[0]?.count ?? 0;
    const dayCount = this.sql<CountRow>`SELECT COUNT(*) AS count
      FROM workshop_rate_events
      WHERE ip_hash = ${input.ipHash} AND occurred_at_ms >= ${dayAgo}`[0]?.count ?? 0;
    if (minuteCount >= 10 || dayCount >= 100) return { status: "rate_limited" };

    void this.sql`INSERT INTO workshop_rate_events
      (id, ip_hash, occurred_at_ms)
      VALUES (${crypto.randomUUID()}, ${input.ipHash}, ${now})`;
    // Count verified attempts before checking duplicates. Otherwise the public
    // endpoint could be used as an unlimited phone-registration oracle.
    const existing = this.sql<ExistingRow>`SELECT submission_id, phone_hash
      FROM workshop_registrations
      WHERE submission_id = ${input.submissionId} OR phone_hash = ${input.phoneHash}
      LIMIT 1`[0];
    if (existing) {
      return existing.submission_id === input.submissionId
        && existing.phone_hash !== input.phoneHash
        ? { status: "conflict" }
        : { status: "already_registered" };
    }
    void this.sql`INSERT INTO workshop_registrations
      (submission_id, phone_hash, encrypted_payload, created_at, consent_version)
      VALUES (
        ${input.submissionId}, ${input.phoneHash},
        ${input.encryptedPayload}, ${input.createdAt}, ${input.consentVersion}
      )`;
    return { status: "registered" };
  }

  list(rawOffset: number, rawLimit: number) {
    this.setupStorage();
    const offset = z.number().int().min(0).max(100_000).parse(rawOffset);
    const limit = z.number().int().min(1).max(100).parse(rawLimit);
    const count = this.sql<CountRow>`SELECT COUNT(*) AS count
      FROM workshop_registrations`[0]?.count ?? 0;
    const rows = this.sql<WorkshopEncryptedRow>`SELECT
      submission_id, encrypted_payload, created_at, consent_version
      FROM workshop_registrations
      ORDER BY created_at ASC, submission_id ASC
      LIMIT ${limit} OFFSET ${offset}`;
    return { count, rows };
  }
}
