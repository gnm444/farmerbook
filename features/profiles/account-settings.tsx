"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { AlertTriangle } from "lucide-react";
import { deleteAccountAction } from "./account-actions";

export function AccountSettings() {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function deleteAccount() {
    setError("");
    startTransition(async () => {
      const result = await deleteAccountAction();
      if (!result.ok) {
        setError(result.message ?? "Account deletion could not be completed.");
        return;
      }
      setDeleted(true);
    });
  }

  if (deleted) {
    return (
      <section className="card empty-state">
        <div>
          <div className="empty-state__icon">
            <AlertTriangle size={27} aria-hidden="true" />
          </div>
          <h2>Demonstration account removed</h2>
          <p>
            In a configured pilot this immediately hides the profile and content,
            signs the participant out and schedules authentication deletion.
          </p>
          <Link className="button" href="/">
            Return to the public site
          </Link>
        </div>
      </section>
    );
  }

  return (
    <div>
      <section className="card settings-card">
        <h2>Password and sessions</h2>
        <p>Reset your password or sign out of the current browser.</p>
        <div className="form-row">
          <button className="button button--secondary" type="button">
            Send password reset
          </button>
          <button className="button button--ghost" type="button">
            Sign out
          </button>
        </div>
      </section>
      <section className="card settings-card danger-zone">
        <h2>Delete your account</h2>
        <p>
          Deletion removes your public presence, hides your posts and signs you
          out. This cannot be undone after the reviewed retention period.
        </p>
        {!confirmingDelete ? (
          <button
            className="button button--danger"
            type="button"
            onClick={() => setConfirmingDelete(true)}
          >
            Delete account
          </button>
        ) : (
          <div className="notice">
            <AlertTriangle size={19} aria-hidden="true" />
            <div>
              <strong>Confirm permanent deletion</strong>
              <p style={{ margin: "4px 0 12px" }}>
                This demonstration performs the final state transition without
                deleting external data.
              </p>
              <div className="report-actions">
                <button
                  className="button button--danger button--small"
                  type="button"
                  disabled={isPending}
                  onClick={deleteAccount}
                >
                  {isPending ? "Deleting…" : "Yes, delete my account"}
                </button>
                <button
                  className="button button--secondary button--small"
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                >
                  Cancel
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
