import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  featureEnabled: vi.fn(() => true),
  configuration: vi.fn(() => ({
    enabled: true,
    publicReady: true,
    questionDeliveryReady: true,
    turnstileSiteKey: "site-key",
  })),
  verifyTurnstile: vi.fn(async () => true),
  headers: vi.fn(),
  cookies: vi.fn(),
  cookieGet: vi.fn(),
  cookieSet: vi.fn(),
  adminRpc: vi.fn(),
  adminFrom: vi.fn(),
  customerRpc: vi.fn(),
  notify: vi.fn(),
  requireUser: vi.fn(),
  requireAdmin: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/feature-flags", () => ({
  isFeatureEnabled: mocks.featureEnabled,
}));
vi.mock("@/lib/env", () => ({ isProductionSite: vi.fn(() => false) }));
vi.mock("@/features/featured-farmers/engagement-configuration", () => ({
  featuredFarmerEngagementConfiguration: mocks.configuration,
}));
vi.mock("@/features/outreach/turnstile", () => ({
  verifyTurnstileToken: mocks.verifyTurnstile,
}));
vi.mock("next/headers", () => ({
  headers: mocks.headers,
  cookies: mocks.cookies,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    rpc: mocks.adminRpc,
    from: mocks.adminFrom,
  })),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ rpc: mocks.customerRpc })),
}));
vi.mock("@/features/auth/require-user", () => ({
  requireUser: mocks.requireUser,
}));
vi.mock("@/features/auth/require-admin", () => ({
  requireAdmin: mocks.requireAdmin,
}));
vi.mock("@/features/featured-farmers/question-notification", () => ({
  sendFeaturedFarmerQuestionNotification: mocks.notify,
}));

import {
  countFeaturedFarmerProfileViewAction,
  submitFeaturedFarmerQuestionAction,
  submitFeaturedFarmerRecommendationAction,
} from "@/features/featured-farmers/engagement-actions";
import {
  hashFeaturedFarmerQuestionSender,
  isLikelyAutomatedProfileView,
} from "@/features/featured-farmers/engagement-privacy";

const slug = "sandeep-dasari-avani-van-farms";
const question = {
  slug,
  name: "Synthetic Visitor",
  email: "Visitor@FarmerBook.invalid",
  kind: "question",
  message: "Could you please share normal Gir-cow milk collection timings?",
  consent: true,
  idempotencyKey: "84000000-0000-4000-8000-000000000001",
  turnstileToken: "turnstile-token",
  website: "",
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.FEATURED_FARMER_ENGAGEMENT_HASH_SECRET =
    "featured-farmer-engagement-test-secret-123456789";
  mocks.featureEnabled.mockReturnValue(true);
  mocks.configuration.mockReturnValue({
    enabled: true,
    publicReady: true,
    questionDeliveryReady: true,
    turnstileSiteKey: "site-key",
  });
  mocks.verifyTurnstile.mockResolvedValue(true);
  mocks.headers.mockResolvedValue(new Headers({
    host: "farmerbook.in",
    "user-agent": "Mozilla/5.0",
    "sec-fetch-site": "same-origin",
  }));
  mocks.cookieGet.mockReturnValue(undefined);
  mocks.cookies.mockResolvedValue({ get: mocks.cookieGet, set: mocks.cookieSet });
  mocks.notify.mockResolvedValue({ state: "sent", receiptId: "receipt-1" });
  mocks.requireUser.mockResolvedValue({
    id: "84000000-0000-4000-8000-000000000010",
    email: "customer@farmerbook.invalid",
    demo: false,
    profile: {
      handle: "customer",
      fullName: "Customer",
      status: "active",
      onboardingComplete: true,
      accountRole: "customer",
    },
  });
  mocks.requireAdmin.mockResolvedValue({ id: "admin", demo: false });
});

