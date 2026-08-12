import { z } from "zod";
import type {
  ConsentAcquisitionProvider,
  OutreachDeliveryProvider,
  ProviderLifecycleEvent,
  ProviderReceipt,
} from "./providers";
import { constantTimeEqual, uuidFromText } from "./crypto";
import {
  createEmailConsentToken,
  createEmailUnsubscribeToken,
  EMAIL_CONSENT_TTL_MS,
  EMAIL_UNSUBSCRIBE_TTL_MS,
} from "./email-action-token";
import type { OutreachChannel } from "./types";

const postmarkReceiptSchema = z.object({
  ErrorCode: z.literal(0),
  Message: z.string(),
  MessageID: z.string().min(1).max(300),
  SubmittedAt: z.iso.datetime({ offset: true }),
  To: z.email(),
});

const postmarkEventSchema = z
  .object({
    RecordType: z.enum([
      "Inbound",
      "Bounce",
      "SpamComplaint",
      "SubscriptionChange",
      "Delivery",
    ]),
    MessageID: z.string().min(1).max(300).nullable().optional(),
    ID: z.union([z.string(), z.number()]).optional(),
    Metadata: z.record(z.string(), z.string()).optional(),
    MailboxHash: z.string().max(300).nullable().optional(),
    OriginalRecipient: z.string().max(500).optional(),
    StrippedTextReply: z.string().max(20_000).nullable().optional(),
    TextBody: z.string().max(20_000).nullable().optional(),
    BouncedAt: z.iso.datetime({ offset: true }).optional(),
    DeliveredAt: z.iso.datetime({ offset: true }).optional(),
    ChangedAt: z.iso.datetime({ offset: true }).optional(),
    Type: z.string().max(100).optional(),
    TypeCode: z.number().int().optional(),
    Inactive: z.boolean().optional(),
    SuppressSending: z.boolean().optional(),
    SuppressionReason: z.string().max(100).nullable().optional(),
  })
  .passthrough();

function validHttpsOrigin(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && parsed.origin === value.replace(/\/$/, "");
  } catch {
    return false;
  }
}

function validInboundAddress(value: string) {
  const [local, domain, extra] = value.split("@");
  return Boolean(
    local &&
      domain &&
      !extra &&
      /^[A-Za-z0-9._-]{3,120}$/.test(local) &&
      /^[A-Za-z0-9.-]{3,180}$/.test(domain),
  );
}

function replyAddress(inboundAddress: string, outboxId: string) {
  const separator = inboundAddress.lastIndexOf("@");
  return `${inboundAddress.slice(0, separator)}+${outboxId}${inboundAddress.slice(separator)}`;
}

function outboxIdFromInbound(event: z.infer<typeof postmarkEventSchema>) {
  if (event.MailboxHash && z.uuid().safeParse(event.MailboxHash).success) {
    return event.MailboxHash;
  }
  const recipient = event.OriginalRecipient ?? "";
  const matched = recipient.match(
    /\+([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})@/i,
  );
  return matched?.[1];
}

