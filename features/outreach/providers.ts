import type { OutreachChannel } from "./types";
import type { OutreachEngagementType } from "./schemas";
import { z } from "zod";
import { constantTimeEqual } from "./crypto";
import { PostmarkOutreachProvider } from "./postmark-provider";

export type ProviderReceipt = {
  provider: string;
  receiptId: string;
  acceptedAt: string;
};

export type ConsentDecision = {
  idempotencyKey: string;
  prospectId: string;
  contactCandidateId: string;
  contactHash: string;
  channel: OutreachChannel;
  purpose: "farmerbook_introduction" | "onboarding_followup";
  granted: boolean;
  occurredAt: string;
  providerReceiptId: string;
};

type ProviderLifecycleEventBase = {
  idempotencyKey: string;
  channel: OutreachChannel;
  eventType:
    | "reply"
    | "declined"
    | "complaint"
    | "hard_bounce"
    | "soft_bounce";
  occurredAt: string;
  providerEventId: string;
  messageText?: string;
};

export type ProviderLifecycleEvent = ProviderLifecycleEventBase &
  (
    | {
        prospectId: string;
        contactCandidateId: string;
        contactHash: string;
        outboxId?: never;
        providerReceiptId?: never;
      }
    | {
        outboxId?: string;
        providerReceiptId?: string;
        prospectId?: never;
        contactCandidateId?: never;
        contactHash?: never;
      }
  );

export interface ConsentAcquisitionProvider {
  readonly name: string;
  readonly configured: boolean;
  requestConsent(input: {
    contact: string;
    channel: OutreachChannel;
    templateVersion: string;
    idempotencyKey: string;
    prospectId: string;
    contactCandidateId: string;
    engagementType: OutreachEngagementType;
    requestedPurposes: Array<"farmerbook_introduction" | "onboarding_followup">;
  }): Promise<ProviderReceipt>;
  verifyWebhook(request: Request): Promise<ConsentDecision>;
  verifyLifecycleWebhook(request: Request): Promise<ProviderLifecycleEvent>;
}

const receiptSchema = z.object({
  provider: z.string().min(2).max(80),
  receiptId: z.string().min(1).max(300),
  acceptedAt: z.iso.datetime(),
});

const consentDecisionSchema = z.object({
  idempotencyKey: z.uuid(),
  prospectId: z.uuid(),
  contactCandidateId: z.uuid(),
  contactHash: z.string().regex(/^[0-9a-f]{64}$/),
  channel: z.enum(["email", "sms", "whatsapp"]),
  purpose: z.enum(["farmerbook_introduction", "onboarding_followup"]),
  granted: z.boolean(),
  occurredAt: z.iso.datetime(),
  providerReceiptId: z.string().min(1).max(300),
});

const lifecycleEventSchema = z
  .object({
    idempotencyKey: z.uuid(),
    prospectId: z.uuid(),
    contactCandidateId: z.uuid(),
    contactHash: z.string().regex(/^[0-9a-f]{64}$/),
    channel: z.enum(["email", "sms", "whatsapp"]),
    eventType: z.enum([
      "reply",
      "declined",
      "complaint",
      "hard_bounce",
      "soft_bounce",
    ]),
    occurredAt: z.iso.datetime(),
    providerEventId: z.string().min(1).max(300),
    messageText: z.string().min(1).max(1_000).optional(),
  })
  .refine(
    (value) => value.eventType !== "reply" || Boolean(value.messageText),
    { message: "Reply events require a bounded message." },
  );

async function hmacHex(value: string, secret: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, encoder.encode(value)),
  );
  return [...signed].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function verifySignedProviderPayload<T>(
  request: Request,
  secret: string,
  schema: z.ZodType<T>,
) {
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > 32_768) {
    throw new Error("OUTREACH_PROVIDER_PAYLOAD_TOO_LARGE");
  }
  const providedSignature = request.headers.get("x-farmerbook-signature") ?? "";
  const body = await request.text();
  if (body.length > 32_768) throw new Error("OUTREACH_PROVIDER_PAYLOAD_TOO_LARGE");
  const expectedSignature = await hmacHex(body, secret);
  if (!constantTimeEqual(providedSignature, expectedSignature)) {
    throw new Error("OUTREACH_PROVIDER_SIGNATURE_INVALID");
  }
  return schema.parse(JSON.parse(body));
}

