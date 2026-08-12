"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useTranslations } from "@/components/locale-provider";
import { respondToIncSourcingRequestAction } from "./actions";
import { INC_SOURCING_UNITS } from "./types";

export function IncSourcingResponseForm({
  sourcingRequestId,
  readOnly = false,
}: {
  sourcingRequestId: string;
  readOnly?: boolean;
}) {
  const t = useTranslations("incSourcing");
  const errors = useTranslations("errors");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");
    const form = event.currentTarget;
    const data = new FormData(form);
    startTransition(async () => {
      const result = await respondToIncSourcingRequestAction({
        sourcingRequestId,
        message: String(data.get("message") ?? ""),
        quantityAvailable: String(data.get("quantityAvailable") ?? ""),
        quantityUnit: String(data.get("quantityUnit") ?? ""),
        availableFrom: String(data.get("availableFrom") ?? ""),
        indicativePrice: String(data.get("indicativePrice") ?? ""),
        priceUnit: String(data.get("priceUnit") ?? ""),
        idempotencyKey: crypto.randomUUID(),
      });
      if (!result.ok) {
        setStatus(errors("generic"));
        return;
      }
      setMessage("");
      setStatus(t("responded"));
      form.reset();
    });
  }

  return (
    <section className="card inc-sourcing-form-card">
      <p className="eyebrow">{t("responseTitle")}</p>
      <h2>{t("responseTitle")}</h2>
      <p>{t("responseHelp")}</p>
      {readOnly ? <p className="notice notice--info">{t("fictionalDisclosure")}</p> : null}
      <form onSubmit={submit} className="form-grid">
        <label className="field">
          <span>{t("message")}</span>
          <textarea
            name="message"
            minLength={20}
            maxLength={2000}
            required
            dir="auto"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={t("messagePlaceholder")}
            disabled={readOnly || isPending}
          />
        </label>
        <div className="form-grid form-grid--two">
          <label className="field"><span>{t("quantityAvailable")}</span><input name="quantityAvailable" type="number" min="0.01" step="0.01" disabled={readOnly || isPending} /></label>
          <label className="field"><span>{t("unit")}</span><select name="quantityUnit" defaultValue="" disabled={readOnly || isPending}><option value="">—</option>{INC_SOURCING_UNITS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}</select></label>
          <label className="field"><span>{t("availableFrom")}</span><input name="availableFrom" type="date" disabled={readOnly || isPending} /></label>
          <label className="field"><span>{t("indicativePrice")}</span><input name="indicativePrice" type="number" min="0.01" step="0.01" disabled={readOnly || isPending} /></label>
          <label className="field"><span>{t("priceUnit")}</span><select name="priceUnit" defaultValue="" disabled={readOnly || isPending}><option value="">—</option>{INC_SOURCING_UNITS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}</select></label>
        </div>
        <button className="button" type="submit" disabled={readOnly || isPending}>
          {isPending ? t("responding") : t("respond")}
        </button>
        {status ? <p className="form-status" role="status">{status}</p> : null}
      </form>
    </section>
  );
}
