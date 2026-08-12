"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { useTranslations } from "@/components/locale-provider";

export function ShareProfileButton({
  handle,
  fullName,
  className = "button button--secondary",
  label,
}: {
  handle: string;
  fullName: string;
  className?: string;
  label?: string;
}) {
  const t = useTranslations("publicProfile");
  const [status, setStatus] = useState("");

  async function shareProfile() {
    const url = `${window.location.origin}/profile/${handle}`;
    setStatus("");
    try {
      if (navigator.share) {
        await navigator.share({
          title: t("shareTitle", { name: fullName }),
          text: t("shareText", { name: fullName }),
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        setStatus(t("profileLinkCopied"));
      }
    } catch {
      // Closing the operating-system share sheet is not an application error.
    }
  }

  return (
    <span className="share-profile-control">
      <button className={className} type="button" onClick={shareProfile}>
        <Share2 size={17} aria-hidden="true" /> {label ?? t("shareProfile")}
      </button>
      {status ? <span className="sr-only" role="status">{status}</span> : null}
    </span>
  );
}
