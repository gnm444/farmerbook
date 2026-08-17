"use client";

import { useId, useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveLocalePreferenceAction } from "@/features/profiles/locale-actions";
import {
  CORE_LOCALES,
  localeRegistry,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from "@/lib/i18n/locales";
import { localeReviewLabel } from "@/lib/i18n/review-status";
import { useLocale, useTranslations } from "./locale-provider";

export function LanguageSelector({
  className = "language-selector field",
  label,
  extendedLocalesEnabled = true,
}: {
  className?: string;
  label?: string;
  extendedLocalesEnabled?: boolean;
}) {
  const id = useId();
  const router = useRouter();
  const locale = useLocale();
  const common = useTranslations("common");
  const errors = useTranslations("errors");
  const [selected, setSelected] = useOptimistic(locale);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const visibleLocales = extendedLocalesEnabled
    ? SUPPORTED_LOCALES
    : CORE_LOCALES.some((coreLocale) => coreLocale === locale)
      ? CORE_LOCALES
      : [locale, ...CORE_LOCALES];

  function chooseLocale(nextLocale: SupportedLocale) {
    setMessage("");
    setError("");
    startTransition(async () => {
      setSelected(nextLocale);
      const result = await saveLocalePreferenceAction(nextLocale);
      if (!result.ok) {
        setError(
          result.code === "invalid_locale"
            ? errors("invalidLocale")
            : errors("generic"),
        );
        return;
      }
      if (result.warning) setMessage(errors("profileSave"));
      router.refresh();
    });
  }

  return (
    <div className={className}>
      <label htmlFor={id}>{label ?? common("language")}</label>
      <select
        className="select"
        id={id}
        value={selected}
        disabled={isPending}
        aria-describedby={message || error ? `${id}-status` : undefined}
        onChange={(event) => chooseLocale(event.target.value as SupportedLocale)}
      >
        {visibleLocales.map((supportedLocale) => {
          const details = localeRegistry[supportedLocale];
          const name =
            details.nativeName === details.englishName
              ? details.nativeName
              : `${details.nativeName} — ${details.englishName}`;
          const displayName =
            localeReviewLabel(supportedLocale) === "beta"
              ? `${name} (${common("beta")})`
              : name;
          return (
            <option key={supportedLocale} value={supportedLocale} lang={supportedLocale}>
              {displayName}
            </option>
          );
        })}
      </select>
      {isPending ? (
        <span className="form-helper" role="status">
          {common("saving")}
        </span>
      ) : null}
      {message ? (
        <span className="form-helper" id={`${id}-status`} role="status">
          {message}
        </span>
      ) : null}
      {error ? (
        <span className="form-error" id={`${id}-status`} role="alert">
          {error}
        </span>
      ) : null}
      {localeReviewLabel(selected) === "beta" ? (
        <span className="form-helper" lang="en-IN" dir="ltr">
          Beta language support: text awaiting native-speaker review falls back
          to Indian English.
        </span>
      ) : null}
    </div>
  );
}