export class HttpOutreachProvider
  implements ConsentAcquisitionProvider, OutreachDeliveryProvider
{
  readonly name = "configured-http-provider";
  readonly configured: boolean;

  constructor(
    private readonly options: {
      baseUrl: string;
      apiToken: string;
      webhookSecret: string;
      fetcher?: typeof fetch;
    },
  ) {
    try {
      const url = new URL(options.baseUrl);
      this.configured =
        url.protocol === "https:" &&
        options.apiToken.length >= 20 &&
        options.webhookSecret.length >= 32;
    } catch {
      this.configured = false;
    }
  }

  private async post(path: string, body: object, idempotencyKey: string) {
    if (!this.configured) throw new Error("OUTREACH_PROVIDER_NOT_CONFIGURED");
    const response = await (this.options.fetcher ?? fetch)(
      new URL(
        path,
        this.options.baseUrl.endsWith("/")
          ? this.options.baseUrl
          : `${this.options.baseUrl}/`,
      ),
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.options.apiToken}`,
          "content-type": "application/json",
          "idempotency-key": idempotencyKey,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(8_000),
      },
    );
    if (!response.ok) throw new Error(`OUTREACH_PROVIDER_HTTP_${response.status}`);
    return receiptSchema.parse(await response.json());
  }

  requestConsent(input: {
    contact: string;
    channel: OutreachChannel;
    templateVersion: string;
    idempotencyKey: string;
    prospectId: string;
    contactCandidateId: string;
    requestedPurposes: Array<"farmerbook_introduction" | "onboarding_followup">;
  }) {
    return this.post("consents", input, input.idempotencyKey);
  }

  deliver(input: {
    contact: string;
    channel: OutreachChannel;
    message: string;
    idempotencyKey: string;
    purpose: "farmerbook_introduction" | "onboarding_followup" | "onboarding_reply";
    engagementType: OutreachEngagementType;
  }) {
    return this.post("messages", input, input.idempotencyKey);
  }

  async verifyWebhook(request: Request) {
    if (!this.configured) throw new Error("OUTREACH_PROVIDER_NOT_CONFIGURED");
    return verifySignedProviderPayload(
      request,
      this.options.webhookSecret,
      consentDecisionSchema,
    );
  }

  async verifyLifecycleWebhook(request: Request) {
    if (!this.configured) throw new Error("OUTREACH_PROVIDER_NOT_CONFIGURED");
    return verifySignedProviderPayload(
      request,
      this.options.webhookSecret,
      lifecycleEventSchema,
    );
  }
}

export function createConfiguredOutreachProvider(
  fetcher?: typeof fetch,
): ConsentAcquisitionProvider & OutreachDeliveryProvider {
  if (process.env.OUTREACH_PROVIDER_KIND === "postmark") {
    const provider = new PostmarkOutreachProvider({
      serverToken: process.env.POSTMARK_SERVER_TOKEN ?? "",
      fromEmail: process.env.POSTMARK_FROM_EMAIL ?? "",
      inboundAddress: process.env.POSTMARK_INBOUND_ADDRESS ?? "",
      transactionalMessageStream:
        process.env.POSTMARK_TRANSACTIONAL_MESSAGE_STREAM ?? "",
      broadcastMessageStream: process.env.POSTMARK_BROADCAST_MESSAGE_STREAM ?? "",
      postalAddress: process.env.OUTREACH_SENDER_POSTAL_ADDRESS ?? "",
      applicationOrigin: process.env.NEXT_PUBLIC_SITE_URL ?? "",
      actionSigningSecret:
        process.env.OUTREACH_EMAIL_ACTION_SIGNING_SECRET ?? "",
      webhookUsername: process.env.POSTMARK_WEBHOOK_USERNAME ?? "",
      webhookPassword: process.env.POSTMARK_WEBHOOK_PASSWORD ?? "",
      fetcher,
    });
    return provider.configured ? provider : new NonSendingOutreachProvider();
  }
  const provider = new HttpOutreachProvider({
    baseUrl: process.env.OUTREACH_PROVIDER_BASE_URL ?? "",
    apiToken: process.env.OUTREACH_PROVIDER_API_TOKEN ?? "",
    webhookSecret: process.env.OUTREACH_PROVIDER_WEBHOOK_SECRET ?? "",
    fetcher,
  });
  return provider.configured ? provider : new NonSendingOutreachProvider();
}

export interface OutreachDeliveryProvider {
  readonly name: string;
  readonly configured: boolean;
  deliver(input: {
    contact: string;
    channel: OutreachChannel;
    message: string;
    idempotencyKey: string;
    purpose: "farmerbook_introduction" | "onboarding_followup" | "onboarding_reply";
    engagementType: OutreachEngagementType;
  }): Promise<ProviderReceipt>;
}

export class NonSendingOutreachProvider
  implements ConsentAcquisitionProvider, OutreachDeliveryProvider
{
  readonly name = "not-configured";
  readonly configured = false;

  async requestConsent(): Promise<never> {
    throw new Error("OUTREACH_PROVIDER_NOT_CONFIGURED");
  }

  async verifyWebhook(): Promise<never> {
    throw new Error("OUTREACH_PROVIDER_NOT_CONFIGURED");
  }

  async verifyLifecycleWebhook(): Promise<never> {
    throw new Error("OUTREACH_PROVIDER_NOT_CONFIGURED");
  }

  async deliver(): Promise<never> {
    throw new Error("OUTREACH_PROVIDER_NOT_CONFIGURED");
  }
}
