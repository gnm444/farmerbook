"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { CheckCircle2, HelpCircle, Send } from "lucide-react";
import type { SupportedLocale } from "@/lib/i18n/locales";
import { createSupportCaseAction } from "./actions";
import type { SupportCase } from "./types";

const supportCategories: ReadonlyArray<{
  value: SupportCase["category"];
  label: string;
}> = [
  { value: "account", label: "Account access" },
  { value: "marketplace", label: "Marketplace" },
  { value: "profile", label: "Profile" },
  { value: "technical", label: "Technical problem" },
  { value: "billing", label: "Billing or pricing" },
  { value: "safety", label: "Safety or complaint" },
  { value: "agriculture", label: "Agriculture question" },
  { value: "other", label: "Other" },
];

function caseStateLabel(state: SupportCase["state"]) {
  if (state === "answered") return "Answered";
  if (state === "escalated") return "Human review";
  if (state === "closed") return "Closed";
  if (state === "proposal_ready") return "Reply under review";
  return "Open";
}

export function SupportConsole({
  cases,
  locale,
  enabled,
  configured,
}: {
  cases: SupportCase[];
  locale: SupportedLocale;
  enabled: boolean;
  configured: boolean;
}) {
  const router = useRouter();
  const [category, setCategory] = useState<SupportCase["category"]>("account");
  const [subject, setSubject] = useState("");
  const [question, setQuestion] = useState("");
  const [feedback, setFeedback] = useState("");
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback("");
    setFailed(false);
    startTransition(async () => {
      const result = await createSupportCaseAction({
        category,
        locale,
        subject,
        question,
        idempotencyKey: crypto.randomUUID(),
      });
      if (!result.ok) {
        setFailed(true);
        setFeedback(result.message);
        return;
      }
      setSubject("");
      setQuestion("");
      setFeedback(
        "Your question is in the supervised support queue. A human will review any proposed reply before you see it.",
      );
      router.refresh();
    });
  }

  return (
    <div className="customer-operations-support">
      {!enabled ? (
        <p className="notice" role="status">
          The supervised support pilot is not open in this deployment.
        </p>
      ) : !configured ? (
        <p className="notice" role="status">
          Support is safely unavailable while the private pilot is being configured.
          No question will be submitted from this page.
        </p>
      ) : null}

      <div className="admin-grid customer-operations-support__layout">
        <section className="card settings-card" aria-labelledby="support-question-title">
          <div className="outreach-section-head">
            <div>
              <p className="eyebrow">Private in-app support</p>
              <h2 id="support-question-title">Ask FarmerBook a question</h2>
            </div>
            <HelpCircle aria-hidden="true" />
          </div>
          <p>
            Share only the details needed to answer your question. Do not include
            passwords, payment credentials, identity documents or precise farm addresses.
          </p>
          <form className="form-stack customer-operations-support__form" onSubmit={submit}>
            <label className="field">
              <span className="field-label">Topic</span>
              <select
                className="select"
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value as SupportCase["category"])
                }
                disabled={!configured || pending}
              >
                {supportCategories.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">Subject</span>
              <input
                className="input"
                value={subject}
                minLength={5}
                maxLength={160}
                required
                disabled={!configured || pending}
                onChange={(event) => setSubject(event.target.value)}
              />
            </label>
            <label className="field">
              <span className="field-label">Your question</span>
              <textarea
                className="textarea"
                value={question}
                minLength={10}
                maxLength={6_000}
                required
                disabled={!configured || pending}
                onChange={(event) => setQuestion(event.target.value)}
              />
            </label>
            <button className="button" type="submit" disabled={!configured || pending}>
              <Send size={17} aria-hidden="true" />
              {pending ? "Submitting…" : "Submit question"}
            </button>
          </form>
          {feedback ? (
            <p className={failed ? "form-error" : "form-success"} role={failed ? "alert" : "status"}>
              {feedback}
            </p>
          ) : null}
        </section>

        <aside className="customer-operations-support__guardrails">
          <section className="card context-card">
            <h2>Human-reviewed replies</h2>
            <p className="muted">
              AI may prepare a private draft, but it cannot approve or send an answer.
              Complaints and sensitive agriculture, legal, financial, safety or account
              requests are escalated to a person.
            </p>
          </section>
        </aside>
      </div>

      <section className="customer-operations-support__history" aria-labelledby="support-history-title">
        <div className="outreach-section-head">
          <div>
            <p className="eyebrow">Your private history</p>
            <h2 id="support-history-title">Support requests</h2>
          </div>
        </div>
        {cases.length ? (
          <div className="customer-operations-support__case-list">
            {cases.map((supportCase) => (
              <article className="card report-card customer-operations-support__case" key={supportCase.id}>
                <div className="report-head">
                  <span className="badge">{caseStateLabel(supportCase.state)}</span>
                  <time className="muted" dateTime={supportCase.createdAt}>
                    {new Date(supportCase.createdAt).toLocaleDateString(locale)}
                  </time>
                </div>
                <h3>{supportCase.subject}</h3>
                <p dir="auto">{supportCase.question}</p>
                {supportCase.replyContent ? (
                  <div className="notice customer-operations-support__approved-reply">
                    <strong>
                      <CheckCircle2 size={16} aria-hidden="true" /> Human-approved reply
                    </strong>
                    <p dir="auto">{supportCase.replyContent}</p>
                  </div>
                ) : (
                  <p className="muted customer-operations-support__waiting">
                    Awaiting a human-reviewed reply. Draft content is never shown before approval.
                  </p>
                )}
              </article>
            ))}
          </div>
        ) : (
          <section className="card empty-state">
            <div>
              <h2>No support requests yet</h2>
              <p>Your submitted questions and approved replies will appear here.</p>
            </div>
          </section>
        )}
      </section>
    </div>
  );
}
