"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import {
  CheckCircle2,
  Clipboard,
  FileCheck2,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import type { SupportedLocale } from "@/lib/i18n/locales";
import {
  createSocialCampaignBriefAction,
  reviewAgentActionProposalAction,
} from "./actions";
import type {
  AgentActionProposal,
  SocialCampaignBrief,
  SupportCase,
} from "./types";

const socialPlatforms: ReadonlyArray<{
  value: SocialCampaignBrief["platform"];
  label: string;
}> = [
  { value: "linkedin", label: "LinkedIn" },
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "x", label: "X" },
];

type OperationsConsoleProps = {
  supportCases: SupportCase[];
  socialBriefs: SocialCampaignBrief[];
  pendingProposals: AgentActionProposal[];
  actionedProposals: AgentActionProposal[];
  locale: SupportedLocale;
  enabled: boolean;
  configured: boolean;
};

function proposalTitle(
  proposal: AgentActionProposal,
  supportCases: SupportCase[],
  socialBriefs: SocialCampaignBrief[],
) {
  if (proposal.actionType === "support_reply") {
    return (
      supportCases.find((supportCase) => supportCase.id === proposal.targetId)
        ?.subject ?? "Support reply"
    );
  }
  const brief = socialBriefs.find((candidate) => candidate.id === proposal.targetId);
  return brief ? `${brief.platform.toUpperCase()} · ${brief.objective}` : "Social draft";
}

function proposalContext(
  proposal: AgentActionProposal,
  supportCases: SupportCase[],
  socialBriefs: SocialCampaignBrief[],
) {
  if (proposal.actionType === "support_reply") {
    const supportCase = supportCases.find(
      (candidate) => candidate.id === proposal.targetId,
    );
    return supportCase?.question ?? "The original support question is unavailable.";
  }
  const brief = socialBriefs.find((candidate) => candidate.id === proposal.targetId);
  if (!brief) return "The original campaign brief is unavailable.";
  return `Audience: ${brief.audience}\nSource facts: ${brief.sourceFacts}\nCall to action: ${brief.callToAction}`;
}

