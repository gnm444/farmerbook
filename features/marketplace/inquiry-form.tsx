"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, Send } from "lucide-react";
import { useTranslations } from "@/components/locale-provider";
import { createMarketEnquiryAction } from "./actions";

export function InquiryForm({
  listingId,
  sellerName,
}: {
  listingId: string;
  sellerName: string;
}) {
  const t = useTranslations("market");
  const [sent, setSent] = useState(false);
  const [conversationId, setConversationId] = useState<string>();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError("");
    startTransition(async () => {
      const result = await createMarketEnquiryAction({
        listingId,
        buyerName: form.get("buyerName"),
        businessName: form.get("businessName"),
        email: form.get("email"),
        phone: form.get("phone"),
        location: form.get("location"),
        quantityNeeded: form.get("quantityNeeded"),
        needBy: form.get("needBy"),
        message: form.get("message"),
        website: form.get("website"),
      });
      if (!result.ok) {
        setError(t("enquiryFailed"));
        return;
      }
      setConversationId(result.conversationId);
      setSent(true);
    });
  }

  if (sent) {
    return (
      <div className="inquiry-success" role="status">
        <CheckCircle2 size={28} aria-hidden="true" />
        <h2>{t("enquirySentTo", { seller: sellerName })}</h2>
        <p>{t("enquiryPrivateInbox")}</p>
        {conversationId ? (
          <Link className="button button--full" href={`/messages/${conversationId}`}>
            {t("openConversation")}
          </Link>
        ) : (
          <p>{t("signedInTracking")}</p>
        )}
      </div>
    );
  }

  return (
    <form className="inquiry-form" onSubmit={submit}>
      <div className="form-row">
        <label className="field">
          <span>{t("yourName")}</span>
          <input className="input" name="buyerName" required minLength={2} dir="auto" />
        </label>
        <label className="field">
          <span>{t("businessGroup")}</span>
          <input className="input" name="businessName" dir="auto" />
        </label>
      </div>
      <div className="form-row">
        <label className="field">
          <span>{t("email")}</span>
          <input className="input" name="email" type="email" required />
        </label>
        <label className="field">
          <span>{t("phoneWhatsApp")}</span>
          <input className="input" name="phone" type="tel" required minLength={7} />
        </label>
      </div>
      <label className="field">
        <span>{t("yourLocation")}</span>
        <input
          className="input"
          name="location"
          placeholder={t("cityState")}
          dir="auto"
          required
        />
      </label>
      <div className="form-row">
        <label className="field">
          <span>{t("neededQuantity")}</span>
          <input
            className="input"
            name="quantityNeeded"
            placeholder={t("quantityExample")}
            dir="auto"
            required
          />
        </label>
        <label className="field">
          <span>{t("neededBy")}</span>
          <input
            className="input"
            name="needBy"
            placeholder={t("neededByExample")}
            dir="auto"
            required
          />
        </label>
      </div>
      <label className="field">
        <span>{t("confirmQuestion")}</span>
        <textarea
          className="textarea"
          name="message"
          minLength={10}
          maxLength={1000}
          placeholder={t("enquiryMessageExample")}
          dir="auto"
          required
        />
      </label>
      <label className="market-honeypot" aria-hidden="true">
        {t("website")}
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
      {error ? <p className="form-error">{error}</p> : null}
      <button className="button button--full" type="submit" disabled={isPending}>
        <Send size={17} aria-hidden="true" />
        {isPending ? t("sending") : t("sendBuyerEnquiry")}
      </button>
      <p className="inquiry-privacy">
        {t("enquiryPrivacy")}
      </p>
    </form>
  );
}
