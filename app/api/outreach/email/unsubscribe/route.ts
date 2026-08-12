import { NextResponse } from "next/server";
import { z } from "zod";
import { uuidFromText } from "@/features/outreach/crypto";
import { verifyEmailUnsubscribeToken } from "@/features/outreach/email-action-token";
import { isDemoMode, isSupabaseConfigured } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

const bindingSchema = z.object({ prospect_id: z.uuid() });

function redirectWithStatus(request: Request, status: string) {
  const target = new URL("/unsubscribe", request.url);
  target.searchParams.set("status", status);
  return NextResponse.redirect(target, 303);
}

export async function POST(request: Request) {
  if (isDemoMode() || !isSupabaseConfigured()) {
    return redirectWithStatus(request, "unavailable");
  }
  const url = new URL(request.url);
  const form = await request.formData();
  const token = url.searchParams.get("token") ?? String(form.get("token") ?? "");
  const oneClick = form.get("List-Unsubscribe") === "One-Click";
  const payload = await verifyEmailUnsubscribeToken(
    token,
    process.env.OUTREACH_EMAIL_ACTION_SIGNING_SECRET ?? "",
  );
  if (!payload) {
    return oneClick
      ? NextResponse.json({ code: "INVALID_UNSUBSCRIBE" }, { status: 400 })
      : redirectWithStatus(request, "invalid");
  }
  const supabase = createAdminClient();
  const bindingResult = await supabase
    .from("outreach_outbox")
    .select("prospect_id")
    .eq("id", payload.outboxId)
    .maybeSingle();
  const binding = bindingSchema.safeParse(bindingResult.data);
  if (bindingResult.error || !binding.success) {
    return oneClick
      ? NextResponse.json({ code: "INVALID_UNSUBSCRIBE" }, { status: 400 })
      : redirectWithStatus(request, "invalid");
  }
  const result = await supabase.rpc("withdraw_outreach_consent", {
    prospect_id_input: binding.data.prospect_id,
    reason_input: "Recipient unsubscribed through the signed email link.",
    idempotency_key_input: await uuidFromText(`email-unsubscribe:${token}`),
  });
  if (result.error) {
    return oneClick
      ? NextResponse.json({ code: "UNSUBSCRIBE_FAILED" }, { status: 503 })
      : redirectWithStatus(request, "unavailable");
  }
  return oneClick
    ? NextResponse.json({ code: "UNSUBSCRIBED" })
    : redirectWithStatus(request, "unsubscribed");
}
