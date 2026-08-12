"use client";

import { useEffect } from "react";
import { useTranslations } from "@/components/locale-provider";

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");
  useEffect(() => {
    console.error("FarmerBook route render failed", {
      digest: error.digest ?? "unavailable",
    });
  }, [error]);

  return (
    <main className="container section">
      <section className="card empty-state" role="alert">
        <div>
          <h1>{t("pageUnavailable")}</h1>
          <p>{t("unchangedRetry")}</p>
          <button className="button" type="button" onClick={reset}>
            {t("tryAgain")}
          </button>
        </div>
      </section>
    </main>
  );
}
