"use client";

import {
  useCallback,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getAuthenticatedMessages,
  type AuthenticatedMessages,
} from "@/lib/i18n/authenticated-messages";
import {
  createTranslator,
  type InterpolationValues,
  type MessageKey,
  type MessageName,
  type MessageNamespace,
  type Messages,
} from "@/lib/i18n/messages";
import {
  directionForLocale,
  type SupportedLocale,
} from "@/lib/i18n/locales";

type LocaleContextValue = {
  locale: SupportedLocale;
  messages: Messages;
  translate: (key: MessageKey, values?: InterpolationValues) => string;
  replaceLocale: (locale: SupportedLocale, messages: Messages) => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  locale,
  messages,
  children,
}: {
  locale: SupportedLocale;
  messages: Messages;
  children: ReactNode;
}) {
  const [clientOverride, setClientOverride] = useState<{
    locale: SupportedLocale;
    messages: Messages;
  } | null>(null);
  const active = useMemo(
    () =>
      clientOverride && clientOverride.locale !== locale
        ? clientOverride
        : { locale, messages },
    [clientOverride, locale, messages],
  );

  const replaceLocale = useCallback(
    (nextLocale: SupportedLocale, nextMessages: Messages) => {
      setClientOverride({ locale: nextLocale, messages: nextMessages });
    },
    [],
  );

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale: active.locale,
      messages: active.messages,
      translate: createTranslator(active.messages),
      replaceLocale,
    }),
    [active, replaceLocale],
  );

  useEffect(() => {
    document.documentElement.lang = active.locale;
    document.documentElement.dir = directionForLocale(active.locale);
  }, [active.locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useLocaleContext().locale;
}

export function useLocaleMessages() {
  return useLocaleContext().messages;
}

export function useReplaceLocale() {
  return useLocaleContext().replaceLocale;
}

export function useAuthenticatedMessages(): AuthenticatedMessages {
  const locale = useLocale();
  return useMemo(() => getAuthenticatedMessages(locale), [locale]);
}

export function useTranslator() {
  return useLocaleContext().translate;
}

export function useTranslations<Namespace extends MessageNamespace>(
  namespace: Namespace,
) {
  const translate = useTranslator();
  return useMemo(
    () =>
      (name: MessageName<Namespace>, values?: InterpolationValues) =>
        translate(`${namespace}.${name}` as MessageKey, values),
    [namespace, translate],
  );
}

function useLocaleContext() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("LocaleProvider is required to use localization hooks.");
  }
  return context;
}
