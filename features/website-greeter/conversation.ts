import type { WebsiteGreeterProviderId } from "./provider-config";
import type { WebsiteGreeterReleaseLocale } from "./locales";

export const WEBSITE_GREETER_CONTEXT_CONSENT_VERSION =
  "anonymous-conversation-context-v1";
export const WEBSITE_GREETER_CONTEXT_RETENTION_HOURS = 24;
export const WEBSITE_GREETER_MAX_CONTEXT_TURNS = 8;
export const WEBSITE_GREETER_MAX_CONTEXT_CHARACTERS = 2_400;
export const WEBSITE_GREETER_MEMORY_SCOPE_PREFIX = "memory-";

export type WebsiteGreeterContextTurn = {
  role: "user" | "assistant";
  content: string;
  locale: WebsiteGreeterReleaseLocale;
};

export type WebsiteGreeterProviderSessionMapping = {
  providerId: WebsiteGreeterProviderId;
  providerSessionId: string;
};

export function createWebsiteGreeterMemoryScopeId() {
  return `${WEBSITE_GREETER_MEMORY_SCOPE_PREFIX}${crypto.randomUUID()}`;
}

export function isWebsiteGreeterMemoryScopeId(value: string | null | undefined) {
  return typeof value === "string"
    && /^memory-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u
      .test(value);
}

export type WebsiteGreeterAnonymousConversation = {
  anonymousSessionId: string;
  consentVersion: typeof WEBSITE_GREETER_CONTEXT_CONSENT_VERSION;
  expiresAt: string;
  providerSession: WebsiteGreeterProviderSessionMapping | null;
};

export interface WebsiteGreeterConversationStore {
  context(sessionId: string, now: Date): WebsiteGreeterContextTurn[];
  appendExchange(options: {
    sessionId: string;
    locale: WebsiteGreeterReleaseLocale;
    userMessage: string;
    assistantMessage: string;
    providerId: WebsiteGreeterProviderId | null;
    now: Date;
  }): void;
  clear(sessionId: string): boolean;
}

export function sanitizeWebsiteGreeterContextText(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/gu, " ")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu, "[email removed]")
    .replace(/\b(?:https?:\/\/|www\.)\S+/giu, "[link removed]")
    .replace(/(?:\+?\d[\d ().-]{7,}\d)/gu, "[phone removed]")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, 650);
}

export function boundWebsiteGreeterContext(
  turns: readonly WebsiteGreeterContextTurn[],
) {
  const selected: WebsiteGreeterContextTurn[] = [];
  let characters = 0;

  for (const turn of [...turns].reverse()) {
    if (selected.length >= WEBSITE_GREETER_MAX_CONTEXT_TURNS) break;
    const content = sanitizeWebsiteGreeterContextText(turn.content);
    if (!content) continue;
    if (characters + content.length > WEBSITE_GREETER_MAX_CONTEXT_CHARACTERS) {
      if (selected.length === 0) {
        selected.push({ ...turn, content: content.slice(0, WEBSITE_GREETER_MAX_CONTEXT_CHARACTERS) });
      }
      break;
    }
    selected.push({ ...turn, content });
    characters += content.length;
  }

  return selected.reverse();
}
