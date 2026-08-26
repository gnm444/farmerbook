"use client";

import Script from "next/script";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { CheckCircle2, Mail, Send } from "lucide-react";
import { submitFeaturedFarmerQuestionAction } from "./engagement-actions";

type TurnstileApi = {
  render(
    container: HTMLElement,
    options: {
      sitekey: string;
      action: string;
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    },
  ): string;
  remove(widgetId: string): void;
  reset(widgetId: string): void;
};

function turnstileApi() {
  return (window as typeof window & { turnstile?: TurnstileApi }).turnstile;
}

export function FeaturedFarmerQuestionForm({
  slug,
  publicEmail,
  turnstileSiteKey,
  messages,
}: {
  slug: string;
  publicEmail: string;
  turnstileSiteKey: string;
  messages: {
    privateQuestions: string;
    privateQuestionsBody: string;
    yourName: string;
    replyEmail: string;
    messageType: string;
    question: string;
    comment: string;
    yourMessage: string;
    questionConsent: string;
    spamProtection: string;
    sendPrivately: string;
    sending: string;
    questionSent: string;
    questionPrivate: string;
    website: string;
  };
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [turnstileReady, setTurnstileReady] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const idempotencyKey = useRef<string | null>(null);
  const rawId = useId();
  const formId = rawId.replaceAll(":", "");

  useEffect(() => {
    const api = turnstileApi();
    if (!turnstileReady || !api || !container.current) return;
    if (widgetId.current) api.remove(widgetId.current);
    widgetId.current = api.render(container.current, {
      sitekey: turnstileSiteKey,
      action: "farmer_profile_question",
      callback: setTurnstileToken,
      "expired-callback": () => setTurnstileToken(""),
      "error-callback": () => setTurnstileToken(""),
    });
    return () => {
      const currentApi = turnstileApi();
      if (widgetId.current && currentApi) currentApi.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [turnstileReady, turnstileSiteKey]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const data = new FormData(formElement);
    idempotencyKey.current ??= crypto.randomUUID();
    setError("");
    startTransition(async () => {
      const result = await submitFeaturedFarmerQuestionAction({
        slug,
        name: data.get("name"),
        email: data.get("email"),
        kind: data.get("kind"),
        message: data.get("message"),
        consent: data.get("consent") === "on",
        website: data.get("website"),
        idempotencyKey: idempotencyKey.current,
        turnstileToken,
      });
      if (!result.ok) {
        setError(result.message);
        const api = turnstileApi();
        if (widgetId.current && api) api.reset(widgetId.current);
        setTurnstileToken("");
        return;
      }
      if (
        result.code !== "BOT_IGNORED" &&
        result.notificationState &&
        result.notificationState !== "sent"
      ) {
        setError(
          "FarmerBook could not confirm email delivery. Please use the farm email below; do not resubmit the same message.",
        );
        return;
      }
      setSuccess(true);
      formElement.reset();
    });
  }

  if (success) {
    return (
      <div className="featured-engagement__success" role="status">
        <CheckCircle2 size={32} aria-hidden="true" />
        <h3>{messages.questionSent}</h3>
        <p>{messages.questionPrivate}</p>
      </div>
    );
  }

  return (
    <form className="featured-engagement__form" onSubmit={submit}>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={() => setTurnstileReady(true)}
      />
      <div className="featured-engagement__heading">
        <span><Mail size={23} aria-hidden="true" /></span>
        <div>
          <h2>{messages.privateQuestions}</h2>
          <p>{messages.privateQuestionsBody}</p>
        </div>
      </div>
      <div className="form-row">
        <label className="field" htmlFor={`${formId}-name`}>
          <span>{messages.yourName}</span>
          <input
            className="input"
            id={`${formId}-name`}
            name="name"
            autoComplete="name"
            minLength={2}
            maxLength={120}
            required
            dir="auto"
          />
        </label>
        <label className="field" htmlFor={`${formId}-email`}>
          <span>{messages.replyEmail}</span>
          <input
            className="input"
            id={`${formId}-email`}
            name="email"
            type="email"
            autoComplete="email"
            maxLength={254}
            required
          />
        </label>
      </div>
      <label className="field" htmlFor={`${formId}-kind`}>
        <span>{messages.messageType}</span>
        <select className="select" id={`${formId}-kind`} name="kind" defaultValue="question">
          <option value="question">{messages.question}</option>
          <option value="comment">{messages.comment}</option>
        </select>
      </label>
      <label className="field" htmlFor={`${formId}-message`}>
        <span>{messages.yourMessage}</span>
        <textarea
          className="textarea"
          id={`${formId}-message`}
          name="message"
          minLength={20}
          maxLength={1500}
          required
          dir="auto"
        />
      </label>
      <label className="featured-engagement__consent">
        <input name="consent" type="checkbox" required />
        <span>{messages.questionConsent}</span>
      </label>
      <label className="market-honeypot" aria-hidden="true">
        {messages.website}
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
      <div className="featured-engagement__turnstile">
        <span>{messages.spamProtection}</span>
        <div ref={container} />
      </div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <button
        className="button"
        type="submit"
        disabled={isPending || !turnstileToken}
      >
        <Send size={17} aria-hidden="true" />
        {isPending ? messages.sending : messages.sendPrivately}
      </button>
      <p className="featured-engagement__private">
        {messages.questionPrivate}{" "}
        <a href={`mailto:${publicEmail}`}>{publicEmail}</a>
      </p>
    </form>
  );
}
