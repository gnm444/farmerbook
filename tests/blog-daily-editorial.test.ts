import { describe, expect, it } from "vitest";
import {
  DAILY_EDITORIAL_CALLBACK,
  DAILY_EDITORIAL_CRON_UTC,
  DAILY_EDITORIAL_TIME_ZONE,
  DAILY_EDITORIAL_TOPICS,
  AUTONOMOUS_EDITORIAL_TOPICS,
  DAILY_SOURCE_MANIFEST_VERSION,
  editorialScheduleIdsToCancel,
  indiaDayKey,
  selectDailyEditorialBrief,
  selectDailyAutonomousBrief,
  sourceHealth,
} from "@/features/blog/daily-editorial";
import {
  blogDraftReviewSchema,
  blogScheduleControlSchema,
} from "@/features/blog/contracts";

describe("daily Blog Writing Agent policy", () => {
  it("runs at 09:00 IST with an India-calendar idempotency key", () => {
    expect(DAILY_EDITORIAL_CRON_UTC).toBe("30 3 * * *");
    expect(DAILY_EDITORIAL_TIME_ZONE).toBe("Asia/Kolkata");
    expect(DAILY_EDITORIAL_CALLBACK).toBe("prepareDailyDraft");
    expect(indiaDayKey(new Date("2026-08-20T18:29:59.000Z"))).toBe("2026-08-20");
    expect(indiaDayKey(new Date("2026-08-20T18:30:00.000Z"))).toBe("2026-08-21");
  });

  it("keeps a reviewed, deterministic 30-topic source manifest", () => {
    expect(DAILY_SOURCE_MANIFEST_VERSION).toContain("2026-08-20");
    expect(DAILY_EDITORIAL_TOPICS).toHaveLength(30);
    expect(new Set(DAILY_EDITORIAL_TOPICS.map((brief) => brief.key)).size).toBe(30);
    expect(new Set(DAILY_EDITORIAL_TOPICS.map((brief) => brief.category))).toEqual(
      new Set(["natural_farming", "food_safety", "farm_to_table"]),
    );
    for (const brief of DAILY_EDITORIAL_TOPICS) {
      expect(brief.sources.length).toBeGreaterThan(0);
      expect(brief.prohibitedClaims.join(" ")).toContain("guaranteed");
      expect(sourceHealth(brief, new Date("2026-08-20T12:00:00.000Z")).fresh)
        .toBe(true);
      for (const source of brief.sources) {
        expect(source.url).toMatch(/^https:\/\//);
        expect(source.reviewedAt).toMatch(/^2026-08-20T/);
      }
    }
    expect(selectDailyEditorialBrief("2026-08-20")).toEqual(
      selectDailyEditorialBrief("2026-08-20"),
    );
    expect(AUTONOMOUS_EDITORIAL_TOPICS.every((brief) => brief.riskClass === "low"))
      .toBe(true);
    expect(selectDailyAutonomousBrief("2026-08-20")).toEqual(
      selectDailyAutonomousBrief("2026-08-20"),
    );
  });

  it("fails stale source packets closed", () => {
    const result = sourceHealth(
      DAILY_EDITORIAL_TOPICS[0]!,
      new Date("2027-08-20T12:00:00.000Z"),
    );
    expect(result.fresh).toBe(false);
    expect(result.staleUrls.length).toBeGreaterThan(0);
  });

  it("cancels the exact legacy and duplicate daily schedules", () => {
    expect(editorialScheduleIdsToCancel([
      { id: "legacy", callback: "prepareWeeklyDraft" },
      { id: "daily-keep", callback: "prepareDailyDraft" },
      { id: "daily-duplicate", callback: "prepareDailyDraft" },
      { id: "other", callback: "translatePublishedArticle" },
    ], "daily-keep")).toEqual(["legacy", "daily-duplicate"]);
  });

  it("requires revision-bound human review and an operator reason", () => {
    expect(blogDraftReviewSchema.safeParse({
      id: "1484d0df-2f67-4f56-a09f-594509b91a8a",
      decision: "publish",
      reviewerId: "administrator-1",
      expectedRevision: 2,
      reason: "Sources and every material claim were reviewed.",
      qualityOutcome: "light_edits",
    }).success).toBe(true);
    expect(blogDraftReviewSchema.safeParse({
      id: "1484d0df-2f67-4f56-a09f-594509b91a8a",
      decision: "publish",
      reviewerId: "administrator-1",
      expectedRevision: 2,
      reason: "Sources and every material claim were reviewed.",
      qualityOutcome: "rejected",
    }).success).toBe(false);
    expect(blogScheduleControlSchema.safeParse({
      operatorId: "administrator-1",
      reason: "Pause while the source manifest is reviewed.",
    }).success).toBe(true);
  });
});
