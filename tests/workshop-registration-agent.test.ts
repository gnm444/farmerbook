// @vitest-environment node
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("agents", () => ({ Agent: class {} }));
import { WorkshopRegistrationAgent } from "@/features/workshops/registration-agent";
import {
  HARI_BABU_WORKSHOP_CLOSE_AT_UTC,
  HARI_BABU_WORKSHOP_PURGE_AT_UTC,
  isWorkshopRegistrationClosed,
  isWorkshopRetentionExpired,
} from "@/features/workshops/registration-contracts";

const PHONE_HASH = "a".repeat(43);
const IP_HASH = "b".repeat(43);

function harness() {
  const database = new DatabaseSync(":memory:");
  const sql = (strings: TemplateStringsArray, ...values: unknown[]) => {
    const query = strings.reduce((text, part, index) =>
      text + (index ? "?" : "") + part, "");
    const statement = database.prepare(query);
    return /^\s*(?:SELECT|PRAGMA)\b/iu.test(query)
      ? statement.all(...values as never[]) as unknown[]
      : (statement.run(...values as never[]), []);
  };
  const schedule = vi.fn().mockResolvedValue({ id: "purge-schedule" });
  const scheduleEvery = vi.fn().mockResolvedValue({ id: "rate-prune-schedule" });
  const destroy = vi.fn().mockResolvedValue(undefined);
  const agent = Object.create(WorkshopRegistrationAgent.prototype) as WorkshopRegistrationAgent;
  Object.defineProperties(agent, {
    sql: { value: sql },
    schedule: { value: schedule },
    scheduleEvery: { value: scheduleEvery },
    destroy: { value: destroy },
  });
  const count = (table: "workshop_registrations" | "workshop_rate_events") =>
    (database.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as { count: number }).count;
  return { agent, database, count, schedule, scheduleEvery, destroy };
}

function registration(submissionId = "2f50ce54-fef5-4cdd-a674-d29f141307da") {
  return {
    submissionId,
    phoneHash: PHONE_HASH,
    ipHash: IP_HASH,
    encryptedPayload: `v1.${"c".repeat(40)}.${"d".repeat(80)}`,
    createdAt: new Date().toISOString(),
    consentVersion: "hari-babu-2026-v1",
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-09T00:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("workshop retention lifecycle", () => {
  it("uses the exact IST close and purge boundaries", () => {
    expect(isWorkshopRegistrationClosed(Date.parse(HARI_BABU_WORKSHOP_CLOSE_AT_UTC) - 1)).toBe(false);
    expect(isWorkshopRegistrationClosed(Date.parse(HARI_BABU_WORKSHOP_CLOSE_AT_UTC))).toBe(true);
    expect(isWorkshopRetentionExpired(Date.parse(HARI_BABU_WORKSHOP_PURGE_AT_UTC) - 1)).toBe(false);
    expect(isWorkshopRetentionExpired(Date.parse(HARI_BABU_WORKSHOP_PURGE_AT_UTC))).toBe(true);
  });

  it("installs one idempotent SDK purge schedule and hourly IP pruning", async () => {
    const h = harness();
    try {
      await h.agent.onStart();
      expect(h.schedule).toHaveBeenCalledWith(
        new Date(HARI_BABU_WORKSHOP_PURGE_AT_UTC),
        "purgeAtRetentionDeadline",
        undefined,
        { idempotent: true },
      );
      expect(h.scheduleEvery).toHaveBeenCalledWith(3_600, "pruneExpiredRateEvents");
    } finally {
      h.database.close();
    }
  });

  it("closes writes at midnight IST and counts duplicates against the IP limit", () => {
    const h = harness();
    try {
      expect(h.agent.register(registration())).toEqual({ status: "registered" });
      for (let index = 0; index < 9; index += 1) {
        expect(h.agent.register(registration())).toEqual({ status: "already_registered" });
      }
      expect(h.count("workshop_rate_events")).toBe(10);
      expect(h.agent.register(registration())).toEqual({ status: "rate_limited" });
      expect(h.count("workshop_registrations")).toBe(1);
      vi.setSystemTime(new Date(HARI_BABU_WORKSHOP_CLOSE_AT_UTC));
      expect(h.agent.register(registration(crypto.randomUUID()))).toEqual({ status: "closed" });
      expect(h.count("workshop_registrations")).toBe(1);
    } finally {
      h.database.close();
    }
  });

  it("prunes keyed IP rate events after 24 hours while retaining registration data", () => {
    const h = harness();
    try {
      h.agent.register(registration());
      expect(h.count("workshop_rate_events")).toBe(1);
      vi.setSystemTime(new Date(Date.now() + 25 * 60 * 60 * 1000));
      h.agent.pruneExpiredRateEvents();
      expect(h.count("workshop_rate_events")).toBe(0);
      expect(h.count("workshop_registrations")).toBe(1);
    } finally {
      h.database.close();
    }
  });

  it("purges rows, phone hashes, and IP events at the scheduled deadline", async () => {
    const h = harness();
    try {
      await h.agent.onStart();
      h.agent.register(registration());
      expect(h.count("workshop_registrations")).toBe(1);
      expect(h.count("workshop_rate_events")).toBe(1);
      vi.setSystemTime(new Date(HARI_BABU_WORKSHOP_PURGE_AT_UTC));
      await h.agent.purgeAtRetentionDeadline();
      expect(h.count("workshop_registrations")).toBe(0);
      expect(h.count("workshop_rate_events")).toBe(0);
      expect(h.destroy).toHaveBeenCalledOnce();
    } finally {
      h.database.close();
    }
  });

  it("never serves expired rows when the scheduled alarm is delayed", () => {
    const h = harness();
    try {
      h.agent.register(registration());
      vi.setSystemTime(new Date(HARI_BABU_WORKSHOP_PURGE_AT_UTC));
      expect(h.agent.list(0, 50)).toEqual({ count: 0, rows: [] });
      expect(h.count("workshop_registrations")).toBe(0);
      expect(h.count("workshop_rate_events")).toBe(0);
    } finally {
      h.database.close();
    }
  });

  it("removes one registration by ID without affecting another and is idempotent", () => {
    const h = harness();
    try {
      const firstId = crypto.randomUUID();
      const secondId = crypto.randomUUID();
      h.agent.register({ ...registration(firstId), phoneHash: "a".repeat(43) });
      h.agent.register({ ...registration(secondId), phoneHash: "c".repeat(43) });
      expect(h.agent.deleteRegistration(firstId)).toEqual({ status: "deleted" });
      expect(h.agent.deleteRegistration(firstId)).toEqual({ status: "deleted" });
      expect(h.agent.list(0, 50).rows.map((row) => row.submission_id)).toEqual([secondId]);
    } finally {
      h.database.close();
    }
  });
});