function metadataReasons(metadata: Record<string, unknown>) {
  const value = metadata.escalationReasons ?? metadata.escalation_reasons;
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function ProposalReviewCard({
  proposal,
  supportCases,
  socialBriefs,
}: {
  proposal: AgentActionProposal;
  supportCases: SupportCase[];
  socialBriefs: SocialCampaignBrief[];
}) {
  const router = useRouter();
  const [content, setContent] = useState(
    proposal.finalContent ?? proposal.draftContent,
  );
  const [reason, setReason] = useState("");
  const [feedback, setFeedback] = useState("");
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();
  const reasons = metadataReasons(proposal.metadata);

  function decide(decision: "approved" | "rejected" | "escalated") {
    setFeedback("");
    setFailed(false);
    if (decision === "approved" && !content.trim()) {
      setFailed(true);
      setFeedback("Approved content cannot be empty.");
      return;
    }
    if (!reason.trim()) {
      setFailed(true);
      setFeedback("Add a reviewer reason before recording this decision.");
      return;
    }
    startTransition(async () => {
      const result = await reviewAgentActionProposalAction({
        proposalId: proposal.id,
        decision,
        expectedRevision: proposal.revision,
        content: decision === "approved" ? content.trim() : null,
        reason: reason.trim(),
        idempotencyKey: crypto.randomUUID(),
      });
      if (!result.ok) {
        setFailed(true);
        setFeedback(result.message);
        return;
      }
      setFeedback(
        proposal.actionType === "social_post" && decision === "approved"
          ? "Copy ready."
          : `Review recorded: ${decision}.`,
      );
      router.refresh();
    });
  }

  return (
    <article className="card report-card customer-operations-proposal">
      <div className="report-head customer-operations-proposal__head">
        <div>
          <span className={`badge customer-operations-risk customer-operations-risk--${proposal.riskLevel}`}>
            {proposal.riskLevel} risk
          </span>
          <h3>{proposalTitle(proposal, supportCases, socialBriefs)}</h3>
        </div>
        <span className="muted">
          Revision {proposal.revision} · {proposal.actionType === "support_reply" ? "Support" : "Social"}
        </span>
      </div>

      <details className="customer-operations-proposal__context">
        <summary>Original request and verified facts</summary>
        <p className="muted" dir="auto" style={{ whiteSpace: "pre-wrap" }}>
          {proposalContext(proposal, supportCases, socialBriefs)}
        </p>
      </details>

      {reasons.length ? (
        <div className="notice customer-operations-proposal__reasons">
          <strong>Escalation signals</strong>
          <ul>
            {reasons.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <label className="field">
        <span className="field-label">Editable reviewed content</span>
        <textarea
          className="textarea customer-operations-proposal__content"
          rows={9}
          maxLength={6_000}
          value={content}
          disabled={pending}
          onChange={(event) => setContent(event.target.value)}
        />
      </label>
      <label className="field">
        <span className="field-label">Reviewer reason</span>
        <textarea
          className="textarea"
          rows={3}
          maxLength={1_000}
          value={reason}
          disabled={pending}
          placeholder="Required for every decision"
          onChange={(event) => setReason(event.target.value)}
        />
      </label>

      <dl className="customer-operations-proposal__metadata">
        <div>
          <dt>Model</dt>
          <dd>{proposal.model}</dd>
        </div>
        <div>
          <dt>Prompt version</dt>
          <dd>{proposal.promptVersion}</dd>
        </div>
      </dl>

      <div className="report-actions customer-operations-proposal__actions">
        <button
          className="button"
          type="button"
          disabled={pending}
          onClick={() => decide("approved")}
        >
          <CheckCircle2 size={16} aria-hidden="true" /> Approve
        </button>
        <button
          className="button button--secondary"
          type="button"
          disabled={pending}
          onClick={() => decide("rejected")}
        >
          <XCircle size={16} aria-hidden="true" /> Reject
        </button>
        <button
          className="button button--ghost"
          type="button"
          disabled={pending}
          onClick={() => decide("escalated")}
        >
          <ShieldAlert size={16} aria-hidden="true" /> Escalate
        </button>
      </div>
      {feedback ? (
        <p className={failed ? "form-error" : "form-success"} role={failed ? "alert" : "status"}>
          {feedback}
        </p>
      ) : null}
    </article>
  );
}

function ReviewedProposalCard({ proposal }: { proposal: AgentActionProposal }) {
  const [copyState, setCopyState] = useState("");
  const copyReady =
    proposal.actionType === "social_post" && proposal.state === "approved";
  const content = proposal.finalContent ?? proposal.draftContent;

  async function copyContent() {
    try {
      await navigator.clipboard.writeText(content);
      setCopyState("Copied to clipboard.");
    } catch {
      setCopyState("Copy failed. Select the reviewed content and copy it manually.");
    }
  }

  const stateLabel = copyReady
    ? "Copy ready"
    : proposal.state === "approved"
      ? "Approved"
      : proposal.state === "rejected"
        ? "Rejected"
        : "Escalated";

  return (
    <article className="card report-card customer-operations-reviewed-proposal">
      <div className="report-head">
        <span className="badge">{stateLabel}</span>
        <span className="muted">
          {proposal.actionType === "support_reply" ? "Support" : "Social"} · revision {proposal.revision}
        </span>
      </div>
      <p dir="auto" style={{ whiteSpace: "pre-wrap" }}>{content}</p>
      <p className="muted">
        {proposal.model} · prompt {proposal.promptVersion} · {proposal.riskLevel} risk
      </p>
      {copyReady ? (
        <div className="report-actions">
          <button className="button button--secondary" type="button" onClick={copyContent}>
            <Clipboard size={16} aria-hidden="true" /> Copy approved draft
          </button>
          {copyState ? <span role="status">{copyState}</span> : null}
        </div>
      ) : null}
    </article>
  );
}

export function OperationsConsole({
  supportCases,
  socialBriefs,
  pendingProposals,
  actionedProposals,
  locale,
  enabled,
  configured,
}: OperationsConsoleProps) {
  const router = useRouter();
  const [platform, setPlatform] = useState<SocialCampaignBrief["platform"]>(
    "linkedin",
  );
  const [audience, setAudience] = useState("");
  const [objective, setObjective] = useState("");
  const [sourceFacts, setSourceFacts] = useState("");
  const [callToAction, setCallToAction] = useState("");
  const [feedback, setFeedback] = useState("");
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  function createBrief(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback("");
    setFailed(false);
    startTransition(async () => {
      const result = await createSocialCampaignBriefAction({
        platform,
        locale,
        audience,
        objective,
        sourceFacts,
        callToAction,
        idempotencyKey: crypto.randomUUID(),
      });
      if (!result.ok) {
        setFailed(true);
        setFeedback(result.message);
        return;
      }
      setAudience("");
      setObjective("");
      setSourceFacts("");
      setCallToAction("");
      setFeedback("Brief queued for supervised drafting.");
      router.refresh();
    });
  }

  return (
    <div className="customer-operations-admin">
      {!enabled ? (
        <p className="notice" role="status">
          The support and social drafting pilot is disabled in this deployment.
        </p>
      ) : !configured ? (
        <p className="notice" role="status">
          The pilot is safely unavailable until its private data store and worker are configured.
        </p>
      ) : null}

      <section className="admin-grid customer-operations-admin__overview" aria-label="Queue overview">
        <article className="card context-card">
          <strong>{supportCases.length}</strong>
          <span>Support cases</span>
        </article>
        <article className="card context-card">
          <strong>{socialBriefs.length}</strong>
          <span>Campaign briefs</span>
        </article>
        <article className="card context-card">
          <strong>{pendingProposals.length}</strong>
          <span>Awaiting review</span>
        </article>
      </section>

      <section className="card settings-card customer-operations-brief" aria-labelledby="campaign-brief-title">
        <div className="outreach-section-head">
          <div>
            <p className="eyebrow">Owned-channel content</p>
            <h2 id="campaign-brief-title">Create a social campaign brief</h2>
          </div>
          <FileCheck2 aria-hidden="true" />
        </div>
        <p className="muted">
          Provide verified source facts. Approval produces copy that an administrator can copy and use outside this queue.
        </p>
        <form className="form-stack customer-operations-brief__form" onSubmit={createBrief}>
          <label className="field">
            <span className="field-label">Platform</span>
            <select
              className="select"
              value={platform}
              disabled={!configured || pending}
              onChange={(event) =>
                setPlatform(event.target.value as SocialCampaignBrief["platform"])
              }
            >
              {socialPlatforms.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Audience</span>
            <input className="input" minLength={5} maxLength={1_000} required value={audience} disabled={!configured || pending} onChange={(event) => setAudience(event.target.value)} />
          </label>
          <label className="field">
            <span className="field-label">Objective</span>
            <textarea className="textarea" rows={3} minLength={10} maxLength={2_000} required value={objective} disabled={!configured || pending} onChange={(event) => setObjective(event.target.value)} />
          </label>
          <label className="field">
            <span className="field-label">Verified source facts</span>
            <textarea className="textarea" rows={5} minLength={10} maxLength={8_000} required value={sourceFacts} disabled={!configured || pending} onChange={(event) => setSourceFacts(event.target.value)} />
          </label>
          <label className="field">
            <span className="field-label">Call to action</span>
            <input className="input" minLength={5} maxLength={1_000} required value={callToAction} disabled={!configured || pending} onChange={(event) => setCallToAction(event.target.value)} />
          </label>
          <button className="button" type="submit" disabled={!configured || pending}>
            {pending ? "Creating…" : "Create brief"}
          </button>
        </form>
        {feedback ? (
          <p className={failed ? "form-error" : "form-success"} role={failed ? "alert" : "status"}>{feedback}</p>
        ) : null}
      </section>

      <section className="customer-operations-admin__pending" aria-labelledby="pending-review-title">
        <div className="outreach-section-head">
          <div>
            <p className="eyebrow">Human approval boundary</p>
            <h2 id="pending-review-title">Pending proposals</h2>
          </div>
        </div>
        {pendingProposals.length ? (
          <div className="customer-operations-admin__proposal-list">
            {pendingProposals.map((proposal) => (
              <ProposalReviewCard
                key={proposal.id}
                proposal={proposal}
                supportCases={supportCases}
                socialBriefs={socialBriefs}
              />
            ))}
          </div>
        ) : (
          <section className="card empty-state"><div><h2>Review queue clear</h2><p>No proposals currently need a decision.</p></div></section>
        )}
      </section>

      <section className="customer-operations-admin__reviewed" aria-labelledby="reviewed-title">
        <div className="outreach-section-head"><div><p className="eyebrow">Decision history</p><h2 id="reviewed-title">Reviewed proposals</h2></div></div>
        {actionedProposals.length ? (
          <div className="customer-operations-admin__proposal-list">
            {actionedProposals.map((proposal) => <ReviewedProposalCard key={proposal.id} proposal={proposal} />)}
          </div>
        ) : (
          <section className="card empty-state"><div><h2>No reviewed proposals</h2><p>Completed decisions will appear here.</p></div></section>
        )}
      </section>
    </div>
  );
}
