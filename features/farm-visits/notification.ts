import { z } from "zod";
import type {
  FarmVisitNotificationInput,
  FarmVisitNotificationResult,
} from "./contracts";

export const FARM_VISIT_NOTIFICATION_RECIPIENTS = Object.freeze([
  "gnm444@gmail.com",
  "ceo@farmerbook.in",
] as const);

const postmarkAcceptanceSchema = z.object({
  ErrorCode: z.literal(0),
  MessageID: z.string().trim().min(1).max(300),
  SubmittedAt: z.iso.datetime({ offset: true }),
});

function describeInterest(value: FarmVisitNotificationInput["farmingInterest"]) {
  return {
    organic: "Organic farming",
    natural: "Natural farming",
    both: "Organic and natural farming",
    general: "General farm visit",
  }[value];
}

function describeSchedule(value: FarmVisitNotificationInput["preferredSchedule"]) {
  return {
    weekday: "Weekday",
    weekend: "Weekend",
    either: "Weekday or weekend",
  }[value];
}

function describeVisitorType(value: FarmVisitNotificationInput["visitorType"]) {
  return {
    individual: "Individual or family",
    school: "School or educational institution",
    fpo: "Farmer Producer Organisation (FPO)",
    corporate: "Corporate or organisation",
    other: "Other group",
  }[value];
}

function isHighPriority(input: FarmVisitNotificationInput) {
  return input.visitorType === "school" || input.visitorType === "fpo" || input.visitorType === "corporate";
}

export function buildFarmVisitNotificationText(input: FarmVisitNotificationInput) {
  const address = [
    input.addressLine1,
    input.addressLine2,
    input.locality,
    input.district,
    input.state,
    input.postalCode,
  ].filter(Boolean).join(", ");

  return [
    isHighPriority(input)
      ? "HIGH PRIORITY: A school, FPO or corporate organisation has asked FarmerBook to arrange a suitable farm visit."
      : "A Customer has asked FarmerBook to arrange a suitable farm visit.",
    "No visit has been promised or confirmed. Please check with a suitable Farmer before contacting the Customer.",
    "",
    `Request ID: ${input.requestId}`,
    `Submitted: ${input.submittedAt}`,
    `Customer: ${input.requesterName}`,
    `Account email: ${input.requesterEmail}`,
    `Phone: ${input.phone}`,
    `Private address: ${address}`,
    `Interest: ${describeInterest(input.farmingInterest)}`,
    `Visitor type: ${describeVisitorType(input.visitorType)}`,
    `Organisation: ${input.organizationName ?? "Not provided"}`,
    `Contact role: ${input.contactRole ?? "Not provided"}`,
    `Party size: ${input.partySize}`,
    `Preferred schedule: ${describeSchedule(input.preferredSchedule)}`,
    `Notes: ${input.notes ?? "None provided"}`,
    "",
    "These details are private and are provided only for FarmerBook visit planning.",
  ].join("\n");
}

export async function sendFarmVisitOwnerNotification(
  input: FarmVisitNotificationInput,
  options: {
    serverToken?: string;
    fromEmail?: string;
    messageStream?: string;
    fetcher?: typeof fetch;
  } = {},
): Promise<FarmVisitNotificationResult> {
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
        From: `FarmerBook Farm Visits <${fromEmail}>`,
        To: FARM_VISIT_NOTIFICATION_RECIPIENTS.join(","),
        ReplyTo: fromEmail,
        Subject: `${isHighPriority(input) ? "HIGH PRIORITY: " : ""}New FarmerBook farm visit request ${input.requestId}`,
        TextBody: buildFarmVisitNotificationText(input),
        MessageStream: messageStream,
        Tag: isHighPriority(input) ? "farm-visit-high-priority" : "farm-visit-request",
        TrackOpens: false,
        TrackLinks: "None",
        Metadata: { requestId: input.requestId, priority: isHighPriority(input) ? "high" : "normal" },
        Headers: [{
          Name: "Message-ID",
          Value: `<farm-visit-${input.requestId}@farmerbook.in>`,
        }],
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
