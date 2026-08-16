import { describe, expect, it, vi } from "vitest";
import { PostmarkOutreachProvider } from "@/features/outreach/postmark-provider";

function postmarkProvider(fetcher?: typeof fetch) {
  return new PostmarkOutreachProvider({
    serverToken: "p".repeat(32),
    fromEmail: "ceo@farmerbook.in",
    inboundAddress: "serverhash@inbound.postmarkapp.com",
    transactionalMessageStream: "farmerbook-transactional",
    broadcastMessageStream: "farmerbook-broadcast",
    postalAddress: "FarmerBook, Hyderabad, Telangana 500001, India",
    applicationOrigin: "https://farmerbook.in",
    actionSigningSecret: "a".repeat(48),
    webhookUsername: "farmerbook-events",
    webhookPassword: "w".repeat(48),
    fetcher,
  });
}

function postmarkAuth() {
  return `Basic ${btoa(`farmerbook-events:${"w".repeat(48)}`)}`;
}

describe("Postmark outreach provider", () => {
  it("sends a privacy-minimized double-opt-in email with one-click unsubscribe", async () => {
    const fetcher = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        void input;
        void init;
        return Response.json({
          ErrorCode: 0,
          Message: "OK",
          MessageID: "postmark-message-1",
          SubmittedAt: "2026-08-10T12:00:00.000Z",
          To: "grower@example.com",
        });
      },
    );
    const provider = postmarkProvider(fetcher as typeof fetch);
    await expect(
      provider.requestConsent({
        contact: "grower@example.com",
        channel: "email",
        templateVersion: "v1",
        idempotencyKey: "00000000-0000-4000-8000-000000000101",
        prospectId: "00000000-0000-4000-8000-000000000102",
        contactCandidateId: "00000000-0000-4000-8000-000000000103",
        engagementType: "membership",
        requestedPurposes: ["farmerbook_introduction"],
      }),
    ).resolves.toMatchObject({
      provider: "postmark",
      receiptId: "postmark-message-1",
    });
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe("https://api.postmarkapp.com/email");
    expect(init?.headers).toMatchObject({
      "x-postmark-server-token": "p".repeat(32),
    });
    const body = JSON.parse(String(init?.body));
    expect(body).toMatchObject({
      From: "FarmerBook CEO <ceo@farmerbook.in>",
      To: "grower@example.com",
      MessageStream: "farmerbook-transactional",
      TrackOpens: false,
      TrackLinks: "None",
      Metadata: { outboxId: "00000000-0000-4000-8000-000000000101" },
    });
    expect(body.ReplyTo).toContain(
      "+00000000-0000-4000-8000-000000000101@",
    );
    expect(body.TextBody).toContain("/confirm-email?token=");
    expect(body.TextBody).toContain("Hyderabad, Telangana 500001, India");
    expect(body.Headers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ Name: "List-Unsubscribe" }),
        expect.objectContaining({ Name: "List-Unsubscribe-Post" }),
      ]),
    );
  });

  it("verifies Basic auth and binds an inbound reply to its outbox", async () => {
    const provider = postmarkProvider();
    const body = JSON.stringify({
      RecordType: "Inbound",
      MessageID: "reply-1",
      MailboxHash: "00000000-0000-4000-8000-000000000101",
      StrippedTextReply: "STOP",
    });
    await expect(
      provider.verifyLifecycleWebhook(
        new Request("https://farmerbook.in/api/outreach/provider/events", {
          method: "POST",
          body,
          headers: { authorization: postmarkAuth() },
        }),
      ),
    ).resolves.toMatchObject({
      outboxId: "00000000-0000-4000-8000-000000000101",
      eventType: "reply",
      messageText: "STOP",
    });
    await expect(
      provider.verifyLifecycleWebhook(
        new Request("https://farmerbook.in/api/outreach/provider/events", {
          method: "POST",
          body,
          headers: { authorization: "Basic invalid" },
        }),
      ),
    ).rejects.toThrow("OUTREACH_PROVIDER_SIGNATURE_INVALID");
  });

  it("maps permanent bounces and complaints to terminal lifecycle events", async () => {
    const provider = postmarkProvider();
    const request = (value: object) =>
      new Request("https://farmerbook.in/api/outreach/provider/events", {
        method: "POST",
        body: JSON.stringify(value),
        headers: { authorization: postmarkAuth() },
      });
    await expect(
      provider.verifyLifecycleWebhook(
        request({
          RecordType: "Bounce",
          MessageID: "bounce-1",
          TypeCode: 1,
          Inactive: true,
          BouncedAt: "2026-08-10T12:00:00.000Z",
          Metadata: { outboxId: "00000000-0000-4000-8000-000000000101" },
        }),
      ),
    ).resolves.toMatchObject({ eventType: "hard_bounce" });
    await expect(
      provider.verifyLifecycleWebhook(
        request({
          RecordType: "SpamComplaint",
          MessageID: "complaint-1",
          Metadata: { outboxId: "00000000-0000-4000-8000-000000000101" },
        }),
      ),
    ).resolves.toMatchObject({ eventType: "complaint" });
  });

  it("fails closed on ambiguous delivery responses", async () => {
    const provider = postmarkProvider(
      vi.fn(async () => {
        throw new Error("timeout");
      }) as typeof fetch,
    );
    await expect(
      provider.deliver({
        contact: "grower@example.com",
        channel: "email",
        message: "A consented FarmerBook introduction.",
        idempotencyKey: "00000000-0000-4000-8000-000000000101",
        purpose: "farmerbook_introduction",
        engagementType: "membership",
      }),
    ).rejects.toThrow("POSTMARK_DELIVERY_UNKNOWN");
  });

  it("does not retry an ambiguous provider-side failure", async () => {
    const provider = postmarkProvider(
      vi.fn(async () => new Response("unavailable", { status: 503 })) as typeof fetch,
    );
    await expect(
      provider.deliver({
        contact: "grower@example.com",
        channel: "email",
        message: "A consented FarmerBook introduction.",
        idempotencyKey: "00000000-0000-4000-8000-000000000101",
        purpose: "farmerbook_introduction",
        engagementType: "membership",
      }),
    ).rejects.toThrow("POSTMARK_DELIVERY_UNKNOWN");
  });

  it("accepts Postmark timestamps with timezone offsets", async () => {
    const provider = postmarkProvider(
      vi.fn(async () =>
        Response.json({
          ErrorCode: 0,
          Message: "OK",
          MessageID: "postmark-message-offset",
          SubmittedAt: "2026-08-10T17:30:00+05:30",
          To: "grower@example.com",
        }),
      ) as typeof fetch,
    );
    await expect(
      provider.deliver({
        contact: "grower@example.com",
        channel: "email",
        message: "A consented FarmerBook introduction.",
        idempotencyKey: "00000000-0000-4000-8000-000000000101",
        purpose: "farmerbook_introduction",
        engagementType: "membership",
      }),
    ).resolves.toMatchObject({
      acceptedAt: "2026-08-10T17:30:00+05:30",
    });
  });

  it("uses Broadcast only for the separately consented follow-up", async () => {
    const fetcher = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        void input;
        void init;
        return Response.json({
          ErrorCode: 0,
          Message: "OK",
          MessageID: "postmark-followup",
          SubmittedAt: "2026-08-10T12:00:00.000Z",
          To: "grower@example.com",
        });
      },
    );
    const provider = postmarkProvider(fetcher as typeof fetch);
    await provider.deliver({
      contact: "grower@example.com",
      channel: "email",
      message: "The one follow-up you separately requested from FarmerBook.",
      idempotencyKey: "00000000-0000-4000-8000-000000000101",
      purpose: "onboarding_followup",
      engagementType: "membership",
    });
    const body = JSON.parse(String(fetcher.mock.calls[0][1]?.body));
    expect(body.MessageStream).toBe("farmerbook-broadcast");
    expect(body.Tag).toBe("farmerbook-followup");
  });

  it("rejects an unverified Gmail sender and placeholder postal address", () => {
    const base = {
      serverToken: "p".repeat(32),
      inboundAddress: "serverhash@inbound.postmarkapp.com",
      transactionalMessageStream: "farmerbook-transactional",
      applicationOrigin: "https://farmerbook.in",
      actionSigningSecret: "a".repeat(48),
      webhookUsername: "farmerbook-events",
      webhookPassword: "w".repeat(48),
    };
    expect(
      new PostmarkOutreachProvider({
        ...base,
        fromEmail: "gnm444@gmail.com",
        postalAddress: "FarmerBook, Hyderabad, Telangana 500001, India",
      }).configured,
    ).toBe(false);
    expect(
      new PostmarkOutreachProvider({
        ...base,
        fromEmail: "ceo@farmerbook.in",
        postalAddress: "TBD placeholder",
      }).configured,
    ).toBe(false);
  });
});
