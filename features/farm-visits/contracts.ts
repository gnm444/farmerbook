import type { FarmVisitRequestInput } from "./schemas";

export type FarmVisitNotificationInput = Omit<
  FarmVisitRequestInput,
  "consent" | "idempotencyKey" | "website"
> & {
  requestId: string;
  requesterName: string;
  requesterEmail: string;
  submittedAt: string;
};

export type FarmVisitNotificationResult =
  | { state: "sent"; receiptId: string }
  | { state: "failed" | "unknown"; failureCode: string };

export type FarmVisitActionResult =
  | {
      ok: true;
      requestId?: string;
      code: "CREATED" | "IDEMPOTENT_REPLAY" | "OPEN_REQUEST_EXISTS" | "BOT_IGNORED";
      notificationState?: "pending" | "sent" | "failed" | "unknown";
    }
  | { ok: false; message: string };
