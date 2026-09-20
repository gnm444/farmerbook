"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { verifyTurnstileToken } from "@/features/outreach/turnstile";
import {
  VISTARAKU_STORE_PRODUCTS,
  formatINR,
  packPrice,
} from "./store-products";
import { sendFeaturedFarmerQuestionNotification } from "@/features/featured-farmers/question-notification";

const VISTARAKU_ORDER_EMAIL = "gnm444@gmail.com";

const singleLine = (minimum: number, maximum: number) =>
  z
    .string()
    .trim()
    .min(minimum)
    .max(maximum)
    .refine(
      (value) => !/[\u0000-\u001f\u007f]/u.test(value),
      "Use plain text without line breaks or control characters.",
    );

const multiline = (minimum: number, maximum: number) =>
  z
    .string()
    .trim()
    .min(minimum)
    .max(maximum)
    .refine(
      (value) => !/[\u0000-\u0009\u000b-\u001f\u007f]/u.test(value),
      "Use plain text without control characters.",
    );

const vistarakuOrderSchema = z.strictObject({
  name: singleLine(2, 120),
  email: z.email("Enter a valid reply email address.").trim().max(254),
  phone: singleLine(7, 24),
  location: singleLine(2, 160),
  notes: multiline(0, 600).optional().default(""),
  consent: z.literal(true, { error: "Consent is required." }),
  website: z.string().trim().max(0).optional().default(""),
  idempotencyKey: z.uuid(),
  turnstileToken: z.string().trim().max(4096).optional().default(""),
  items: z
    .array(
      z.strictObject({
        slug: z.string().trim().min(3).max(120),
        quantity: z.number().int().min(1).max(100),
      }),
    )
    .min(1)
    .max(VISTARAKU_STORE_PRODUCTS.length),
});

export type VistarakuOrderActionResult =
  | { ok: true; code: "SENT" | "BOT_IGNORED" }
  | { ok: false; message: string };

export async function submitVistarakuOrderAction(
  input: unknown,
): Promise<VistarakuOrderActionResult> {
  if (
    typeof input === "object" &&
    input !== null &&
    "website" in input &&
    typeof input.website === "string" &&
    input.website.trim() !== ""
  ) {
    return { ok: true, code: "BOT_IGNORED" };
  }

  const parsed = vistarakuOrderSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Check the order details.",
    };
  }

  const requestHeaders = await headers();
  if (requestHeaders.get("sec-fetch-site") === "cross-site") {
    return { ok: false, message: "The request could not be verified." };
  }
  const requestHost =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const hostname = requestHost?.split(",")[0]?.trim().split(":")[0];
  const turnstileConfigured = Boolean(
    (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "").length >= 3 &&
      (process.env.TURNSTILE_SECRET_KEY ?? "").length >= 8,
  );
  if (turnstileConfigured) {
    const turnstileValid = await verifyTurnstileToken(parsed.data.turnstileToken, {
      remoteIp: requestHeaders.get("cf-connecting-ip") ?? undefined,
      expectedHostname:
        hostname && !hostname.includes("localhost") ? hostname : undefined,
      expectedAction: "vistaraku_store_checkout",
    });
    if (!turnstileValid) {
      return { ok: false, message: "Complete the spam-protection check and try again." };
    }
  }

  const productsBySlug = new Map(
    VISTARAKU_STORE_PRODUCTS.map((product) => [product.slug, product]),
  );
  const items = parsed.data.items.map((item) => {
    const product = productsBySlug.get(item.slug);
    if (!product) return null;
    return {
      product,
      quantity: item.quantity,
      total: Number((packPrice(product) * item.quantity).toFixed(2)),
    };
  });
  if (items.some((item) => item === null)) {
    return { ok: false, message: "One of the selected products is no longer available." };
  }
  const resolvedItems = items as Array<{
    product: (typeof VISTARAKU_STORE_PRODUCTS)[number];
    quantity: number;
    total: number;
  }>;
  const total = Number(
    resolvedItems.reduce((sum, item) => sum + item.total, 0).toFixed(2),
  );
  const message = [
    "Vistaraku store checkout / order enquiry",
    "",
    "Selected products:",
    ...resolvedItems.map(
      ({ product, quantity, total: itemTotal }) =>
        `- ${quantity} pack(s) × ${product.packQuantity} ${product.unitLabel}(s) — ${product.name} — ${formatINR(itemTotal)}`,
    ),
    "",
    `Estimated product total: ${formatINR(total)}`,
    "Pricing note: 30% markup is included. GST, freight, availability and final payment terms must be confirmed by Vistaraku.",
    "",
    `Customer name: ${parsed.data.name}`,
    `Reply email: ${parsed.data.email.toLowerCase()}`,
    `Phone / WhatsApp: ${parsed.data.phone}`,
    `Delivery location: ${parsed.data.location}`,
    `Notes / preferred delivery date: ${parsed.data.notes || "None provided"}`,
    "",
    "The customer agreed that FarmerBook may send these details to Vistaraku for this order request.",
  ].join("\n");

  const notification = await sendFeaturedFarmerQuestionNotification(
    {
      deliveryId: parsed.data.idempotencyKey,
      submittedAt: new Date().toISOString(),
      subjectName: "Vistaraku natural tableware",
      recipientEmail: VISTARAKU_ORDER_EMAIL,
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      kind: "question",
      message,
      source: "store_order",
    },
    {
      fromEmail: "ceo@farmerbook.in",
      messageStream:
        process.env.POSTMARK_TRANSACTIONAL_MESSAGE_STREAM || "outbound",
      ccEmail: null,
    },
  );

  if (notification.state !== "sent") {
    return {
      ok: false,
      message: "We could not confirm delivery of the order request. Please try again later.",
    };
  }

  return { ok: true, code: "SENT" };
}