describe("Featured Farmer engagement actions", () => {
  it("HMACs normalized email without exposing the address", async () => {
    const first = hashFeaturedFarmerQuestionSender(
      "Visitor@FarmerBook.invalid",
      "featured-farmer-engagement-test-secret-123456789",
    );
    const second = hashFeaturedFarmerQuestionSender(
      " visitor@farmerbook.invalid ",
      "featured-farmer-engagement-test-secret-123456789",
    );
    expect(first).toBe(second);
    expect(first).toMatch(/^[0-9a-f]{64}$/);
    expect(first).not.toContain("visitor");
  });

  it("reserves once, sends to the registry recipient and records only provider state", async () => {
    mocks.adminRpc
      .mockResolvedValueOnce({
        data: [{
          code: "CREATED",
          delivery_id: "84000000-0000-4000-8000-000000000020",
          created_at: "2026-08-25T08:00:00.000Z",
          notification_state: "pending",
        }],
        error: null,
      })
      .mockResolvedValueOnce({ data: true, error: null });
    await expect(submitFeaturedFarmerQuestionAction(question)).resolves.toEqual({
      ok: true,
      code: "CREATED",
      notificationState: "sent",
    });
    expect(mocks.verifyTurnstile).toHaveBeenCalledWith(
      "turnstile-token",
      expect.objectContaining({
        expectedHostname: "farmerbook.in",
        expectedAction: "farmer_profile_question",
      }),
    );
    expect(mocks.adminRpc.mock.calls[0]).toEqual([
      "reserve_featured_farmer_question_delivery",
      expect.objectContaining({
        slug_input: slug,
        message_kind_input: "question",
        sender_hash_input: expect.stringMatching(/^[0-9a-f]{64}$/),
      }),
    ]);
    expect(JSON.stringify(mocks.adminRpc.mock.calls[0])).not.toContain(
      "visitor@farmerbook.invalid",
    );
    expect(mocks.notify).toHaveBeenCalledWith(expect.objectContaining({
      recipientEmail: "avanivanfarms@gmail.com",
      email: "visitor@farmerbook.invalid",
    }));
    expect(mocks.adminRpc.mock.calls[1]).toEqual([
      "record_featured_farmer_question_notification",
      {
        delivery_id_input: "84000000-0000-4000-8000-000000000020",
        notification_state_input: "sent",
        receipt_id_input: "receipt-1",
        failure_code_input: null,
      },
    ]);
  });

  it("does not send on a replay and ignores the honeypot before verification", async () => {
    mocks.adminRpc.mockResolvedValueOnce({
      data: [{
        code: "IDEMPOTENT_REPLAY",
        delivery_id: "84000000-0000-4000-8000-000000000020",
        created_at: "2026-08-25T08:00:00.000Z",
        notification_state: "sent",
      }],
      error: null,
    });
    await expect(submitFeaturedFarmerQuestionAction(question)).resolves.toEqual({
      ok: true,
      code: "IDEMPOTENT_REPLAY",
      notificationState: "sent",
    });
    await expect(submitFeaturedFarmerQuestionAction({
      ...question,
      website: "spam.example",
    })).resolves.toEqual({ ok: true, code: "BOT_IGNORED" });
    expect(mocks.notify).not.toHaveBeenCalled();
  });

  it("binds recommendations to an authenticated Customer RPC", async () => {
    mocks.customerRpc.mockResolvedValueOnce({
      data: [{
        code: "CREATED",
        recommendation_id: "84000000-0000-4000-8000-000000000030",
        recommendation_status: "pending",
        updated_at: "2026-08-25T08:00:00.000Z",
      }],
      error: null,
    });
    const result = await submitFeaturedFarmerRecommendationAction({
      slug,
      relationshipContext: "Regular Gir-cow milk customer",
      body: "Sandeep communicates clearly and has always taken time to explain how the Gir cows are cared for at Avani Van Farms.",
      consent: true,
      idempotencyKey: "84000000-0000-4000-8000-000000000031",
    });
    expect(result).toMatchObject({ ok: true, status: "pending" });
    expect(mocks.customerRpc).toHaveBeenCalledWith(
      "submit_featured_farmer_recommendation",
      expect.objectContaining({ slug_input: slug, consent_input: true }),
    );
  });

  it("filters automated viewers and counts a browser once through an HttpOnly cookie", async () => {
    expect(isLikelyAutomatedProfileView("Googlebot/2.1")).toBe(true);
    expect(isLikelyAutomatedProfileView("Mozilla/5.0 Safari/605.1")).toBe(false);
    mocks.adminRpc.mockResolvedValueOnce({ data: 9, error: null });
    await expect(countFeaturedFarmerProfileViewAction(slug)).resolves.toEqual({
      ok: true,
      count: 9,
      counted: true,
    });
    expect(mocks.adminRpc).toHaveBeenCalledWith(
      "increment_featured_farmer_profile_view",
      { slug_input: slug },
    );
    expect(mocks.cookieSet).toHaveBeenCalledWith(
      "fb_ffv_sandeep",
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      expect.objectContaining({
        httpOnly: true,
        sameSite: "lax",
        path: "/featured-farmers/",
      }),
    );
  });
});
