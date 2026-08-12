"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { AlertTriangle } from "lucide-react";
import { logoutAction } from "@/features/auth/actions";
import {
  deleteAccountAction,
  requestCurrentPasswordResetAction,
} from "./account-actions";
import { useTranslations } from "@/components/locale-provider";

export function AccountSettings() {
  const t = useTranslations("settings");
  const common = useTranslations("common");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isPending, startTransition] = useTransition();

  function deleteAccount() {
    setError("");
    startTransition(async () => {
      const result = await deleteAccountAction();
      if (!result.ok) {
        setError(t("deletionFailed"));
        return;
      }
      setDeleted(true);
    });
  }

  function requestPasswordReset() {
    setError("");
    setNotice("");
    startTransition(async () => {
      const result = await requestCurrentPasswordResetAction();
      if (!result.ok) {
        setError(t("resetFailed"));
        return;
      }
      setNotice(t("resetRequested"));
    });
  }

  if (deleted) {
    return (
      <section className="card empty-state">
        <div>
          <div className="empty-state__icon">
            <AlertTriangle size={27} aria-hidden="true" />
          </div>
          <h2>{t("deactivated")}</h2>
          <p>{t("deactivatedBody")}</p>
          <Link className="button" href="/">
            {t("returnPublic")}
          </Link>
        </div>
      </section>
    );
  }

  return (
    <div>
      <section className="card settings-card">
        <h2>{t("passwordSessions")}</h2>
        <p>{t("passwordSessionsHelp")}</p>
        <div className="form-row">
          <button
            className="button button--secondary"
            type="button"
            disabled={isPending}
            onClick={requestPasswordReset}
          >
            {t("sendReset")}
          </button>
          <form action={logoutAction}>
            <button className="button button--ghost" type="submit">
              {t("signOut")}
            </button>
          </form>
        </div>
        {notice ? <p className="form-success">{notice}</p> : null}
        {error ? <p className="form-error">{error}</p> : null}
      </section>
      <section className="card settings-card danger-zone">
        <h2>{t("deactivateTitle")}</h2>
        <p>{t("deactivateBody")}</p>
        {!confirmingDelete ? (
          <button
            className="button button--danger"
            type="button"
            onClick={() => setConfirmingDelete(true)}
          >
            {t("deactivate")}
          </button>
        ) : (
          <div className="notice">
            <AlertTriangle size={19} aria-hidden="true" />
            <div>
              <strong>{t("confirmDeactivate")}</strong>
              <p style={{ margin: "4px 0 12px" }}>
                {t("confirmDeactivateBody")}
              </p>
              <div className="report-actions">
                <button
                  className="button button--danger button--small"
                  type="button"
                  disabled={isPending}
                  onClick={deleteAccount}
                >
                  {isPending ? t("deactivating") : t("yesDeactivate")}
                </button>
                <button
                  className="button button--secondary button--small"
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                >
                  {common("cancel")}
                </button>
              </div>
              {error ? <p className="form-error">{error}</p> : null}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
