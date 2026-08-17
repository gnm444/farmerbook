"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Bot, CircleDollarSign, FileCheck2, RefreshCw, XCircle } from "lucide-react";
import { prepareBlogDraftAction, reviewBlogDraftAction } from "./admin-actions";
import type { BlogAgentDesk } from "./admin-queries";

function money(micros: number) {
  return `$${(micros / 1_000_000).toFixed(4)}`;
}

export function BlogAgentConsole({ configured, drafts, status }: BlogAgentDesk) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState("");

  function prepare() {
    setFeedback("");
    startTransition(async () => {
      const result = await prepareBlogDraftAction();
      setFeedback(result.message);
      if (result.ok) window.location.reload();
    });
  }

  function review(id: string, decision: "publish" | "reject") {
    setFeedback("");
    startTransition(async () => {
      const result = await reviewBlogDraftAction({ id, decision });
      setFeedback(result.message);
      if (result.ok) window.location.reload();
    });
  }

  return (
    <div className="blog-agent-console">
      {!configured || !status ? (
        <div className="form-error" role="status">
          The Blog Writing Agent binding is unavailable. Drafting and translations fail closed; reviewed static articles remain readable.
        </div>
      ) : (
        <section className="card blog-agent-status" aria-labelledby="blog-agent-status-title">
          <div>
            <span className="managed-agent-status managed-agent-status--healthy">scheduled</span>
            <h2 id="blog-agent-status-title">Weekly editorial drafting</h2>
            <p>Tuesday at 09:00 IST · durable schedule · human publication approval required</p>
          </div>
          <dl>
            <div><dt>Model</dt><dd>{status.model}</dd></div>
            <div><dt>Monthly AI cap</dt><dd>${status.monthlyBudgetUsd.toFixed(2)}</dd></div>
            <div><dt>Reserved estimate</dt><dd>{money(status.estimatedAiSpendMicros)}</dd></div>
            <div><dt>Drafts / translations</dt><dd>{status.draftsThisMonth} / {status.translationsThisMonth}</dd></div>
            <div><dt>Next run</dt><dd>{status.nextScheduledRunAt ? new Date(status.nextScheduledRunAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "Pending schedule"}</dd></div>
            <div><dt>Last failure</dt><dd>{status.lastFailureCode ?? "None"}</dd></div>
          </dl>
          <button className="button" type="button" disabled={pending} onClick={prepare}>
            <RefreshCw size={16} aria-hidden="true" /> Prepare a draft now
          </button>
        </section>
      )}

      {feedback ? <p className="form-helper" role="status">{feedback}</p> : null}

      <section className="blog-agent-drafts" aria-labelledby="blog-agent-drafts-title">
        <div className="outreach-section-head">
          <div>
            <p className="eyebrow">Approval queue</p>
            <h2 id="blog-agent-drafts-title">Agent-prepared articles</h2>
          </div>
          <Bot aria-hidden="true" />
        </div>
        {drafts.length ? (
          <div className="blog-agent-draft-grid">
            {drafts.map((draft) => (
              <article className="card blog-agent-draft" key={draft.id}>
                <div className="tag-row">
                  <span className="tag">{draft.status.replaceAll("_", " ")}</span>
                  <span className="tag">{draft.content.category.replaceAll("_", " ")}</span>
                </div>
                <h3>{draft.content.english.title}</h3>
                <p>{draft.content.english.excerpt}</p>
                <details>
                  <summary>Review complete draft and sources</summary>
                  <p>{draft.content.english.dek}</p>
                  {draft.content.english.sections.map((section) => (
                    <div key={section.heading}>
                      <h4>{section.heading}</h4>
                      {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                      {section.bullets.length ? (
                        <ul>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>
                      ) : null}
                    </div>
                  ))}
                  <strong>Sources</strong>
                  <ul>{draft.content.sources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a></li>)}</ul>
                </details>
                <div className="blog-agent-draft__meta">
                  <span>{draft.model}</span>
                  <span>{new Date(draft.createdAt).toLocaleString("en-IN")}</span>
                </div>
                {draft.status === "awaiting_review" ? (
                  <div className="button-row">
                    <button className="button" type="button" disabled={pending} onClick={() => review(draft.id, "publish")}>
                      <FileCheck2 size={16} aria-hidden="true" /> Publish reviewed draft
                    </button>
                    <button className="button button--secondary" type="button" disabled={pending} onClick={() => review(draft.id, "reject")}>
                      <XCircle size={16} aria-hidden="true" /> Reject
                    </button>
                  </div>
                ) : draft.status === "published" ? (
                  <Link href={`/blog/${draft.content.slug}`}>Open published article</Link>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <div className="card empty-state">
            <CircleDollarSign aria-hidden="true" />
            <h3>No managed drafts yet</h3>
            <p>The weekly schedule will prepare one, or an administrator can request a bounded run now.</p>
          </div>
        )}
      </section>
    </div>
  );
}
