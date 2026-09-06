"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  Bot,
  Mail,
  MessageCircleMore,
  Phone,
  Send,
  X,
} from "lucide-react";
import { useLocale } from "@/components/locale-provider";
import {
  FARMERBOOK_CONTACT_EMAIL,
  FARMERBOOK_CONTACT_PHONE,
  FARMERBOOK_CONTACT_PHONE_DISPLAY,
} from "@/lib/contact";
import type {
  WebsiteGreeterAction,
  WebsiteGreeterReply,
} from "@/features/website-greeter/contracts";
import {
  DEFAULT_WEBSITE_GREETER_LOCALE,
  detectWebsiteGreeterLocale,
  isWebsiteGreeterReleaseLocale,
  websiteGreeterLocaleFromText,
  type WebsiteGreeterReleaseLocale,
} from "@/features/website-greeter/locales";
import {
  WEBSITE_GREETER_LOCALE_OPTIONS,
  websiteGreeterUiMessages,
} from "@/features/website-greeter/ui-messages";

type ChatMessage = {
  id: string;
  role: "agent" | "visitor";
  text: string;
  actions?: WebsiteGreeterAction[];
};

const LOCALE_STORAGE_KEY = "farmerbook-greeter-locale";
const CONTEXT_CONSENT_STORAGE_KEY = "farmerbook-greeter-context-consent";

function welcomeMessage(locale: WebsiteGreeterReleaseLocale): ChatMessage {
  return {
    id: "welcome",
    role: "agent",
    text: websiteGreeterUiMessages(locale).welcome,
  };
}

function sessionId() {
  const key = "farmerbook-greeter-session";
  const created = crypto.randomUUID();
  try {
    const existing = window.sessionStorage.getItem(key);
    if (existing) return existing;
    window.sessionStorage.setItem(key, created);
  } catch {
    // Storage may be unavailable in strict privacy modes. The request remains
    // anonymous and valid with an in-memory UUID for this turn.
  }
  return created;
}

