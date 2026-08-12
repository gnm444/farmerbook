"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
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
  const value = useMemo<LocaleContextValue>(
    () => ({ locale, messages, translate: createTranslator(messages) }),
    [locale, messages],
  );

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = directionForLocale(locale);
  }, [locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useLocaleContext().locale;
}

export function useLocaleMessages() {
  return useLocaleContext().messages;
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
