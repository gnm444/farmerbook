import { z } from "zod";
import type { FeaturedFarmerQuestionInput } from "./engagement-schemas";

const postmarkAcceptanceSchema = z.object({
  ErrorCode: z.literal(0),
  MessageID: z.string().trim().min(1).max(300),
  SubmittedAt: z.iso.datetime({ offset: true }),
});

export type FeaturedFarmerQuestionNotificationResult =
  | { state: "sent"; receiptId: string }
  | { state: "failed" | "unknown"; failureCode: string };

export function buildFeaturedFarmerQuestionText(input: {
  deliveryId: string;
  submittedAt: string;
  subjectName: string;
  name: string;
  email: string;
  kind: FeaturedFarmerQuestionInput["kind"];
  message: string;
}) {
  return [
    `A visitor sent a private ${input.kind} from the FarmerBook profile for ${input.subjectName}.`,
    "This message is private and is not a public customer recommendation.",
    "",
    `Request ID: ${input.deliveryId}`,
    `Submitted: ${input.submittedAt}`,
    `Visitor: ${input.name}`,
    `Reply email: ${input.email}`,
    `Type: ${input.kind === "question" ? "Question" : "Comment"}`,
    "",
    input.message,
    "",
    "Reply to this email to respond directly to the visitor.",
  ].join("\n");
}

export async function sendFeaturedFarmerQuestionNotification(
  input: {
    deliveryId: string;
    submittedAt: string;
    subjectName: string;
    recipientEmail: string;
    name: string;
    email: string;
    kind: FeaturedFarmerQuestionInput["kind"];
    message: string;
  },
  options: {
    serverToken?: string;
    fromEmail?: string;
    messageStream?: string;
    fetcher?: typeof fetch;
  } = {},
): Promise<FeaturedFarmerQuestionNotificationResult> {
  const serverToken = options.serverToken ?? process.env.POSTMARK_SERVER_TOKEN ?? "";
  const fromEmail = options.fromEmail ?? process.env.POSTMARK_FROM_EMAIL ?? "";
  const messageStream =
    options.messageStream ?? process.env.POSTMARK_TRANSACTIONAL_MESSAGE_STREAM ?? "";

  if (
    serverToken.length < 20 ||
    fromEmail.trim().toLowerCase() !== "ceo@farmerbook.in" ||
    !/^[A-Za-z0-9_-]{1,100}$/.test(messageStream)
  ) {
    return { state: "failed", failureCode: "POSTMARK_NOT_CONFIGURED" };
  }

  let response: Response;
  try {
    response = await (options.fetcher ?? fetch)("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "x-postmark-server-token": serverToken,
      },
      body: JSON.stringify({
        From: `FarmerBook profile questions <${fromEmail}>`,
        To: input.recipientEmail,
        ReplyTo: input.email,
        Subject: `Private FarmerBook ${input.kind} for ${input.subjectName}`,
        TextBody: buildFeaturedFarmerQuestionText(input),
        MessageStream: messageStream,
        Tag: "featured-farmer-question",
        TrackOpens: false,
        TrackLinks: "None",
        Metadata: { deliveryId: input.deliveryId },
        Headers: [
          {
            Name: "Message-ID",
            Value: `<featured-farmer-question-${input.deliveryId}@farmerbook.in>`,
          },
        ],
      }),
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    return { state: "unknown", failureCode: "POSTMARK_DELIVERY_UNKNOWN" };
  }

  if (!response.ok) {
    return response.status >= 500
      ? { state: "unknown", failureCode: "POSTMARK_DELIVERY_UNKNOWN" }
      : { state: "failed", failureCode: `POSTMARK_HTTP_${response.status}` };
  }

  try {
    const parsed = postmarkAcceptanceSchema.parse(await response.json());
    return { state: "sent", receiptId: parsed.MessageID };
  } catch {
    return { state: "unknown", failureCode: "POSTMARK_DELIVERY_UNKNOWN" };
  }
}
