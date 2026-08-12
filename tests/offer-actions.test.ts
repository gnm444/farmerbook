import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const input = {
  offerId: "c8740ef9-6613-4645-82cc-f8135fa90054",
  message: "Please confirm availability for our village farmer group.",
  quantityNeeded: "Three tractor-days",
  needBy: "2026-10-01",
  idempotencyKey: "30da4c28-c8a8-46e7-823c-a5f3e936eaaf",
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-09T00:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.resetModules();
});

function mockActionDependencies(rpc: ReturnType<typeof vi.fn>) {
  const requireUser = vi.fn(async () => ({
    id: "8769d74c-d5f0-4e85-a2f9-9a425ba61de0",
    demo: false,
    profile: {
      accountRole: "farmer",
      onboardingComplete: true,
      status: "active",
    },
  }));
  vi.doMock("next/cache", () => ({ revalidatePath: vi.fn() }));
  vi.doMock("@/lib/env", () => ({ isSupabaseConfigured: () => true }));
  vi.doMock("@/lib/feature-flags", () => ({
    isFeatureEnabled: () => true,
  }));
  vi.doMock("@/features/auth/require-user", () => ({ requireUser }));
  vi.doMock("@/features/organizations/queries", () => ({
    loadActiveOrganizationMembership: vi.fn(),
  }));
  vi.doMock("@/lib/supabase/server", () => ({
    createClient: vi.fn(async () => ({ rpc })),
  }));
  return { requireUser };
}

describe("offer enquiry action", () => {
  it("requires a signed-in user and sends only bounded enquiry fields", async () => {
    const rpc = vi.fn(async () => ({
      data: {
        enquiry_id: "ff13246c-6d50-469c-92d4-315312417ca9",
        event_id: "5d1bca54-1afe-46df-b977-425095f181eb",
      },
      error: null,
    }));
    const { requireUser } = mockActionDependencies(rpc);
    const { connectToBusinessOfferAction } = await import(
      "@/features/offers/actions"
    );

    await expect(connectToBusinessOfferAction(input)).resolves.toMatchObject({
      ok: true,
      code: "CONNECTED",
    });
    expect(requireUser).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith("connect_to_business_offer", {
      offer_id_input: input.offerId,
      message_input: input.message,
      quantity_needed_input: input.quantityNeeded,
      need_by_input: input.needBy,
      idempotency_key_input: input.idempotencyKey,
    });
    expect(JSON.stringify(rpc.mock.calls[0])).not.toMatch(/email|phone|contact/i);
  });

  it("does not expose raw database failures", async () => {
    const rpc = vi.fn(async () => ({
      data: null,
      error: {
        code: "XX000",
        message: "password=must-never-reach-the-browser",
      },
    }));
    mockActionDependencies(rpc);
    const { connectToBusinessOfferAction } = await import(
      "@/features/offers/actions"
    );

    const result = await connectToBusinessOfferAction(input);
    expect(result).toEqual({
      ok: false,
      code: "DATA_UNAVAILABLE",
      message: "The request could not be completed. Please try again.",
    });
    expect(JSON.stringify(result)).not.toContain("password");
  });
});
