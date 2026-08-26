import { describe, expect, it, vi } from "vitest";
import {
  buildFeaturedFarmerQuestionText,
  sendFeaturedFarmerQuestionNotification,
} from "@/features/featured-farmers/question-notification";

const question = {
  deliveryId: "82000000-0000-4000-8000-000000000001",
  submittedAt: "2026-08-25T08:00:00.000Z",
  subjectName: "Sandeep Dasari / Avani Van Farms",
  recipientEmail: "avanivanfarms@gmail.com",
  name: "Synthetic Visitor",
  email: "visitor@farmerbook.invalid",
  kind: "question" as const,
  message: "Could you please share the normal timing for collecting Gir-cow milk?",
};

const options = {
  serverToken: "server-token-that-is-long-enough",
  fromEmail: "ceo@farmerbook.in",
  messageStream: "outbound",
};

describe("Featured Farmer private question notification", () => {
  it("sends once to the fixed farm address with visitor ReplyTo and no tracking", async () => {
    const fetcher = vi.fn(async (...args: Parameters<typeof fetch>) => {
      void args;
      return new Response(JSON.stringify({
        ErrorCode: 0,
        MessageID: "postmark-featured-question-1",
        SubmittedAt: "2026-08-25T13:30:00+05:30",
      }), { status: 200, headers: { "content-type": "application/json" } });
    });
    await expect(sendFeaturedFarmerQuestionNotification(question, {
      ...options,
      fetcher,
    })).resolves.toEqual({
      state: "sent",
      receiptId: "postmark-featured-question-1",
    });
    const body = JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body));
    expect(body).toMatchObject({
      To: "avanivanfarms@gmail.com",
      ReplyTo: "visitor@farmerbook.invalid",
      TrackOpens: false,
      TrackLinks: "None",
      Tag: "featured-farmer-question",
      Metadata: { deliveryId: question.deliveryId },
    });
    expect(body.Headers).toEqual([{
      Name: "Message-ID",
      Value: `<featured-farmer-question-${question.deliveryId}@farmerbook.in>`,
    }]);
  });

  it("builds plain text and distinguishes it from a public recommendation", () => {
    const text = buildFeaturedFarmerQuestionText(question);
    expect(text).toContain(question.message);
    expect(text).toContain("not a public customer recommendation");
    expect(text).not.toContain("<html");
  });

  it("never retries and classifies explicit failure separately from ambiguity", async () => {
    await expect(sendFeaturedFarmerQuestionNotification(question, {
      ...options,
      fetcher: vi.fn(async () => new Response("bad", { status: 422 })),
    })).resolves.toEqual({ state: "failed", failureCode: "POSTMARK_HTTP_422" });
    await expect(sendFeaturedFarmerQuestionNotification(question, {
      ...options,
      fetcher: vi.fn(async () => new Response("bad", { status: 503 })),
    })).resolves.toEqual({
      state: "unknown",
      failureCode: "POSTMARK_DELIVERY_UNKNOWN",
    });
    await expect(sendFeaturedFarmerQuestionNotification(question, {
      ...options,
      fetcher: vi.fn(async () => { throw new Error("timeout"); }),
    })).resolves.toEqual({
      state: "unknown",
      failureCode: "POSTMARK_DELIVERY_UNKNOWN",
    });
  });
});