export function WebsiteGreetingAgent({
  mode = "floating",
  showCanaryStatus = false,
  surface = "site_launcher",
}: {
  mode?: "floating" | "embedded";
  showCanaryStatus?: boolean;
  surface?: "site_launcher" | "chat_canary";
}) {
  const siteLocale = useLocale();
  const embedded = mode === "embedded";
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [locale, setLocale] = useState<WebsiteGreeterReleaseLocale>(
    DEFAULT_WEBSITE_GREETER_LOCALE,
  );
  const [hasLocaleOverride, setHasLocaleOverride] = useState(false);
  const [contextConsent, setContextConsent] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    welcomeMessage(DEFAULT_WEBSITE_GREETER_LOCALE),
  ]);
  const [pending, setPending] = useState(false);
  const [remaining, setRemaining] = useState(8);
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const copy = websiteGreeterUiMessages(locale);
  const panelVisible = embedded || open;

  useEffect(() => {
    let storedLocale: string | null = null;
    let storedContextConsent = false;
    try {
      storedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY);
      storedContextConsent = window.sessionStorage.getItem(
        CONTEXT_CONSENT_STORAGE_KEY,
      ) === "true";
    } catch {
      // Language detection still works when persistent storage is unavailable.
    }
    const detectedLocale = isWebsiteGreeterReleaseLocale(storedLocale)
      ? storedLocale
      : detectWebsiteGreeterLocale({
          siteLocale,
          browserLanguages: window.navigator.languages,
        });
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setLocale(detectedLocale);
      setHasLocaleOverride(isWebsiteGreeterReleaseLocale(storedLocale));
      setContextConsent(storedContextConsent);
      setMessages((current) => current.length === 1 && current[0]?.id === "welcome"
        ? [welcomeMessage(detectedLocale)]
        : current);
    });
    return () => {
      cancelled = true;
    };
  }, [siteLocale]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (panelVisible && messages.length > 1) {
      endRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [messages, panelVisible]);

  useEffect(() => {
    if (embedded || !open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [embedded, open]);

  async function ask(text: string) {
    const message = text.trim();
    if (!message || pending || remaining <= 0) return;
    const turnLocale = hasLocaleOverride
      ? locale
      : websiteGreeterLocaleFromText(message) ?? locale;
    if (turnLocale !== locale) setLocale(turnLocale);
    setInput("");
    setPending(true);
    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "visitor", text: message },
    ]);
    try {
      const response = await fetch(
        surface === "chat_canary"
          ? "/api/website-greeter/canary"
          : "/api/website-greeter",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            sessionId: sessionId(),
            message,
            locale: turnLocale,
            contextConsent,
          }),
        },
      );
      if (!response.ok) throw new Error("GREETER_UNAVAILABLE");
      const reply = await response.json() as WebsiteGreeterReply;
      setRemaining(reply.remainingSessionReplies);
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "agent",
          text: reply.text,
          actions: reply.actions,
        },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "agent",
          text: websiteGreeterUiMessages(turnLocale).unavailable(
            FARMERBOOK_CONTACT_EMAIL,
            FARMERBOOK_CONTACT_PHONE_DISPLAY,
          ),
          actions: [
            {
              label: websiteGreeterUiMessages(turnLocale).emailAction,
              href: `mailto:${FARMERBOOK_CONTACT_EMAIL}`,
            },
            {
              label: websiteGreeterUiMessages(turnLocale).callAction,
              href: `tel:${FARMERBOOK_CONTACT_PHONE}`,
            },
          ],
        },
      ]);
    } finally {
      setPending(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void ask(input);
  }

  function changeLocale(value: string) {
    if (!isWebsiteGreeterReleaseLocale(value)) return;
    setLocale(value);
    setHasLocaleOverride(true);
    setMessages((current) => current.length === 1 && current[0]?.id === "welcome"
      ? [welcomeMessage(value)]
      : current);
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, value);
    } catch {
      // The in-memory override still applies for the current page lifecycle.
    }
  }

  function changeContextConsent(enabled: boolean) {
    setContextConsent(enabled);
    try {
      if (enabled) {
        window.sessionStorage.setItem(CONTEXT_CONSENT_STORAGE_KEY, "true");
      } else {
        window.sessionStorage.removeItem(CONTEXT_CONSENT_STORAGE_KEY);
      }
    } catch {
      // The in-memory choice remains effective for this page lifecycle.
    }
    if (!enabled && contextConsent) {
      void fetch("/api/website-greeter", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId: sessionId() }),
      }).catch(() => undefined);
    }
  }

  return (
    <aside
      className={`website-greeter website-greeter--${mode}`}
      aria-label={copy.asideLabel}
      lang={locale}
    >
      {panelVisible ? (
        <section
          className="website-greeter__panel"
          role={embedded ? "region" : "dialog"}
          aria-modal={embedded ? undefined : "false"}
          aria-labelledby="website-greeter-title"
        >
          <header className="website-greeter__header">
            <span className="website-greeter__avatar" aria-hidden="true"><Bot /></span>
            <span>
              <strong id="website-greeter-title">{copy.title}</strong>
              <small><i aria-hidden="true" /> {copy.status}</small>
            </span>
            {!embedded ? (
              <button type="button" onClick={() => setOpen(false)} aria-label={copy.close}>
                <X aria-hidden="true" />
              </button>
            ) : null}
          </header>

          <div className="website-greeter__language">
            <label htmlFor="website-greeter-locale">{copy.languageLabel}</label>
            <select
              id="website-greeter-locale"
              value={locale}
              onChange={(event) => changeLocale(event.currentTarget.value)}
              disabled={pending}
            >
              {WEBSITE_GREETER_LOCALE_OPTIONS.map((option) => (
                <option value={option.value} key={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          {showCanaryStatus ? (
            <div className="website-greeter__canary-status" role="status">
              <strong>{copy.canaryStatusTitle}</strong>
              <p>{copy.canaryStatusBody}</p>
            </div>
          ) : null}

          <div className="website-greeter__context-control">
            <label>
              <input
                type="checkbox"
                checked={contextConsent}
                disabled={pending}
                onChange={(event) => changeContextConsent(event.currentTarget.checked)}
              />
              <span>{copy.contextLabel}</span>
            </label>
            <small>{copy.contextHelp}</small>
          </div>

          <div className="website-greeter__messages" aria-live="polite" aria-busy={pending}>
            {messages.map((message) => (
              <div className={`website-greeter__message website-greeter__message--${message.role}`} key={message.id}>
                <p>{message.text}</p>
                {message.actions?.length ? (
                  <div className="website-greeter__actions">
                    {message.actions.map((action) => (
                      <a href={action.href} key={`${message.id}-${action.href}`}>{action.label}</a>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
            {pending ? <div className="website-greeter__typing" role="status">{copy.thinking}</div> : null}
            <div ref={endRef} />
          </div>

          {messages.length === 1 ? (
            <div className="website-greeter__quick" aria-label={copy.commonQuestions}>
              {copy.quickQuestions.map((question) => (
                <button type="button" key={question} onClick={() => void ask(question)}>{question}</button>
              ))}
            </div>
          ) : null}

          <form className="website-greeter__form" onSubmit={submit}>
            <label className="sr-only" htmlFor="website-greeter-input">{copy.inputLabel}</label>
            <input
              ref={inputRef}
              id="website-greeter-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              maxLength={300}
              placeholder={remaining > 0 ? copy.inputPlaceholder : copy.sessionComplete}
              disabled={pending || remaining <= 0}
            />
            <button type="submit" aria-label={copy.send} disabled={pending || !input.trim() || remaining <= 0}>
              <Send aria-hidden="true" />
            </button>
          </form>
          <footer className="website-greeter__footer">
            <span>{contextConsent ? copy.privacyWithContext : copy.privacy}</span>
            <span>{copy.repliesLeft(remaining)}</span>
          </footer>
          <div className="website-greeter__followup">
            <a href="/join?campaign=greeter">{copy.followup}</a>
            <small>{copy.followupConsent}</small>
          </div>
          <div className="website-greeter__contact">
            <a href={`mailto:${FARMERBOOK_CONTACT_EMAIL}`}><Mail aria-hidden="true" /> {FARMERBOOK_CONTACT_EMAIL}</a>
            <a href={`tel:${FARMERBOOK_CONTACT_PHONE}`}><Phone aria-hidden="true" /> {FARMERBOOK_CONTACT_PHONE_DISPLAY}</a>
          </div>
        </section>
      ) : (
        <button
          className="website-greeter__launcher"
          type="button"
          aria-expanded="false"
          onClick={() => setOpen(true)}
        >
          <span><MessageCircleMore aria-hidden="true" /></span>
          <span><strong>{copy.launcherTitle}</strong><small>{copy.launcherSubtitle}</small></span>
        </button>
      )}
    </aside>
  );
}