export class PostmarkOutreachProvider
  implements ConsentAcquisitionProvider, OutreachDeliveryProvider
{
  readonly name = "postmark";
  readonly configured: boolean;

  constructor(
    private readonly options: {
      serverToken: string;
      fromEmail: string;
      inboundAddress: string;
      messageStream: string;
      applicationOrigin: string;
      actionSigningSecret: string;
      webhookUsername: string;
      webhookPassword: string;
      fetcher?: typeof fetch;
    },
  ) {
    this.configured = Boolean(
      options.serverToken.length >= 20 &&
        z.email().safeParse(options.fromEmail).success &&
        validInboundAddress(options.inboundAddress) &&
        /^[a-z0-9][a-z0-9_-]{1,98}$/i.test(options.messageStream) &&
        validHttpsOrigin(options.applicationOrigin) &&
        options.actionSigningSecret.length >= 32 &&
        options.webhookUsername.length >= 12 &&
        options.webhookPassword.length >= 32,
    );
  }

  private async send(input: {
    contact: string;
    subject: string;
    message: string;
    idempotencyKey: string;
  }): Promise<ProviderReceipt> {
    if (!this.configured) throw new Error("OUTREACH_PROVIDER_NOT_CONFIGURED");
    if (!z.email().safeParse(input.contact).success) {
      throw new Error("POSTMARK_INVALID_RECIPIENT");
    }
    const unsubscribeToken = await createEmailUnsubscribeToken({
      outboxId: input.idempotencyKey,
      expiresAt: Date.now() + EMAIL_UNSUBSCRIBE_TTL_MS,
      secret: this.options.actionSigningSecret,
    });
    const unsubscribeUrl = new URL(
      `/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`,
      this.options.applicationOrigin,
    ).toString();
    const message = `${input.message.trim()}\n\nStop messages: ${unsubscribeUrl}\nYou can also reply STOP.`;
    let response: Response;
    try {
      response = await (this.options.fetcher ?? fetch)(
        "https://api.postmarkapp.com/email",
        {
          method: "POST",
          headers: {
            accept: "application/json",
            "content-type": "application/json",
            "x-postmark-server-token": this.options.serverToken,
          },
          body: JSON.stringify({
            From: `FarmerBook <${this.options.fromEmail}>`,
            To: input.contact,
            ReplyTo: replyAddress(
              this.options.inboundAddress,
              input.idempotencyKey,
            ),
            Subject: input.subject,
            TextBody: message,
            MessageStream: this.options.messageStream,
            Tag: "farmerbook-onboarding",
            TrackOpens: false,
            TrackLinks: "None",
            Metadata: { outboxId: input.idempotencyKey },
            Headers: [
              {
                Name: "Message-ID",
                Value: `<${input.idempotencyKey}@farmerbook.in>`,
              },
              { Name: "List-Unsubscribe", Value: `<${unsubscribeUrl}>` },
              {
                Name: "List-Unsubscribe-Post",
                Value: "List-Unsubscribe=One-Click",
              },
            ],
          }),
          signal: AbortSignal.timeout(8_000),
        },
      );
    } catch {
      // A network timeout is ambiguous: do not automatically retry and risk a
      // duplicate consent or introduction message.
      throw new Error("POSTMARK_DELIVERY_UNKNOWN");
    }
    if (!response.ok) {
      // A provider-side error can be returned after Postmark accepted the
      // message. Require operator review instead of risking a duplicate.
      if (response.status >= 500) {
        throw new Error("POSTMARK_DELIVERY_UNKNOWN");
      }
      throw new Error(`POSTMARK_HTTP_${response.status}`);
    }
    let parsed: z.infer<typeof postmarkReceiptSchema>;
    try {
      parsed = postmarkReceiptSchema.parse(await response.json());
    } catch {
      throw new Error("POSTMARK_DELIVERY_UNKNOWN");
    }
    return {
      provider: this.name,
      receiptId: parsed.MessageID,
      acceptedAt: parsed.SubmittedAt,
    };
  }

  async requestConsent(input: {
    contact: string;
    channel: OutreachChannel;
    templateVersion: string;
    idempotencyKey: string;
    prospectId: string;
    contactCandidateId: string;
    requestedPurposes: Array<
      "farmerbook_introduction" | "onboarding_followup"
    >;
  }) {
    if (input.channel !== "email") {
      throw new Error("POSTMARK_EMAIL_ONLY");
    }
    const token = await createEmailConsentToken({
      prospectId: input.prospectId,
      contactCandidateId: input.contactCandidateId,
      requestedPurposes: input.requestedPurposes,
      expiresAt: Date.now() + EMAIL_CONSENT_TTL_MS,
      secret: this.options.actionSigningSecret,
    });
    const confirmationUrl = new URL(
      `/confirm-email?token=${encodeURIComponent(token)}`,
      this.options.applicationOrigin,
    ).toString();
    return this.send({
      contact: input.contact,
      subject: "Confirm your FarmerBook request",
      message:
        `You asked FarmerBook to contact you about its agriculture network. ` +
        `Confirm within 48 hours: ${confirmationUrl}\n\n` +
        `If you did not make this request, ignore this message. ` +
        `FarmerBook will not send an introduction without confirmation.`,
      idempotencyKey: input.idempotencyKey,
    });
  }

  deliver(input: {
    contact: string;
    channel: OutreachChannel;
    message: string;
    idempotencyKey: string;
  }) {
    if (input.channel !== "email") {
      throw new Error("POSTMARK_EMAIL_ONLY");
    }
    return this.send({
      contact: input.contact,
      subject: "Your FarmerBook invitation",
      message: input.message,
      idempotencyKey: input.idempotencyKey,
    });
  }

  async verifyWebhook(): Promise<never> {
    throw new Error("POSTMARK_USES_SIGNED_CONFIRMATION_LINKS");
  }

  async verifyLifecycleWebhook(
    request: Request,
  ): Promise<ProviderLifecycleEvent> {
    if (!this.configured) throw new Error("OUTREACH_PROVIDER_NOT_CONFIGURED");
    const contentLength = Number(request.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > 32_768) {
      throw new Error("OUTREACH_PROVIDER_PAYLOAD_TOO_LARGE");
    }
    const expected = `Basic ${btoa(`${this.options.webhookUsername}:${this.options.webhookPassword}`)}`;
    const provided = request.headers.get("authorization") ?? "";
    if (!constantTimeEqual(provided, expected)) {
      throw new Error("OUTREACH_PROVIDER_SIGNATURE_INVALID");
    }
    const body = await request.text();
    if (body.length > 32_768) {
      throw new Error("OUTREACH_PROVIDER_PAYLOAD_TOO_LARGE");
    }
    const event = postmarkEventSchema.parse(JSON.parse(body));
    if (event.RecordType === "Delivery") {
      throw new Error("POSTMARK_EVENT_IGNORED");
    }
    if (
      event.RecordType === "SubscriptionChange" &&
      event.SuppressSending !== true
    ) {
      throw new Error("POSTMARK_EVENT_IGNORED");
    }
    const outboxId =
      event.Metadata?.outboxId ??
      (event.RecordType === "Inbound" ? outboxIdFromInbound(event) : undefined);
    const providerReceiptId = event.MessageID ?? undefined;
    if (!outboxId && !providerReceiptId) {
      throw new Error("POSTMARK_EVENT_UNBOUND");
    }
    const eventType = (() => {
      if (event.RecordType === "Inbound") return "reply" as const;
      if (event.RecordType === "SpamComplaint") return "complaint" as const;
      if (event.RecordType === "Bounce") {
        return event.TypeCode === 1 || event.Inactive === true
          ? ("hard_bounce" as const)
          : ("soft_bounce" as const);
      }
      if (event.SuppressionReason === "HardBounce") {
        return "hard_bounce" as const;
      }
      if (event.SuppressionReason === "SpamComplaint") {
        return "complaint" as const;
      }
      return "declined" as const;
    })();
    const providerEventId = String(
      event.MessageID ?? event.ID ?? `${outboxId}:${eventType}`,
    ).slice(0, 300);
    const messageText =
      eventType === "reply"
        ? (event.StrippedTextReply ?? event.TextBody ?? "").trim().slice(0, 1_000)
        : undefined;
    if (eventType === "reply" && !messageText) {
      throw new Error("POSTMARK_EMPTY_REPLY");
    }
    const occurredAt =
      event.BouncedAt ??
      event.DeliveredAt ??
      event.ChangedAt ??
      new Date().toISOString();
    return {
      idempotencyKey: await uuidFromText(
        `postmark-event:${providerEventId}:${eventType}`,
      ),
      outboxId,
      providerReceiptId,
      channel: "email",
      eventType,
      occurredAt,
      providerEventId,
      messageText,
    };
  }
}
