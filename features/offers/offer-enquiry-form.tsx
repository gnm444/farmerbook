"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { useTranslations } from "@/components/locale-provider";
import { connectToBusinessOfferAction } from "./actions";

export function OfferEnquiryForm({ offerId }: { offerId: string }) {
  const t = useTranslations("offers");
  const errors = useTranslations("errors");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError("");
    startTransition(async () => {
      const result = await connectToBusinessOfferAction({
        offerId,
        message: form.get("message"),
        quantityNeeded: form.get("quantityNeeded") || undefined,
        needBy: form.get("needBy") || undefined,
        idempotencyKey: crypto.randomUUID(),
      });
      if (!result.ok) {
        setError(errors("generic"));
        return;
      }
      setSent(true);
    });
  }

  if (sent) {
    return (
      <div className="card" role="status">
        <CheckCircle2 size={28} aria-hidden="true" />
        <h2>{t("enquirySent")}</h2>
        <p>{t("enquirySentHelp")}</p>
      </div>
    );
  }

  return (
    <form className="card" onSubmit={submit} aria-label={t("sendAria")}>
      <p className="eyebrow">{t("signedInEnquiry")}</p>
      <h2>{t("askInc")}</h2>
      <p>{t("enquiryHelp")}</p>
      {error ? <p className="notice notice--error" role="alert">{error}</p> : null}
      <label className="field">
        <span>{t("requirementOptional")}</span>
        <input className="input" name="quantityNeeded" maxLength={120} />
      </label>
      <label className="field">
        <span>{t("neededByOptional")}</span>
        <input className="input" name="needBy" type="date" />
      </label>
      <label className="field">
        <span>{t("yourQuestion")}</span>
        <textarea className="textarea" name="message" minLength={20} maxLength={1200} required dir="auto" />
      </label>
      <button className="button" type="submit" disabled={isPending}>
        <Send size={16} aria-hidden="true" />
        {isPending ? t("sending") : t("sendPrivate")}
      </button>
    </form>
  );
}
