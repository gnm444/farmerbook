"use client";

import { useId, useState, useTransition } from "react";
import { Flag } from "lucide-react";
import { useTranslations } from "@/components/locale-provider";
import { createReportAction } from "./actions";
import type { ModerationReport } from "@/lib/types";

type ReportableTarget = ModerationReport["targetType"];

export function ReportTargetButton({
  targetType,
  targetId,
  label,
}: {
  targetType: ReportableTarget;
  targetId: string;
  label: string;
}) {
  const t = useTranslations("feed");
  const detailsId = useId();
  const [open, setOpen] = useState(false);
  const [reported, setReported] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError("");
    startTransition(async () => {
      const result = await createReportAction({
        targetType,
        targetId,
        reason: form.get("reason"),
        details: form.get("details"),
      });
      if (!result.ok) {
        setError(t("reportSubmitFailed"));
        return;
      }
      setReported(true);
      setOpen(false);
    });
  }

  if (reported) {
    return <p className="form-helper" role="status">{t("reportSentModeration")}</p>;
  }

  return (
    <div>
      <button
        className="button button--ghost button--small"
        type="button"
        aria-expanded={open}
        aria-controls={detailsId}
        onClick={() => setOpen((current) => !current)}
      >
        <Flag size={15} aria-hidden="true" /> {t("reportButton", { label })}
      </button>
      {open ? (
        <form className="form-stack" id={detailsId} onSubmit={submit}>
          <label className="field">
            <span>{t("reason")}</span>
            <select className="select" name="reason" defaultValue="unsafe">
              <option value="misinformation">{t("misinformation")}</option>
              <option value="harassment">{t("harassment")}</option>
              <option value="spam">{t("spamAbuse")}</option>
              <option value="unsafe">{t("unsafeContent")}</option>
              <option value="other">{t("otherReason")}</option>
            </select>
          </label>
          <label className="field">
            <span>{t("moderatorDetails")}</span>
            <textarea className="textarea" name="details" maxLength={1000} dir="auto" />
          </label>
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <div className="form-row">
            <button className="button button--small" type="submit" disabled={isPending}>
              {isPending ? t("sending") : t("sendReport")}
            </button>
            <button
              className="button button--secondary button--small"
              type="button"
              disabled={isPending}
              onClick={() => setOpen(false)}
            >
              {t("cancel")}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
