"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Bot,
  CircleDollarSign,
  FileCheck2,
  PauseCircle,
  RefreshCw,
  Save,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import {
  controlDailyBlogScheduleAction,
  controlOwnedSocialChannelAction,
  prepareBlogDraftAction,
  replaceBlogDraftAction,
  reviewBlogDraftAction,
  verifyBlogPublicationAction,
} from "./admin-actions";
import type { BlogAgentDraft } from "./contracts";
import type { BlogAgentDesk } from "./admin-queries";
import type { OwnedSocialChannel } from "@/features/social-publisher/contracts";

function money(micros: number) {
  return `$${(micros / 1_000_000).toFixed(4)}`;
}

function localDate(value: string | null) {
  return value
    ? new Date(value).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
    : "None";
}

function DraftReviewControls({
  draft,
  pending,
  onFeedback,
}: {
  draft: BlogAgentDraft;
  pending: boolean;
  onFeedback: (message: string, reload?: boolean) => void;
}) {
  const [actionPending, startAction] = useTransition();
  const [reason, setReason] = useState("");
  const [qualityOutcome, setQualityOutcome] = useState<
    "approved" | "light_edits" | "heavy_edits"
  >("approved");
  const [publicationJson, setPublicationJson] = useState(
    JSON.stringify(draft.content, null, 2),
  );

  function review(decision: "publish" | "reject") {
    startAction(async () => {
      const result = await reviewBlogDraftAction({
        id: draft.id,
        decision,
        expectedRevision: draft.revision,
        reason,
        qualityOutcome: decision === "reject" ? "rejected" : qualityOutcome,
      });
      onFeedback(result.message, result.ok);
    });
  }

  function replace() {
    startAction(async () => {
      const result = await replaceBlogDraftAction({
        id: draft.id,
        expectedRevision: draft.revision,
        publicationJson,
      });
      onFeedback(result.message, result.ok);
    });
  }

  function verify() {
    startAction(async () => {
      const result = await verifyBlogPublicationAction({ id: draft.id });
      onFeedback(result.message, result.ok);
    });
  }

  const busy = pending || actionPending;

  if (draft.status === "awaiting_review") {
    return (
      <div className="blog-agent-review-controls">
        <label>
          Review outcome
          <select
            value={qualityOutcome}
            onChange={(event) => setQualityOutcome(
              event.target.value as typeof qualityOutcome,
            )}
          >
            <option value="approved">Approved without material edits</option>
            <option value="light_edits">Published after light edits</option>
            <option value="heavy_edits">Published after heavy edits</option>
          </select>
        </label>
        <label>
          Review reason
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Record the source, claim and editorial checks completed."
            rows={3}
          />
        </label>
        <details>
          <summary>Edit by exact validated publication JSON</summary>
          <p>Save a replacement first, reload, and then review the new revision.</p>
          <textarea
            aria-label={`Publication JSON for ${draft.content.english.title}`}
            value={publicationJson}
            onChange={(event) => setPublicationJson(event.target.value)}
            rows={18}
            spellCheck={false}
          />
          <button className="button button--secondary" type="button" disabled={busy} onClick={replace}>
            <Save size={16} aria-hidden="true" /> Save reviewed replacement
          </button>
        </details>
        <div className="button-row">
          <button className="button" type="button" disabled={busy || reason.trim().length < 10} onClick={() => review("publish")}>
            <FileCheck2 size={16} aria-hidden="true" /> Publish reviewed draft
          </button>
          <button className="button button--secondary" type="button" disabled={busy || reason.trim().length < 10} onClick={() => review("reject")}>
            <XCircle size={16} aria-hidden="true" /> Reject permanently
          </button>
        </div>
      </div>
    );
  }

  if (draft.status === "published") {
    return (
      <div className="button-row">
        <Link href={`/blog/${draft.content.slug}`}>Open published article</Link>
        <button className="button button--secondary" type="button" disabled={busy} onClick={verify}>
          <ShieldCheck size={16} aria-hidden="true" /> Verify public route
        </button>
      </div>
    );
  }

  return null;
}

