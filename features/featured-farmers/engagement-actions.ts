"use server";

import { headers, cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/features/auth/require-admin";
import { requireUser } from "@/features/auth/require-user";
import { verifyTurnstileToken } from "@/features/outreach/turnstile";
import { isProductionSite } from "@/lib/env";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { featuredFarmerEngagementConfiguration } from "./engagement-configuration";
import {
  hashFeaturedFarmerQuestionSender,
  isLikelyAutomatedProfileView,
} from "./engagement-privacy";
import { getFeaturedFarmerEngagementSubject } from "./engagement-registry";
import {
  featuredFarmerModerationSchema,
  featuredFarmerQuestionSchema,
  featuredFarmerRecommendationSchema,
  questionReservationSchema,
  recommendationActionRowSchema,
} from "./engagement-schemas";
import { sendFeaturedFarmerQuestionNotification } from "./question-notification";

export type FeaturedFarmerQuestionActionResult =
  | {
      ok: true;
      code: "CREATED" | "IDEMPOTENT_REPLAY" | "BOT_IGNORED";
      notificationState?: "pending" | "sent" | "failed" | "unknown";
    }
  | { ok: false; message: string };

export async function submitFeaturedFarmerQuestionAction(
  input: unknown,
): Promise<FeaturedFarmerQuestionActionResult> {
  if (
    typeof input === "object" &&
    input !== null &&
    "website" in input &&
    typeof input.website === "string" &&
    input.website.trim() !== ""
  ) {
    return { ok: true, code: "BOT_IGNORED" };
  }

  const configuration = featuredFarmerEngagementConfiguration();
  if (!configuration.questionDeliveryReady) {
    return { ok: false, message: "Private farm questions are temporarily unavailable." };
  }
  const parsed = featuredFarmerQuestionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Check the question details.",
    };
  }
  const subject = getFeaturedFarmerEngagementSubject(parsed.data.slug);
  if (!subject) {
    return { ok: false, message: "This farm cannot receive questions here." };
  }

  const requestHeaders = await headers();
  if (requestHeaders.get("sec-fetch-site") === "cross-site") {
    return { ok: false, message: "The request could not be verified." };
  }
  const requestHost =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const hostname = requestHost?.split(",")[0]?.trim().split(":")[0];
  const turnstileValid = await verifyTurnstileToken(parsed.data.turnstileToken, {
    remoteIp: requestHeaders.get("cf-connecting-ip") ?? undefined,
    expectedHostname:
      hostname && !hostname.includes("localhost") ? hostname : undefined,
    expectedAction: "farmer_profile_question",
  });
  if (!turnstileValid) {
    return { ok: false, message: "Complete the spam-protection check and try again." };
  }

  const normalizedEmail = parsed.data.email.toLowerCase();
  const senderHash = hashFeaturedFarmerQuestionSender(normalizedEmail);
  const admin = createAdminClient();
  const reservation = await admin.rpc(
    "reserve_featured_farmer_question_delivery",
    {
      slug_input: parsed.data.slug,
      sender_hash_input: senderHash,
      message_kind_input: parsed.data.kind,
      idempotency_key_input: parsed.data.idempotencyKey,
    },
  );
  if (reservation.error) {
    return { ok: false, message: "We could not prepare the private message." };
  }
  const row = questionReservationSchema.safeParse(
    Array.isArray(reservation.data) ? reservation.data[0] : reservation.data,
  );
  if (!row.success) {
    return { ok: false, message: "We could not confirm the private message." };
  }
  if (row.data.code === "SENDER_RATE_LIMITED") {
    return {
      ok: false,
      message: "You have reached the daily message limit for this farm.",
    };
  }
  if (row.data.code === "SUBJECT_RATE_LIMITED") {
    return {
      ok: false,
      message: "This farm has reached today's message limit. Please use the public email.",
    };
  }
  if (row.data.code === "IDEMPOTENT_REPLAY") {
    return {
      ok: true,
      code: "IDEMPOTENT_REPLAY",
      notificationState: row.data.notification_state,
    };
  }
  if (!row.data.delivery_id) {
    return { ok: false, message: "We could not prepare the private message." };
  }

  const notification = await sendFeaturedFarmerQuestionNotification({
    deliveryId: row.data.delivery_id,
    submittedAt: row.data.created_at,
    subjectName: subject.displayName,
    recipientEmail: subject.recipientEmail,
    name: parsed.data.name,
    email: normalizedEmail,
    kind: parsed.data.kind,
    message: parsed.data.message,
  });

  try {
    await admin.rpc("record_featured_farmer_question_notification", {
      delivery_id_input: row.data.delivery_id,
      notification_state_input: notification.state,
      receipt_id_input: notification.state === "sent" ? notification.receiptId : null,
      failure_code_input:
        notification.state === "sent" ? null : notification.failureCode,
    });
  } catch {
    // Never retry an ambiguous provider call. The private ledger remains pending.
  }

  return {
    ok: true,
    code: "CREATED",
    notificationState: notification.state,
  };
}

