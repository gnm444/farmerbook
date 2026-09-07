"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveLocalePreferenceAction } from "@/features/profiles/locale-actions";
import {
  CORE_LOCALES,
  localeRegistry,
  normalizeLocale,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from "@/lib/i18n/locales";
import { loadMessages } from "@/lib/i18n/loader";
import { localeReviewLabel } from "@/lib/i18n/review-status";
import {
  useAuthenticatedMessages,
  useLocale,
  useLocaleMessages,
  useReplaceLocale,
  useTranslations,
} from "./locale-provider";

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
  const localeMessages = useLocaleMessages();
  const replaceLocale = useReplaceLocale();
  const authenticated = useAuthenticatedMessages();
  const common = useTranslations("common");
  const errors = useTranslations("errors");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const visibleLocales: readonly SupportedLocale[] = extendedLocalesEnabled
    ? SUPPORTED_LOCALES
    : CORE_LOCALES.some((coreLocale) => coreLocale === locale)
      ? CORE_LOCALES
      : [locale, ...CORE_LOCALES];

  function chooseLocale(input: unknown) {
    setMessage("");
    setError("");
    const nextLocale = normalizeLocale(input);
    if (!nextLocale || !visibleLocales.includes(nextLocale)) {
      setError(errors("invalidLocale"));
      return;
    }
    if (nextLocale === locale) return;

    const previousLocale = locale;
    const previousMessages = localeMessages;
    startTransition(async () => {
      let nextMessages;
      try {
        nextMessages = await loadMessages(nextLocale);
      } catch {
        setError(errors("generic"));
        return;
      }

      replaceLocale(nextLocale, nextMessages);
      let result;
      try {
        result = await saveLocalePreferenceAction(nextLocale);
      } catch {
        replaceLocale(previousLocale, previousMessages);
        setError(errors("generic"));
        return;
      }
      if (!result.ok) {
        replaceLocale(previousLocale, previousMessages);
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
        value={locale}
        disabled={isPending}
        aria-describedby={message || error ? `${id}-status` : undefined}
        onChange={(event) => chooseLocale(event.target.value)}
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
      {localeReviewLabel(locale) === "beta" ? (
        <span className="form-helper">
          {authenticated.betaDisclosure}
        </span>
      ) : null}
    </div>
  );
}
