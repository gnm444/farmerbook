import { describe, expect, it, vi } from "vitest";
import {
  HttpOutreachProvider,
  NonSendingOutreachProvider,
} from "@/features/outreach/providers";

async function hmacHex(value: string, secret: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, encoder.encode(value)),
  );
  return [...signature].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

describe("outreach provider boundary", () => {
  const secret = "w".repeat(48);

  it("fails closed when provider settings are incomplete", async () => {
    const provider = new HttpOutreachProvider({
      baseUrl: "http://provider.example/",
      apiToken: "short",
      webhookSecret: "short",
    });
    expect(provider.configured).toBe(false);
    await expect(
      provider.deliver({
        contact: "test@example.com",
        channel: "email",
        message: "A message that is long enough for delivery.",
        idempotencyKey: crypto.randomUUID(),
        purpose: "farmerbook_introduction",
        engagementType: "membership",
      }),
    ).rejects.toThrow("OUTREACH_PROVIDER_NOT_CONFIGURED");
    await expect(new NonSendingOutreachProvider().deliver()).rejects.toThrow(
      "OUTREACH_PROVIDER_NOT_CONFIGURED",
    );
  });

  it("uses bearer auth and idempotency without exposing provider internals", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL, request?: RequestInit) => {
      void input;
      void request;
      return Response.json({
        provider: "approved-gateway",
        receiptId: "receipt-1",
        acceptedAt: "2026-08-09T12:00:00.000Z",
      });
    });
    const provider = new HttpOutreachProvider({
      baseUrl: "https://provider.example/v1/",
      apiToken: "t".repeat(32),
      webhookSecret: secret,
      fetcher: fetcher as typeof fetch,
    });
    const idempotencyKey = crypto.randomUUID();
    await expect(
      provider.deliver({
        contact: "test@example.com",
        channel: "email",
        message: "A consented FarmerBook introduction.",
        idempotencyKey,
        purpose: "farmerbook_introduction",
        engagementType: "membership",
      }),
    ).resolves.toMatchObject({ receiptId: "receipt-1" });
    const [, request] = fetcher.mock.calls[0];
    expect(String(fetcher.mock.calls[0][0])).toBe("https://provider.example/v1/messages");
    expect(request?.headers).toMatchObject({
      authorization: `Bearer ${"t".repeat(32)}`,
      "idempotency-key": idempotencyKey,
    });
  });

  it("accepts only HMAC-authenticated, prospect-bound consent decisions", async () => {
    const provider = new HttpOutreachProvider({
      baseUrl: "https://provider.example/v1/",
      apiToken: "t".repeat(32),
      webhookSecret: secret,
    });
    const payload = JSON.stringify({
      idempotencyKey: crypto.randomUUID(),
      prospectId: crypto.randomUUID(),
      contactCandidateId: crypto.randomUUID(),
      contactHash: "a".repeat(64),
      channel: "email",
      purpose: "farmerbook_introduction",
      granted: true,
      occurredAt: "2026-08-09T12:00:00.000Z",
      providerReceiptId: "consent-1",
    });
    const signature = await hmacHex(payload, secret);
    await expect(
      provider.verifyWebhook(
        new Request("https://farmerbook.in/api/outreach/provider/consent", {
          method: "POST",
          body: payload,
          headers: { "x-farmerbook-signature": signature },
        }),
      ),
    ).resolves.toMatchObject({ granted: true, contactHash: "a".repeat(64) });
    await expect(
      provider.verifyWebhook(
        new Request("https://farmerbook.in/api/outreach/provider/consent", {
          method: "POST",
          body: payload,
          headers: { "x-farmerbook-signature": "bad" },
        }),
      ),
    ).rejects.toThrow("OUTREACH_PROVIDER_SIGNATURE_INVALID");
  });

  it("accepts a signed bounded reply event and rejects a reply without text", async () => {
    const provider = new HttpOutreachProvider({
      baseUrl: "https://provider.example/v1/",
      apiToken: "t".repeat(32),
      webhookSecret: secret,
    });
    const event = {
      idempotencyKey: crypto.randomUUID(),
      prospectId: crypto.randomUUID(),
      contactCandidateId: crypto.randomUUID(),
      contactHash: "b".repeat(64),
      channel: "whatsapp",
      eventType: "reply",
      occurredAt: "2026-08-10T12:00:00.000Z",
      providerEventId: "reply-1",
      messageText: "STOP",
    };
    const body = JSON.stringify(event);
    await expect(
      provider.verifyLifecycleWebhook(
        new Request("https://farmerbook.in/api/outreach/provider/events", {
          method: "POST",
          body,
          headers: { "x-farmerbook-signature": await hmacHex(body, secret) },
        }),
      ),
    ).resolves.toMatchObject({ eventType: "reply", messageText: "STOP" });

    const invalidBody = JSON.stringify({ ...event, messageText: undefined });
    await expect(
      provider.verifyLifecycleWebhook(
        new Request("https://farmerbook.in/api/outreach/provider/events", {
          method: "POST",
          body: invalidBody,
          headers: {
            "x-farmerbook-signature": await hmacHex(invalidBody, secret),
          },
        }),
      ),
    ).rejects.toThrow();
  });
});
