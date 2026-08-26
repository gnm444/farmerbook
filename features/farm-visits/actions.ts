"use server";

import { requireUser } from "@/features/auth/require-user";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { FarmVisitActionResult } from "./contracts";
import { sendFarmVisitOwnerNotification } from "./notification";
import {
  farmVisitRequestSchema,
  farmVisitRpcResultSchema,
} from "./schemas";

export async function createFarmVisitRequestAction(
  input: unknown,
): Promise<FarmVisitActionResult> {
  if (!isFeatureEnabled("ENABLE_FARM_VISITS")) {
    return { ok: false, message: "Farm visit requests are temporarily unavailable." };
  }
  if (
    typeof input === "object" &&
    input !== null &&
    "website" in input &&
    typeof input.website === "string" &&
    input.website.trim() !== ""
  ) {
    return { ok: true, code: "BOT_IGNORED" };
  }

  const parsed = farmVisitRequestSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Check the farm visit details.",
    };
  }

  const user = await requireUser();
  if (user.profile.accountRole !== "customer") {
    return {
      ok: false,
      message: "Farm visit requests are currently available to Customer accounts only.",
    };
  }
  if (user.demo || !user.email) {
    return {
      ok: false,
      message: "Use a verified FarmerBook Customer account to request a farm visit.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_farm_visit_request_v2", {
    phone_input: parsed.data.phone,
    address_line_1_input: parsed.data.addressLine1,
    address_line_2_input: parsed.data.addressLine2 ?? null,
    locality_input: parsed.data.locality,
    district_input: parsed.data.district,
    state_input: parsed.data.state,
    postal_code_input: parsed.data.postalCode,
    farming_interest_input: parsed.data.farmingInterest,
    party_size_input: parsed.data.partySize,
    preferred_schedule_input: parsed.data.preferredSchedule,
    visitor_type_input: parsed.data.visitorType,
    organization_name_input: parsed.data.organizationName ?? null,
    contact_role_input: parsed.data.contactRole ?? null,
    notes_input: parsed.data.notes ?? null,
    consent_input: parsed.data.consent,
    idempotency_key_input: parsed.data.idempotencyKey,
  });
  if (error) {
    return {
      ok: false,
      message: "We could not save the farm visit request. Please try again later.",
    };
  }

  const row = Array.isArray(data) ? data[0] : data;
  const rpcResult = farmVisitRpcResultSchema.safeParse(row);
  if (!rpcResult.success) {
    return {
      ok: false,
      message: "We could not confirm the farm visit request. Please contact FarmerBook.",
    };
  }
  if (rpcResult.data.code !== "CREATED") {
    return {
      ok: true,
      requestId: rpcResult.data.request_id,
      code: rpcResult.data.code,
      notificationState: rpcResult.data.notification_state,
    };
  }

  const notification = await sendFarmVisitOwnerNotification({
    requestId: rpcResult.data.request_id,
    requesterName: user.profile.fullName,
    requesterEmail: user.email,
    submittedAt: rpcResult.data.created_at,
    phone: parsed.data.phone,
    addressLine1: parsed.data.addressLine1,
    addressLine2: parsed.data.addressLine2,
    locality: parsed.data.locality,
    district: parsed.data.district,
    state: parsed.data.state,
    postalCode: parsed.data.postalCode,
    farmingInterest: parsed.data.farmingInterest,
    partySize: parsed.data.partySize,
    preferredSchedule: parsed.data.preferredSchedule,
    visitorType: parsed.data.visitorType,
    organizationName: parsed.data.organizationName,
    contactRole: parsed.data.contactRole,
    notes: parsed.data.notes,
  });

  try {
    const admin = createAdminClient();
    await admin.rpc("record_farm_visit_notification", {
      request_id_input: rpcResult.data.request_id,
      notification_state_input: notification.state,
      receipt_id_input: notification.state === "sent" ? notification.receiptId : null,
      failure_code_input:
        notification.state === "sent" ? null : notification.failureCode,
    });
  } catch {
    // The durable request remains pending if receipt recording is unavailable.
    // Never retry an ambiguous provider call inside the customer request.
  }

  return {
    ok: true,
    requestId: rpcResult.data.request_id,
    code: "CREATED",
    notificationState: notification.state,
  };
}
