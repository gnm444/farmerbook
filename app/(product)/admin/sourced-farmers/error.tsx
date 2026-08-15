"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function SourcedFarmersError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Private sourced Farmer research render failed", {
      digest: error.digest ?? "unavailable",
    });
  }, [error]);

  return (
    <main className="product-page sourced-farmers-error">
      <section className="card empty-state" role="alert">
        <AlertTriangle aria-hidden="true" />
        <div>
          <p className="eyebrow">Private research unavailable</p>
          <h1>The sourced Farmer workspace could not be loaded</h1>
          <p>
            No discovery batch, profile review, or archive request was submitted.
            Try the private workspace again.
          </p>
          <p className="muted">
            Private research · not a FarmerBook member · not verified · no contact
            or outreach consent.
          </p>
          <button className="button" type="button" onClick={reset}>
            Try again
          </button>
        </div>
      </section>
    </main>
  );
}
