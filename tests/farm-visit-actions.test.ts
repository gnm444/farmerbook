import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  featureEnabled: vi.fn(() => true),
  requireUser: vi.fn(),
  customerRpc: vi.fn(),
  adminRpc: vi.fn(),
  notify: vi.fn(),
}));

vi.mock("@/lib/feature-flags", () => ({ isFeatureEnabled: mocks.featureEnabled }));
vi.mock("@/features/auth/require-user", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ rpc: mocks.customerRpc })),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ rpc: mocks.adminRpc })),
}));
vi.mock("@/features/farm-visits/notification", () => ({
  sendFarmVisitOwnerNotification: mocks.notify,
}));

import { createFarmVisitRequestAction } from "@/features/farm-visits/actions";

const input = {
  phone: "+919876543210",
  addressLine1: "42 Test Farm Road",
  addressLine2: "",
  locality: "Madhapur",
  district: "Hyderabad",
  state: "Telangana",
  postalCode: "500081",
  farmingInterest: "both",
  partySize: 3,
  preferredSchedule: "weekend",
  visitorType: "school",
  organizationName: "Green Valley School",
  contactRole: "Science teacher",
  notes: "Interested in soil health.",
  consent: true,
  idempotencyKey: "78000000-0000-4000-8000-000000000010",
  website: "",
};

const user = {
  id: "78000000-0000-4000-8000-000000000001",
  email: "customer@farmerbook.invalid",
  demo: false,
  profile: {
    handle: "customer",
    fullName: "Account-bound Customer",
    status: "active",
    onboardingComplete: true,
    accountRole: "customer",
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.featureEnabled.mockReturnValue(true);
  mocks.requireUser.mockResolvedValue(user);
  mocks.customerRpc.mockResolvedValue({
    data: [{
      code: "CREATED",
      request_id: "78000000-0000-4000-8000-000000000100",
      created_at: "2026-08-24T06:00:00.000Z",
      notification_state: "pending",
    }],
    error: null,
  });
  mocks.notify.mockResolvedValue({ state: "sent", receiptId: "receipt-1" });
  mocks.adminRpc.mockResolvedValue({ data: [{ code: "RECORDED" }], error: null });
});

describe("createFarmVisitRequestAction", () => {
  it("stores once, notifies with account identity and records only the receipt", async () => {
    await expect(createFarmVisitRequestAction(input)).resolves.toMatchObject({
      ok: true,
      code: "CREATED",
      notificationState: "sent",
    });
    expect(mocks.customerRpc).toHaveBeenCalledWith("create_farm_visit_request_v2", expect.objectContaining({
      address_line_1_input: "42 Test Farm Road",
      consent_input: true,
      idempotency_key_input: input.idempotencyKey,
      visitor_type_input: "school",
      organization_name_input: "Green Valley School",
    }));
    expect(mocks.notify).toHaveBeenCalledWith(expect.objectContaining({
      requesterName: "Account-bound Customer",
      requesterEmail: "customer@farmerbook.invalid",
      addressLine1: "42 Test Farm Road",
      visitorType: "school",
      organizationName: "Green Valley School",
    }));
    expect(mocks.adminRpc).toHaveBeenCalledWith("record_farm_visit_notification", {
      request_id_input: "78000000-0000-4000-8000-000000000100",
      notification_state_input: "sent",
      receipt_id_input: "receipt-1",
      failure_code_input: null,
    });
  });

  it("does not send again for an idempotent replay or open request", async () => {
    for (const code of ["IDEMPOTENT_REPLAY", "OPEN_REQUEST_EXISTS"] as const) {
      mocks.customerRpc.mockResolvedValueOnce({
        data: [{
          code,
          request_id: "78000000-0000-4000-8000-000000000100",
          created_at: "2026-08-24T06:00:00.000Z",
          notification_state: "sent",
        }],
        error: null,
      });
      await expect(createFarmVisitRequestAction(input)).resolves.toMatchObject({ ok: true, code });
    }
    expect(mocks.notify).not.toHaveBeenCalled();
    expect(mocks.adminRpc).not.toHaveBeenCalled();
  });

  it("rejects non-Customers before touching the database", async () => {
    mocks.requireUser.mockResolvedValue({
      ...user,
      profile: { ...user.profile, accountRole: "farmer" },
    });
    await expect(createFarmVisitRequestAction(input)).resolves.toMatchObject({ ok: false });
    expect(mocks.customerRpc).not.toHaveBeenCalled();
  });

  it("ignores the honeypot without loading an account or sending email", async () => {
    await expect(createFarmVisitRequestAction({ ...input, website: "spam.example" })).resolves.toEqual({
      ok: true,
      code: "BOT_IGNORED",
    });
    expect(mocks.requireUser).not.toHaveBeenCalled();
    expect(mocks.notify).not.toHaveBeenCalled();
  });

  it("durably accepts the request when provider delivery is ambiguous", async () => {
    mocks.notify.mockResolvedValue({
      state: "unknown",
      failureCode: "POSTMARK_DELIVERY_UNKNOWN",
    });
    await expect(createFarmVisitRequestAction(input)).resolves.toMatchObject({
      ok: true,
      code: "CREATED",
      notificationState: "unknown",
    });
    expect(mocks.adminRpc).toHaveBeenCalledWith(
      "record_farm_visit_notification",
      expect.objectContaining({
        notification_state_input: "unknown",
        receipt_id_input: null,
        failure_code_input: "POSTMARK_DELIVERY_UNKNOWN",
      }),
    );
  });
});
