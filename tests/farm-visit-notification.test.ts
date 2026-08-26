import { describe, expect, it, vi } from "vitest";
import {
  FARM_VISIT_NOTIFICATION_RECIPIENTS,
  buildFarmVisitNotificationText,
  sendFarmVisitOwnerNotification,
} from "@/features/farm-visits/notification";

const request = {
  requestId: "78000000-0000-4000-8000-000000000010",
  requesterName: "Synthetic Customer",
  requesterEmail: "synthetic@farmerbook.invalid",
  submittedAt: "2026-08-24T06:00:00.000Z",
  phone: "+919876543210",
  addressLine1: "42 Test Farm Road",
  addressLine2: undefined,
  locality: "Madhapur",
  district: "Hyderabad",
  state: "Telangana" as const,
  postalCode: "500081",
  farmingInterest: "both" as const,
  partySize: 3,
  preferredSchedule: "weekend" as const,
  visitorType: "individual" as const,
  organizationName: undefined,
  contactRole: undefined,
  notes: "Interested in soil health.",
};

const options = {
  serverToken: "server-token-that-is-long-enough",
  fromEmail: "ceo@farmerbook.in",
  messageStream: "outbound",
};

describe("Farm Visit owner notification", () => {
  it("sends one untracked transactional email to only the approved inboxes", async () => {
    const fetcher = vi.fn(async (...args: Parameters<typeof fetch>) => {
      void args;
      return new Response(JSON.stringify({
          ErrorCode: 0,
          MessageID: "postmark-receipt-1",
          SubmittedAt: "2026-08-24T11:30:00+05:30",
        }), { status: 200, headers: { "content-type": "application/json" } });
    });
    await expect(sendFarmVisitOwnerNotification(request, { ...options, fetcher })).resolves.toEqual({
      state: "sent",
      receiptId: "postmark-receipt-1",
    });
    expect(FARM_VISIT_NOTIFICATION_RECIPIENTS).toEqual([
      "gnm444@gmail.com",
      "ceo@farmerbook.in",
    ]);
    const body = JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body));
    expect(body).toMatchObject({
      To: "gnm444@gmail.com,ceo@farmerbook.in",
      TrackOpens: false,
      TrackLinks: "None",
      MessageStream: "outbound",
      Metadata: { requestId: request.requestId, priority: "normal" },
    });
    expect(body.TextBody).toContain("Private address: 42 Test Farm Road, Madhapur, Hyderabad, Telangana, 500081");
    expect(body.TextBody).toContain("No visit has been promised or confirmed");
    expect(body.Headers).toEqual([{ Name: "Message-ID", Value: `<farm-visit-${request.requestId}@farmerbook.in>` }]);
  });

  it("marks school and corporate requests as high priority without widening recipients", async () => {
    const fetcher = vi.fn(async (...args: Parameters<typeof fetch>) => {
      void args;
      return new Response(JSON.stringify({
      ErrorCode: 0,
      MessageID: "postmark-receipt-2",
      SubmittedAt: "2026-08-24T11:30:00+05:30",
      }), { status: 200, headers: { "content-type": "application/json" } });
    });
    const schoolRequest = {
      ...request,
      visitorType: "school" as const,
      organizationName: "Green Valley School",
      contactRole: "Science teacher",
    };
    await sendFarmVisitOwnerNotification(schoolRequest, { ...options, fetcher });
    const body = JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body));
    expect(body.Subject).toMatch(/^HIGH PRIORITY:/);
    expect(body.Tag).toBe("farm-visit-high-priority");
    expect(body.Metadata).toEqual({ requestId: request.requestId, priority: "high" });
    expect(body.TextBody).toContain("Organisation: Green Valley School");
    expect(body.To).toBe("gnm444@gmail.com,ceo@farmerbook.in");
  });

  it("also gives FPO enquiries the high-priority owner alert", () => {
    const text = buildFarmVisitNotificationText({
      ...request,
      visitorType: "fpo",
      organizationName: "Rythu Shakti FPO",
      contactRole: "Director",
    });
    expect(text).toContain("HIGH PRIORITY");
    expect(text).toContain("Farmer Producer Organisation (FPO)");
    expect(text).toContain("Rythu Shakti FPO");
  });

  it("never includes a configurable recipient and keeps the body plain text", () => {
    const text = buildFarmVisitNotificationText(request);
    expect(text).not.toContain("gnm444@gmail.com");
    expect(text).not.toContain("<html");
    expect(text).toContain(request.requesterEmail);
  });

  it("classifies explicit 4xx as failed and timeout/5xx as unknown", async () => {
    const badRequest = vi.fn(async () => new Response("bad", { status: 422 }));
    const serverError = vi.fn(async () => new Response("bad", { status: 503 }));
    const timeout = vi.fn(async () => { throw new Error("timeout"); });
    await expect(sendFarmVisitOwnerNotification(request, { ...options, fetcher: badRequest })).resolves.toEqual({
      state: "failed",
      failureCode: "POSTMARK_HTTP_422",
    });
    await expect(sendFarmVisitOwnerNotification(request, { ...options, fetcher: serverError })).resolves.toEqual({
      state: "unknown",
      failureCode: "POSTMARK_DELIVERY_UNKNOWN",
    });
    await expect(sendFarmVisitOwnerNotification(request, { ...options, fetcher: timeout })).resolves.toEqual({
      state: "unknown",
      failureCode: "POSTMARK_DELIVERY_UNKNOWN",
    });
  });

  it("fails closed when Postmark settings are incomplete", async () => {
    await expect(sendFarmVisitOwnerNotification(request, {
      serverToken: "",
      fromEmail: "ceo@farmerbook.in",
      messageStream: "outbound",
    })).resolves.toEqual({ state: "failed", failureCode: "POSTMARK_NOT_CONFIGURED" });
    await expect(sendFarmVisitOwnerNotification(request, {
      serverToken: "server-token-that-is-long-enough",
      fromEmail: "other@example.com",
      messageStream: "outbound",
    })).resolves.toEqual({ state: "failed", failureCode: "POSTMARK_NOT_CONFIGURED" });
  });
});
