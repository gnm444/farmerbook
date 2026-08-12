"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  directionForLocale,
  normalizeLocale,
  type SupportedLocale,
} from "@/lib/i18n/locales";

const copy = {
  "en-IN": {
    title: "FarmerBook is temporarily unavailable",
    body: "Please try again. No form or account change was submitted.",
    retry: "Try again",
  },
  "hi-IN": {
    title: "फार्मरबुक अभी उपलब्ध नहीं है",
    body: "कृपया फिर प्रयास करें। कोई फ़ॉर्म या खाता बदलाव जमा नहीं हुआ।",
    retry: "फिर प्रयास करें",
  },
  "mr-IN": {
    title: "फार्मरबुक सध्या उपलब्ध नाही",
    body: "कृपया पुन्हा प्रयत्न करा. कोणताही फॉर्म किंवा खाते बदल सादर झाला नाही.",
    retry: "पुन्हा प्रयत्न करा",
  },
} as const;

function readCookieLocale(): SupportedLocale {
  const value = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${LOCALE_COOKIE_NAME}=`))
    ?.slice(LOCALE_COOKIE_NAME.length + 1);
  return normalizeLocale(value ? decodeURIComponent(value) : undefined) ?? DEFAULT_LOCALE;
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const locale = useSyncExternalStore(
    () => () => undefined,
    readCookieLocale,
    () => DEFAULT_LOCALE,
  );
  const labels = locale === "hi-IN" || locale === "mr-IN" ? copy[locale] : copy[DEFAULT_LOCALE];

  useEffect(() => {
    console.error("FarmerBook application render failed", {
      digest: error.digest ?? "unavailable",
    });
  }, [error]);

  return (
    <html lang={locale} dir={directionForLocale(locale)}>
      <body>
        <main className="container section">
          <section className="card empty-state" role="alert">
            <div>
              <h1>{labels.title}</h1>
              <p>{labels.body}</p>
              <button className="button" type="button" onClick={reset}>
                {labels.retry}
              </button>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
