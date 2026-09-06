"use client";

import Script from "next/script";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { CheckCircle2, ClipboardList, Send } from "lucide-react";
import { submitFeaturedFarmerQuestionAction } from "@/features/featured-farmers/engagement-actions";
import type { PublicStorefrontProduct } from "./public-storefront-catalog";

type TurnstileApi = {
  render(
    container: HTMLElement,
    options: {
      sitekey: string;
      action: string;
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    },
  ): string;
  remove(widgetId: string): void;
  reset(widgetId: string): void;
};

function getTurnstileApi() {
  return (window as typeof window & { turnstile?: TurnstileApi }).turnstile;
}

export function StoreOrderRequestForm({
  products,
  slug,
  farmName,
  farmEmail,
  turnstileSiteKey,
}: {
  products: PublicStorefrontProduct[];
  slug: string;
  farmName: string;
  farmEmail: string;
  turnstileSiteKey: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [turnstileReady, setTurnstileReady] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const idempotencyKey = useRef<string | null>(null);
  const rawId = useId();
  const formId = rawId.replaceAll(":", "");

  useEffect(() => {
    const api = getTurnstileApi();
    if (!turnstileReady || !api || !container.current) return;
    if (widgetId.current) api.remove(widgetId.current);
    widgetId.current = api.render(container.current, {
      sitekey: turnstileSiteKey,
      action: "store_order_request",
      callback: setTurnstileToken,
      "expired-callback": () => setTurnstileToken(""),
      "error-callback": () => setTurnstileToken(""),
    });
    return () => {
      const currentApi = getTurnstileApi();
      if (widgetId.current && currentApi) currentApi.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [turnstileReady, turnstileSiteKey]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const data = new FormData(formElement);
    const product = String(data.get("product"));
    idempotencyKey.current ??= crypto.randomUUID();
    setError("");

    startTransition(async () => {
      const result = await submitFeaturedFarmerQuestionAction({
        slug,
        name: data.get("name"),
        email: data.get("email"),
        kind: "question",
        source: "store_order",
        message: [
          "Store order request",
          `Product: ${product}`,
          `Quantity: ${String(data.get("quantity"))}`,
          `Phone / WhatsApp: ${String(data.get("phone"))}`,
          `Delivery location: ${String(data.get("location"))}`,
          `Notes: ${String(data.get("notes") || "None provided")}`,
        ].join("\n"),
        consent: data.get("consent") === "on",
        website: data.get("website"),
        idempotencyKey: idempotencyKey.current,
        turnstileToken,
      });

      if (!result.ok) {
        setError(result.message);
        const api = getTurnstileApi();
        if (widgetId.current && api) api.reset(widgetId.current);
        setTurnstileToken("");
        return;
      }
      if (result.notificationState !== "sent") {
        setError("FarmerBook could not confirm notification delivery. Please use the farm email below; do not resubmit the same request.");
        return;
      }
      setSuccess(true);
      formElement.reset();
    });
  }

  if (success) {
    return (
      <div className="store-order-success" role="status">
        <CheckCircle2 size={32} aria-hidden="true" />
        <h2>Order request sent</h2>
        <p>{farmName} and FarmerBook have been notified. The farm will confirm availability, final pricing, delivery and payment directly with you.</p>
      </div>
    );
  }

  return (
    <form className="store-order-form" onSubmit={submit}>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={() => setTurnstileReady(true)}
      />
      <div className="store-order-form__heading">
        <span><ClipboardList size={22} aria-hidden="true" /></span>
        <div>
          <p className="eyebrow">Direct request</p>
          <h2>Request an order</h2>
          <p>Send your request to {farmName}. This does not charge you or confirm an order automatically.</p>
        </div>
      </div>
      <div className="form-row">
        <label className="field" htmlFor={`${formId}-name`}><span>Your name</span><input className="input" id={`${formId}-name`} name="name" autoComplete="name" minLength={2} maxLength={120} required /></label>
        <label className="field" htmlFor={`${formId}-email`}><span>Reply email</span><input className="input" id={`${formId}-email`} name="email" type="email" autoComplete="email" maxLength={254} required /></label>
      </div>
      <div className="form-row">
        <label className="field" htmlFor={`${formId}-product`}><span>Product</span><select className="select" id={`${formId}-product`} name="product" required defaultValue=""><option value="" disabled>Select a product</option>{products.map((product) => <option key={product.name} value={product.name}>{product.name}</option>)}</select></label>
        <label className="field" htmlFor={`${formId}-quantity`}><span>Quantity</span><input className="input" id={`${formId}-quantity`} name="quantity" placeholder="For example, 2 packets" minLength={2} maxLength={100} required /></label>
      </div>
      <div className="form-row">
        <label className="field" htmlFor={`${formId}-phone`}><span>Phone / WhatsApp</span><input className="input" id={`${formId}-phone`} name="phone" type="tel" minLength={7} maxLength={24} required /></label>
        <label className="field" htmlFor={`${formId}-location`}><span>Delivery location</span><input className="input" id={`${formId}-location`} name="location" minLength={2} maxLength={120} required /></label>
      </div>
      <label className="field" htmlFor={`${formId}-notes`}><span>Notes or preferred delivery date</span><textarea className="textarea" id={`${formId}-notes`} name="notes" maxLength={500} /></label>
      <label className="store-order-form__consent"><input name="consent" type="checkbox" required /><span>I agree that FarmerBook may send these details to {farmName} and copy FarmerBook’s CEO for this order request.</span></label>
      <label className="market-honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
      <div className="store-order-form__turnstile"><span>Spam protection</span><div ref={container} /></div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <button className="button" type="submit" disabled={isPending || !turnstileToken}><Send size={17} aria-hidden="true" />{isPending ? "Sending…" : "Send order request"}</button>
      <p className="store-order-form__private">Your request goes privately to {farmEmail} and <strong>ceo@farmerbook.in</strong>.</p>
    </form>
  );
}
