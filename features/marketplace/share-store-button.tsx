"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";

export function ShareStoreButton({
  handle,
  fullName,
}: {
  handle: string;
  fullName: string;
}) {
  const [copied, setCopied] = useState(false);

  async function shareStore() {
    const url = `${window.location.origin}/store/${handle}`;
    setCopied(false);

    try {
      if (navigator.share) {
        await navigator.share({
          title: `${fullName} on FarmerBook`,
          text: `See ${fullName}'s farm products and supply information.`,
          url,
        });
        return;
      }

      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // Closing the native share sheet is not an application error.
    }
  }

  return (
    <span className="share-store-control">
      <button className="button button--secondary" type="button" onClick={shareStore}>
        {copied ? <Check size={17} aria-hidden="true" /> : <Share2 size={17} aria-hidden="true" />}
        {copied ? "Store link copied" : "Share this store"}
      </button>
      {copied ? <span className="sr-only" role="status">Store link copied.</span> : null}
    </span>
  );
}