export async function submitFeaturedFarmerRecommendationAction(input: unknown) {
  if (!isFeatureEnabled("ENABLE_FEATURED_FARMER_ENGAGEMENT")) {
    return { ok: false as const, message: "Recommendations are temporarily unavailable." };
  }
  const parsed = featuredFarmerRecommendationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      message: parsed.error.issues[0]?.message ?? "Check the recommendation.",
    };
  }
  if (!getFeaturedFarmerEngagementSubject(parsed.data.slug)) {
    return { ok: false as const, message: "This profile cannot receive recommendations." };
  }
  const user = await requireUser();
  if (user.demo || user.profile.accountRole !== "customer") {
    return {
      ok: false as const,
      message: "Use an active FarmerBook Customer account to recommend this farmer.",
    };
  }
  const supabase = await createClient();
  const result = await supabase.rpc("submit_featured_farmer_recommendation", {
    slug_input: parsed.data.slug,
    relationship_context_input: parsed.data.relationshipContext,
    body_input: parsed.data.body,
    consent_input: parsed.data.consent,
    idempotency_key_input: parsed.data.idempotencyKey,
  });
  if (result.error) {
    return { ok: false as const, message: "The recommendation could not be saved." };
  }
  const row = recommendationActionRowSchema.safeParse(
    Array.isArray(result.data) ? result.data[0] : result.data,
  );
  if (!row.success) {
    return { ok: false as const, message: "The recommendation could not be confirmed." };
  }
  revalidatePath(`/featured-farmers/${parsed.data.slug}`);
  return {
    ok: true as const,
    code: row.data.code,
    status: row.data.recommendation_status,
  };
}

export async function withdrawFeaturedFarmerRecommendationAction(slug: string) {
  if (
    !isFeatureEnabled("ENABLE_FEATURED_FARMER_ENGAGEMENT") ||
    !getFeaturedFarmerEngagementSubject(slug)
  ) {
    return { ok: false as const, message: "Recommendations are unavailable." };
  }
  const user = await requireUser();
  if (user.demo || user.profile.accountRole !== "customer") {
    return { ok: false as const, message: "A Customer account is required." };
  }
  const supabase = await createClient();
  const result = await supabase.rpc("withdraw_featured_farmer_recommendation", {
    slug_input: slug,
  });
  if (result.error || result.data !== true) {
    return { ok: false as const, message: "The recommendation could not be withdrawn." };
  }
  revalidatePath(`/featured-farmers/${slug}`);
  return { ok: true as const };
}

export async function countFeaturedFarmerProfileViewAction(slug: string) {
  if (
    !isFeatureEnabled("ENABLE_FEATURED_FARMER_ENGAGEMENT") ||
    !getFeaturedFarmerEngagementSubject(slug)
  ) {
    return { ok: false as const, count: 0 };
  }
  const subject = getFeaturedFarmerEngagementSubject(slug);
  if (!subject) return { ok: false as const, count: 0 };

  const requestHeaders = await headers();
  if (
    requestHeaders.get("sec-fetch-site") === "cross-site" ||
    isLikelyAutomatedProfileView(requestHeaders.get("user-agent"))
  ) {
    return { ok: false as const, count: 0 };
  }
  const today = new Date().toISOString().slice(0, 10);
  const cookieStore = await cookies();
  const admin = createAdminClient();
  if (cookieStore.get(subject.viewCookieName)?.value === today) {
    const current = await admin
      .from("featured_farmer_engagement_subjects")
      .select("profile_view_count")
      .eq("slug", slug)
      .maybeSingle();
    return {
      ok: !current.error,
      count: Number(current.data?.profile_view_count ?? 0),
      counted: false,
    };
  }

  const increment = await admin.rpc("increment_featured_farmer_profile_view", {
    slug_input: slug,
  });
  if (increment.error || typeof increment.data !== "number") {
    return { ok: false as const, count: 0 };
  }
  const requestHost =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  cookieStore.set(subject.viewCookieName, today, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProductionSite(requestHost),
    // vinext posts server actions to `${pathname}.rsc`; a cookie scoped to the
    // extensionless pathname does not path-match that request. Keep this
    // date-only cookie within the Featured Farmers area so repeat views reach
    // the action without making it site-wide.
    path: "/featured-farmers/",
    maxAge: 60 * 60 * 48,
  });
  return { ok: true as const, count: increment.data, counted: true };
}

export async function moderateFeaturedFarmerRecommendationAction(input: unknown) {
  if (!isFeatureEnabled("ENABLE_FEATURED_FARMER_ENGAGEMENT")) {
    return { ok: false as const, message: "Recommendation moderation is disabled." };
  }
  const parsed = featuredFarmerModerationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, message: "Check the moderation decision." };
  }
  await requireAdmin();
  const supabase = await createClient();
  const result = await supabase.rpc("moderate_featured_farmer_recommendation", {
    recommendation_id_input: parsed.data.recommendationId,
    next_status_input: parsed.data.nextStatus,
    note_input: parsed.data.note,
  });
  if (result.error || result.data !== true) {
    return { ok: false as const, message: "The moderation decision could not be saved." };
  }
  revalidatePath("/admin/featured-farmer-engagement");
  revalidatePath("/featured-farmers/sandeep-dasari-avani-van-farms");
  return { ok: true as const };
}
