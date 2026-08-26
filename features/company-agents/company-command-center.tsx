"use client";

import { useState, useTransition } from "react";
import { BarChart3, BrainCircuit, ShieldCheck, Target } from "lucide-react";
import { reviewAiCompanyProposalAction } from "./actions";
import type {
  CompanyCommandCenterData,
  CompanyProposal,
} from "./queries";

function objectiveValue(
  metricKey: string,
  data: CompanyCommandCenterData,
) {
  if (!data.metrics) return 0;
  if (metricKey === "registered_users") return data.metrics.registeredUsers;
  if (metricKey === "activated_users") return data.metrics.activatedUsers;
  return data.metrics.monthlyActiveUsers;
}

function ProposalCard({
  proposal,
  configured,
}: {
  proposal: CompanyProposal;
  configured: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState("");
  const [reason, setReason] = useState("Reviewed against the aggregate evidence and current company objectives.");

  function decide(decision: "approved" | "rejected" | "escalated") {
    setFeedback("");
    startTransition(async () => {
      const result = await reviewAiCompanyProposalAction({
        proposalId: proposal.id,
        decision,
        expectedRevision: proposal.revision,
        reason,
        idempotencyKey: crypto.randomUUID(),
      });
      setFeedback(result.message);
      if (result.ok) window.location.reload();
    });
  }

  return (
    <article className="card company-proposal-card">
      <div className="company-proposal-card__meta">
        <span className={`managed-agent-status managed-agent-status--${proposal.priority}`}>
          {proposal.priority} priority
        </span>
        <span>{proposal.riskLevel} risk · {proposal.role.replaceAll("_", " ")}</span>
      </div>
      <h3>{proposal.title}</h3>
      <p>{proposal.summary}</p>
      <div className="tag-row" aria-label="Aggregate evidence">
        {Object.entries(proposal.evidence).slice(0, 5).map(([key, value]) => (
          <span className="tag" key={key}>{key}: {String(value)}</span>
        ))}
      </div>
      {proposal.state === "pending" ? (
        <div className="company-proposal-review">
          <label className="field">
            <span>Decision reason</span>
            <input
              value={reason}
              minLength={5}
              maxLength={1_000}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
          <div className="button-row">
            <button className="button" type="button" disabled={!configured || pending} onClick={() => decide("approved")}>Approve for backlog</button>
            <button className="button button--secondary" type="button" disabled={!configured || pending} onClick={() => decide("rejected")}>Reject</button>
            <button className="button button--secondary" type="button" disabled={!configured || pending} onClick={() => decide("escalated")}>Escalate</button>
          </div>
        </div>
      ) : (
        <p className="managed-agent-boundary">
          <ShieldCheck size={16} aria-hidden="true" />
          <span>{proposal.state}{proposal.reviewerReason ? ` · ${proposal.reviewerReason}` : ""}</span>
        </p>
      )}
      {feedback ? <p className="form-helper" role="status">{feedback}</p> : null}
    </article>
  );
}

export function CompanyCommandCenter(data: CompanyCommandCenterData) {
  const pendingProposals = data.proposals.filter(
    (proposal) => proposal.state === "pending",
  );
  const recentDecisions = data.proposals.filter(
    (proposal) => proposal.state !== "pending",
  ).slice(0, 8);
  return (
    <section className="company-command-center" aria-labelledby="company-command-center-title">
      <div className="outreach-section-head">
        <div>
          <p className="eyebrow">Human-governed operating company</p>
          <h2 id="company-command-center-title">AI company command center</h2>
          <p>Fifteen role-isolated Agents create aggregate, reviewable backlog proposals. Approval never executes an external action.</p>
        </div>
        <BrainCircuit aria-hidden="true" />
      </div>
      {!data.configured ? (
        <div className="form-error" role="status">
          The AI company is safely off. Apply the private migration, configure the shared Agent binding and processor secret, then enable both managed operations and AI company release controls.
        </div>
      ) : null}
      <div className="company-objective-grid">
        {data.objectives.map((objective) => {
          const current = objectiveValue(objective.metricKey, data);
          const progress = Math.min(100, Math.round((current / objective.targetValue) * 100));
          return (
            <article className="card company-objective-card" key={objective.id}>
              <Target aria-hidden="true" />
              <span>{objective.displayName}</span>
              <strong>{current.toLocaleString("en-IN")} / {objective.targetValue.toLocaleString("en-IN")}</strong>
              <progress value={progress} max={100}>{progress}%</progress>
              <small>{progress}% · deadline {new Date(objective.deadlineAt).toLocaleDateString("en-IN")}</small>
            </article>
          );
        })}
      </div>
      {data.metrics ? (
        <div className="card company-metrics-card">
          <div className="outreach-section-head">
            <div><h3>Latest aggregate snapshot</h3><p>Captured {new Date(data.metrics.capturedAt).toLocaleString("en-IN")}</p></div>
            <BarChart3 aria-hidden="true" />
          </div>
          <dl className="company-metrics-grid">
            <div><dt>Farmers</dt><dd>{data.metrics.registeredFarmers.toLocaleString("en-IN")}</dd></div>
            <div><dt>Buyers + wholesalers</dt><dd>{(data.metrics.registeredBuyers + data.metrics.registeredWholesalers).toLocaleString("en-IN")}</dd></div>
            <div><dt>Active listings</dt><dd>{data.metrics.activeListings.toLocaleString("en-IN")}</dd></div>
            <div><dt>Listings without enquiries</dt><dd>{data.metrics.activeListingsWithoutEnquiries.toLocaleString("en-IN")}</dd></div>
            <div><dt>Open support</dt><dd>{data.metrics.openSupportCases.toLocaleString("en-IN")}</dd></div>
            <div><dt>Pending reports</dt><dd>{data.metrics.pendingReports.toLocaleString("en-IN")}</dd></div>
          </dl>
          <p className="managed-agent-boundary"><ShieldCheck size={16} aria-hidden="true" /><span>Monthly active users is a trailing-30-day product-event proxy, not session telemetry. Snapshots contain counters only—no names, contacts, messages, support text or prompts.</span></p>
        </div>
      ) : (
        <div className="card company-metrics-card"><p>No aggregate snapshot has been recorded. Resume one company role and run a controlled cycle after both release gates pass.</p></div>
      )}
      <div className="company-proposal-section">
        <h3>Pending company proposals</h3>
        {pendingProposals.length ? (
          <div className="company-proposal-grid">
            {pendingProposals.map((proposal) => (
              <ProposalCard key={proposal.id} proposal={proposal} configured={data.configured} />
            ))}
          </div>
        ) : <p className="muted">No company proposals are waiting for review.</p>}
      </div>
      {recentDecisions.length ? (
        <div className="company-proposal-section">
          <h3>Recent backlog decisions</h3>
          <div className="company-proposal-grid">
            {recentDecisions.map((proposal) => (
              <ProposalCard key={proposal.id} proposal={proposal} configured={data.configured} />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
