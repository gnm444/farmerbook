"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ExternalLink, Globe2, LockKeyhole } from "lucide-react";
import { savePublicProfileAction } from "./actions";
import { ShareProfileButton } from "./share-profile-button";
import { useTranslations } from "@/components/locale-provider";

export function ProfileHomeSettings({
  handle,
  fullName,
  initialEnabled,
}: {
  handle: string;
  fullName: string;
  initialEnabled: boolean;
}) {
  const t = useTranslations("settings");
  const common = useTranslations("common");
  const [enabled, setEnabled] = useState(initialEnabled);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function updatePublished() {
    const nextEnabled = !enabled;
    setMessage("");
    setError("");
    startTransition(async () => {
      const result = await savePublicProfileAction(nextEnabled);
      if (!result.ok) {
        setError(t("publicSaveFailed"));
        return;
      }
      setEnabled(nextEnabled);
      setMessage(
        nextEnabled
          ? t("homepagePublished")
          : t("homepagePrivate"),
      );
    });
  }

  return (
    <section className="profile-home-settings" aria-labelledby="profile-home-title">
      <div className="profile-home-settings__copy">
        {enabled ? <Globe2 size={22} aria-hidden="true" /> : <LockKeyhole size={22} aria-hidden="true" />}
        <div>
          <h3 id="profile-home-title">{t("homepage")}</h3>
          <p>
            {enabled
              ? t("publicAt", { handle })
              : t("privateUntilPublished")}
          </p>
        </div>
      </div>
      <div className="profile-home-settings__actions">
        <button
          className={`button ${enabled ? "button--ghost" : ""}`}
          type="button"
          disabled={isPending}
          aria-pressed={enabled}
          onClick={updatePublished}
        >
          {isPending ? common("saving") : enabled ? t("unpublish") : t("publish")}
        </button>
        {enabled ? (
          <>
            <Link className="button button--secondary" href={`/profile/${handle}`} target="_blank">
              <ExternalLink size={17} aria-hidden="true" /> {t("preview")}
            </Link>
            <ShareProfileButton handle={handle} fullName={fullName} />
          </>
        ) : null}
      </div>
      {message ? <p className="form-helper" role="status">{message}</p> : null}
      {error ? <p className="form-error" role="alert">{error}</p> : null}
    </section>
  );
}