export function BlogAgentConsole({
  configured,
  drafts,
  status,
  socialStatus,
}: BlogAgentDesk) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState("");
  const [scheduleReason, setScheduleReason] = useState("");
  const [socialReason, setSocialReason] = useState("");

  function finish(message: string, reload = false) {
    setFeedback(message);
    if (reload) window.location.reload();
  }

  function prepare() {
    setFeedback("");
    startTransition(async () => {
      const result = await prepareBlogDraftAction();
      finish(result.message, result.ok);
    });
  }

  function controlSchedule(operation: "pause" | "resume") {
    setFeedback("");
    startTransition(async () => {
      const result = await controlDailyBlogScheduleAction({
        operation,
        reason: scheduleReason,
      });
      finish(result.message, result.ok);
    });
  }

  function controlSocial(channel: OwnedSocialChannel, paused: boolean) {
    setFeedback("");
    startTransition(async () => {
      const result = await controlOwnedSocialChannelAction({
        channel,
        paused,
        reason: socialReason,
      });
      finish(result.message, result.ok);
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
            <span className={`managed-agent-status managed-agent-status--${status.scheduleState === "scheduled" ? "healthy" : "paused"}`}>
              {status.scheduleState}
            </span>
            <h2 id="blog-agent-status-title">Daily editorial drafting</h2>
            <p>
              Every day at 09:00 IST · one low-risk article/day · {status.autonomousPublishingEnabled
                ? "standing-policy publication; no per-post approval"
                : "manual publication review"}
            </p>
          </div>
          <dl>
            <div><dt>Model</dt><dd>{status.model}</dd></div>
            <div><dt>Monthly AI cap</dt><dd>${status.monthlyBudgetUsd.toFixed(2)}</dd></div>
            <div><dt>Reserved estimate</dt><dd>{money(status.estimatedAiSpendMicros)}</dd></div>
            <div><dt>Drafts / translations</dt><dd>{status.draftsThisMonth} / {status.translationsThisMonth}</dd></div>
            <div><dt>Daily / monthly limit</dt><dd>{status.dailyDraftLimit} / {status.monthlyDraftLimit}</dd></div>
            <div><dt>Next run</dt><dd>{localDate(status.nextScheduledRunAt)}</dd></div>
            <div><dt>Today</dt><dd>{status.todayRun ? `${status.todayRun.status} · ${status.todayRun.source}` : "Not attempted"}</dd></div>
            <div><dt>Source manifest</dt><dd>{status.sourceManifestVersion}</dd></div>
            <div><dt>Oldest source review</dt><dd>{localDate(status.oldestSourceReviewedAt)}</dd></div>
            <div><dt>Stale sources</dt><dd>{status.staleSourceCount}</dd></div>
            <div><dt>Standing policy</dt><dd>{status.autonomousPublishingEnabled ? status.autonomousPolicyVersion : "Disabled"}</dd></div>
            <div><dt>Autonomous this month</dt><dd>{status.autonomousPublishedThisMonth}</dd></div>
            <div><dt>Provisional / quarantined</dt><dd>{status.provisionalPublications} / {status.quarantinedPublications}</dd></div>
            <div><dt>Awaiting review</dt><dd>{status.reviewMetrics.awaitingReview}</dd></div>
            <div><dt>Published / rejected</dt><dd>{status.reviewMetrics.published} / {status.reviewMetrics.rejected}</dd></div>
            <div><dt>Last failure</dt><dd>{status.lastFailureCode ?? "None"}</dd></div>
          </dl>
          <label>
            Schedule-control reason
            <input
              value={scheduleReason}
              onChange={(event) => setScheduleReason(event.target.value)}
              placeholder="Why is the daily schedule changing?"
            />
          </label>
          <div className="button-row">
            <button className="button" type="button" disabled={pending || status.schedulePaused} onClick={prepare}>
              <RefreshCw size={16} aria-hidden="true" /> Run today&apos;s editorial policy now
            </button>
            {status.schedulePaused ? (
              <button className="button button--secondary" type="button" disabled={pending || scheduleReason.trim().length < 10} onClick={() => controlSchedule("resume")}>
                <RefreshCw size={16} aria-hidden="true" /> Resume one daily schedule
              </button>
            ) : (
              <button className="button button--secondary" type="button" disabled={pending || scheduleReason.trim().length < 10} onClick={() => controlSchedule("pause")}>
                <PauseCircle size={16} aria-hidden="true" /> Pause daily drafting
              </button>
            )}
          </div>
        </section>
      )}

      <section className="card blog-agent-status" aria-labelledby="owned-social-status-title">
        <div>
          <span className={`managed-agent-status managed-agent-status--${socialStatus?.globallyEnabled ? "healthy" : "paused"}`}>
            {socialStatus?.globallyEnabled ? "standing policy" : "paused"}
          </span>
          <h2 id="owned-social-status-title">Owned social publishing</h2>
          <p>Official FarmerBook business pages only · no DMs, groups, personal-profile automation, or paid ads</p>
        </div>
        {!socialStatus ? (
          <p>The social publisher binding is unavailable.</p>
        ) : (
          <>
            <dl>
              <div><dt>Connector service</dt><dd>{socialStatus.connectorConfigured ? "Bound" : "Awaiting Meta authorization"}</dd></div>
              <div><dt>Facebook Page</dt><dd>{socialStatus.channels.facebook.configured ? "Configured" : "Not configured"} · {socialStatus.channels.facebook.paused ? "paused" : "enabled"}</dd></div>
              <div><dt>Facebook posts this month</dt><dd>{socialStatus.channels.facebook.verifiedThisMonth}</dd></div>
              <div><dt>Instagram professional</dt><dd>{socialStatus.channels.instagram.configured ? "Configured" : "Media/authorization pending"} · {socialStatus.channels.instagram.paused ? "paused" : "enabled"}</dd></div>
              <div><dt>Instagram posts this month</dt><dd>{socialStatus.channels.instagram.verifiedThisMonth}</dd></div>
            </dl>
            <label>
              Channel-control reason
              <input
                value={socialReason}
                onChange={(event) => setSocialReason(event.target.value)}
                placeholder="Why is this owned business channel changing?"
              />
            </label>
            <div className="button-row">
              {(["facebook", "instagram"] as const).map((channel) => {
                const control = socialStatus.channels[channel];
                const ready = socialStatus.globallyEnabled
                  && socialStatus.connectorConfigured
                  && control.configured;
                return control.paused ? (
                  <button
                    className="button button--secondary"
                    type="button"
                    key={channel}
                    disabled={pending || !ready || socialReason.trim().length < 10}
                    onClick={() => controlSocial(channel, false)}
                  >
                    Enable {channel}
                  </button>
                ) : (
                  <button
                    className="button button--secondary"
                    type="button"
                    key={channel}
                    disabled={pending || socialReason.trim().length < 10}
                    onClick={() => controlSocial(channel, true)}
                  >
                    Pause {channel}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </section>

      {feedback ? <p className="form-helper" role="status">{feedback}</p> : null}

      <section className="blog-agent-drafts" aria-labelledby="blog-agent-drafts-title">
        <div className="outreach-section-head">
          <div>
            <p className="eyebrow">Publication monitor</p>
            <h2 id="blog-agent-drafts-title">Agent-prepared articles and evidence</h2>
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
                  <span className="tag">revision {draft.revision}</span>
                  <span className="tag">{draft.riskClass} risk</span>
                  <span className="tag">{draft.publicationMode}</span>
                  <span className="tag">{draft.visibilityStatus}</span>
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
                  <span>{draft.runKey}</span>
                  <span>{draft.sourceManifestVersion}</span>
                  <span>{draft.model}</span>
                  <span>{localDate(draft.createdAt)}</span>
                  <span>Verification: {draft.publicationVerificationStatus ?? "not applicable"}</span>
                  <span>Policy: {draft.publicationPolicyVersion ?? "manual review"}</span>
                </div>
                <DraftReviewControls
                  draft={draft}
                  pending={pending}
                  onFeedback={finish}
                />
              </article>
            ))}
          </div>
        ) : (
          <div className="card empty-state">
            <CircleDollarSign aria-hidden="true" />
            <h3>No managed drafts yet</h3>
            <p>The daily schedule prepares at most one bounded article and either publishes it under the standing policy or keeps it private.</p>
          </div>
        )}
      </section>
    </div>
  );
}
