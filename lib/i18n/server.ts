import { cookies, headers } from "next/headers";
import { isSupabaseConfigured } from "@/lib/env";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { createClient } from "@/lib/supabase/server";
import { getRequestLocale } from "./get-request-locale";
import { loadMessages } from "./loader";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  isLocaleEnabled,
  normalizeLocale,
  type SupportedLocale,
} from "./locales";
import {
  createTranslator,
  type InterpolationValues,
  type MessageKey,
  type MessageName,
  type MessageNamespace,
  type Messages,
} from "./messages";

export type ServerI18n = Readonly<{
  locale: SupportedLocale;
  messages: Messages;
  t: (key: MessageKey, values?: InterpolationValues) => string;
}>;

async function readAuthenticatedProfileLocale(): Promise<SupportedLocale | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("preferred_locale")
      .eq("id", data.user.id)
      .maybeSingle();
    if (profileError) return null;
    return normalizeLocale(profile?.preferred_locale);
  } catch {
    return null;
  }
}

export async function getServerI18n({
  restoreProfile = true,
}: { restoreProfile?: boolean } = {}): Promise<ServerI18n> {
  const [cookieStore, requestHeaders] = await Promise.all([cookies(), headers()]);
  const cookieLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
  const profileLocale =
    restoreProfile && !normalizeLocale(cookieLocale)
      ? await readAuthenticatedProfileLocale()
      : null;
  const extendedLocalesEnabled = isFeatureEnabled("ENABLE_EXTENDED_LOCALES");
  const requestedLocale = getRequestLocale({
    cookie: cookieLocale,
    profile: profileLocale,
    acceptLanguage: requestHeaders.get("accept-language"),
  });
  const locale = isLocaleEnabled(requestedLocale, extendedLocalesEnabled)
    ? requestedLocale
    : DEFAULT_LOCALE;
  const messages = await loadMessages(locale);
  return { locale, messages, t: createTranslator(messages) };
}

export async function getServerTranslations<
  Namespace extends MessageNamespace,
>(namespace: Namespace) {
  const { locale, t } = await getServerI18n({ restoreProfile: true });
  return {
    locale,
    t: (name: MessageName<Namespace>, values?: InterpolationValues) =>
      t(`${namespace}.${name}` as MessageKey, values),
  };
}
