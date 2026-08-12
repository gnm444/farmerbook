import { DEFAULT_LOCALE, normalizeLocale, type SupportedLocale } from "./locales";
import type { Messages } from "./messages";

type MessageModule = { default: Messages };
type MessageLoader = () => Promise<MessageModule>;

const messageLoaders = {
  "en-IN": () => import("./messages/en-IN"),
  "as-IN": () => import("./messages/as-IN"),
  "bn-IN": () => import("./messages/bn-IN"),
  "brx-IN": () => import("./messages/brx-IN"),
  "doi-IN": () => import("./messages/doi-IN"),
  "gu-IN": () => import("./messages/gu-IN"),
  "hi-IN": () => import("./messages/hi-IN"),
  "kn-IN": () => import("./messages/kn-IN"),
  "ks-Arab-IN": () => import("./messages/ks-Arab-IN"),
  "kok-Deva-IN": () => import("./messages/kok-Deva-IN"),
  "mai-IN": () => import("./messages/mai-IN"),
  "ml-IN": () => import("./messages/ml-IN"),
  "mni-Mtei-IN": () => import("./messages/mni-Mtei-IN"),
  "mr-IN": () => import("./messages/mr-IN"),
  "ne-IN": () => import("./messages/ne-IN"),
  "or-IN": () => import("./messages/or-IN"),
  "pa-Guru-IN": () => import("./messages/pa-Guru-IN"),
  "sa-IN": () => import("./messages/sa-IN"),
  "sat-Olck-IN": () => import("./messages/sat-Olck-IN"),
  "sd-Arab-IN": () => import("./messages/sd-Arab-IN"),
  "ta-IN": () => import("./messages/ta-IN"),
  "te-IN": () => import("./messages/te-IN"),
  "ur-IN": () => import("./messages/ur-IN"),
} satisfies Record<SupportedLocale, MessageLoader>;

export async function loadMessages(locale: unknown): Promise<Messages> {
  const supportedLocale = normalizeLocale(locale) ?? DEFAULT_LOCALE;
  try {
    return (await messageLoaders[supportedLocale]()).default;
  } catch (error) {
    if (supportedLocale === DEFAULT_LOCALE) throw error;
    return (await messageLoaders[DEFAULT_LOCALE]()).default;
  }
}

export function hasMessageLoader(locale: unknown) {
  const supportedLocale = normalizeLocale(locale);
  return supportedLocale ? supportedLocale in messageLoaders : false;
}
