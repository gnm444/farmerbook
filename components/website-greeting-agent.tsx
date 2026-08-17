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

type ChatMessage = {
  id: string;
  role: "agent" | "visitor";
  text: string;
  actions?: WebsiteGreeterAction[];
};

const welcomeMessage: ChatMessage = {
  id: "welcome",
  role: "agent",
  text: "Namaste! Welcome to FarmerBook. I can help you join, buy produce, sell a harvest, understand verification or reach our team.",
};

const quickQuestions = [
  "I want to sell produce",
  "I want to buy produce",
  "How do I join?",
  "Organic certification",
];

function sessionId() {
  const key = "farmerbook-greeter-session";
  const existing = window.sessionStorage.getItem(key);
  if (existing) return existing;
  const created = crypto.randomUUID();
  window.sessionStorage.setItem(key, created);
  return created;
}

export function WebsiteGreetingAgent() {
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage]);
  const [pending, setPending] = useState(false);
  const [remaining, setRemaining] = useState(8);
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages, open]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  async function ask(text: string) {
    const message = text.trim();
    if (!message || pending || remaining <= 0) return;
    setInput("");
    setPending(true);
    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "visitor", text: message },
    ]);
    try {
      const response = await fetch("/api/website-greeter", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId: sessionId(), message, locale }),
      });
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
          text: `I’m temporarily unavailable. Please email ${FARMERBOOK_CONTACT_EMAIL} or call ${FARMERBOOK_CONTACT_PHONE_DISPLAY}.`,
          actions: [
            { label: "Email the CEO", href: `mailto:${FARMERBOOK_CONTACT_EMAIL}` },
            { label: "Call FarmerBook", href: `tel:${FARMERBOOK_CONTACT_PHONE}` },
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

  return (
    <aside className="website-greeter" aria-label="FarmerBook customer greeting agent">
      {open ? (
        <section
          className="website-greeter__panel"
          role="dialog"
          aria-modal="false"
          aria-labelledby="website-greeter-title"
        >
          <header className="website-greeter__header">
            <span className="website-greeter__avatar" aria-hidden="true"><Bot /></span>
            <span>
              <strong id="website-greeter-title">FarmerBook greeter</strong>
              <small><i aria-hidden="true" /> AI agent · 24/7 · budget protected</small>
            </span>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close greeting agent">
              <X aria-hidden="true" />
            </button>
          </header>

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
            {pending ? <div className="website-greeter__typing" role="status">Thinking…</div> : null}
            <div ref={endRef} />
          </div>

          {messages.length === 1 ? (
            <div className="website-greeter__quick" aria-label="Common questions">
              {quickQuestions.map((question) => (
                <button type="button" key={question} onClick={() => void ask(question)}>{question}</button>
              ))}
            </div>
          ) : null}

          <form className="website-greeter__form" onSubmit={submit}>
            <label className="sr-only" htmlFor="website-greeter-input">Ask FarmerBook</label>
            <input
              ref={inputRef}
              id="website-greeter-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              maxLength={300}
              placeholder={remaining > 0 ? "Ask about FarmerBook…" : "Session complete"}
              disabled={pending || remaining <= 0}
            />
            <button type="submit" aria-label="Send question" disabled={pending || !input.trim() || remaining <= 0}>
              <Send aria-hidden="true" />
            </button>
          </form>
          <footer className="website-greeter__footer">
            <span>No personal details or message text are stored.</span>
            <span>{remaining} replies left</span>
          </footer>
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
          <span><strong>Namaste!</strong><small>Ask FarmerBook · 24/7</small></span>
        </button>
      )}
    </aside>
  );
}
