"use client";

import { useState, useTransition } from "react";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import {
  reviewLiveActionAuthorizationAction,
  revokeLiveActionAuthorizationAction,
  setLiveAgentExecutorPauseAction,
} from "./actions";
import type {
  LiveActionAuthorizationSummary,
  LiveActionConsoleData,
  LiveAgentExecutorControl,
} from "./queries";

function displayExecutor(executor: string) {
  return executor.replaceAll("_", " ");
}

function hashPreview(value: string | null) {
  return value ? `${value.slice(0, 12)}…${value.slice(-8)}` : "none";
}

function ExecutorCard({
  control,
  canResume,
}: {
  control: LiveAgentExecutorControl;
  canResume: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState("");
  function update(paused: boolean) {
    setFeedback("");
    startTransition(async () => {
      const result = await setLiveAgentExecutorPauseAction({
        executor: control.executor,
        paused,
        dailyActionLimit: control.dailyActionLimit,
        monthlyActionLimit: control.monthlyActionLimit,
        dailySpendLimitPaise: control.dailySpendLimitPaise,
        monthlySpendLimitPaise: control.monthlySpendLimitPaise,
        canaryStage: control.canaryStage,
        reason: paused
          ? "Administrator emergency pause from the live-action console."
          : "Administrator resumed the reviewed executor configuration.",
        idempotencyKey: crypto.randomUUID(),
      });
      setFeedback(result.message);
      if (result.ok) window.location.reload();
    });
  }
  return (
    <article className="card">
      <div className="company-proposal-card__meta">
        <span className={`managed-agent-status managed-agent-status--${control.paused ? "critical" : "low"}`}>
          {control.paused ? "paused" : "eligible"}
        </span>
        <span>{control.shadowOnly ? "shadow only" : `canary ${control.canaryStage}`}</span>
      </div>
      <h3>{displayExecutor(control.executor)}</h3>
      <p>{control.dailyActionLimit}/day · {control.monthlyActionLimit}/month · spend ceiling ₹{(control.dailySpendLimitPaise / 100).toLocaleString("en-IN")}/day</p>
      <small>Reason {control.pauseReasonCode} · revision {control.revision}</small>
      <div className="button-row">
        {control.paused ? (
          <button className="button" type="button" disabled={!canResume || pending} onClick={() => update(false)}>Resume reviewed executor</button>
        ) : (
          <button className="button" type="button" disabled={pending} onClick={() => update(true)}>Pause immediately</button>
        )}
      </div>
      {feedback ? <p className="form-helper" role="status">{feedback}</p> : null}
    </article>
  );
}

function AuthorizationCard({
  authorization,
  canReview,
  canRevoke,
}: {
  authorization: LiveActionAuthorizationSummary;
  canReview: boolean;
  canRevoke: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [reason, setReason] = useState("Reviewed against the exact redacted scope, payload hash, expiry and executor caps.");
  const [feedback, setFeedback] = useState("");
  function review(decision: "approved" | "rejected") {
    setFeedback("");
    startTransition(async () => {
      const result = await reviewLiveActionAuthorizationAction({
        authorizationId: authorization.authorizationId,
        expectedRevision: authorization.revision,
        decision,
        reason,
        idempotencyKey: crypto.randomUUID(),
      });
      setFeedback(result.message);
      if (result.ok) window.location.reload();
    });
  }
  function revoke() {
    setFeedback("");
    startTransition(async () => {
      const result = await revokeLiveActionAuthorizationAction({
        authorizationId: authorization.authorizationId,
        expectedRevision: authorization.revision,
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
        <span className={`managed-agent-status managed-agent-status--${authorization.riskLevel === "critical" ? "critical" : authorization.riskLevel === "high" ? "high" : "medium"}`}>
          {authorization.riskLevel} risk
        </span>
        <span>tier {authorization.approvalTier} · canary {authorization.canaryStage}</span>
      </div>
      <h3>{authorization.actionType.replaceAll("_", " ")}</h3>
      <p>{displayExecutor(authorization.executor)} · {authorization.state} · approvals {authorization.approvalCount}/{authorization.requiredApprovals}</p>
      <p><small>Exact target scope: <code>{JSON.stringify(authorization.targetScope)}</code></small></p>
      <div className="tag-row" aria-label="Authorization limits">
        <span className="tag">max actions {authorization.maxActions}</span>
        <span className="tag">max spend ₹{(authorization.maxSpendPaise / 100).toLocaleString("en-IN")}</span>
        <span className="tag">attempt {authorization.latestAttemptState ?? "not started"}</span>
        <span className="tag">receipt {hashPreview(authorization.latestReceiptSha256)}</span>
        <span className="tag">scope {hashPreview(authorization.targetScopeSha256)}</span>
        <span className="tag">payload {hashPreview(authorization.payloadSha256)}</span>
      </div>
      <p><small>Valid {new Date(authorization.notBefore).toLocaleString("en-IN")} to {new Date(authorization.expiresAt).toLocaleString("en-IN")}</small></p>
      {authorization.state === "pending_approval" ? (
        <div className="company-proposal-review">
          <label className="field">
            <span>Independent review reason</span>
            <input value={reason} minLength={5} maxLength={1_000} onChange={(event) => setReason(event.target.value)} />
          </label>
          <div className="button-row">
            <button className="button" type="button" disabled={!canReview || pending} onClick={() => review("approved")}>Approve this authorization</button>
            <button className="button button--secondary" type="button" disabled={!canReview || pending} onClick={() => review("rejected")}>Reject</button>
          </div>
        </div>
      ) : null}
      {["authorized", "paused", "exhausted"].includes(authorization.state) ? (
        <div className="button-row">
          <button className="button button--secondary" type="button" disabled={!canRevoke || pending} onClick={revoke}>Revoke authorization</button>
        </div>
      ) : null}
      {feedback ? <p className="form-helper" role="status">{feedback}</p> : null}
    </article>
  );
}

export function LiveActionConsole(data: LiveActionConsoleData) {
  const foundationGates = data.applicationEnabled && data.releaseEnabled && data.runtimeBound;
  const dispatchReady = foundationGates && data.canaryReady;
  return (
    <section className="company-command-center" aria-labelledby="live-action-console-title">
      <div className="outreach-section-head">
        <div>
          <p className="eyebrow">Default-off execution boundary</p>
          <h2 id="live-action-console-title">Live-action control plane</h2>
          <p>Proposal approval is not execution. Every dispatch needs an exact, expiring authorization, budget reservation, scoped executor receipt and independent verification.</p>
        </div>
        {dispatchReady ? <ShieldCheck aria-label="Live dispatch readiness confirmed" /> : <ShieldAlert aria-label="Live dispatch is blocked" />}
      </div>
      <div className={dispatchReady ? "card" : "form-error"} role="status">
        Application gate: {data.applicationEnabled ? "on" : "off"} · database release: {data.releaseEnabled ? "on" : "off"} · runtime binding names: {data.runtimeBound ? "present" : "missing"} · restricted roles, connector registry and verifier: {data.canaryReady ? "verified" : "not implemented"}. {dispatchReady ? "Execution remains subject to each authorization and executor control." : "Live dispatch and executor resume are unavailable."}
      </div>
      {!data.available ? <p className="muted">Apply the private live-action migration to inspect controls. No production setting was changed.</p> : null}
      <div className="company-proposal-section">
        <h3>Per-executor kill switches</h3>
        <div className="company-objective-grid">
          {data.controls.map((control) => <ExecutorCard key={control.executor} control={control} canResume={dispatchReady} />)}
        </div>
      </div>
      <div className="company-proposal-section">
        <h3>Recent redacted authorizations</h3>
        <p className="managed-agent-boundary"><ShieldCheck size={16} aria-hidden="true" /><span>Target scope is limited to validated, non-contact identifiers and is also hashed; payload bodies are represented only by hashes. Recipient details, message bodies, credentials and provider tokens are never returned to this dashboard.</span></p>
        {data.authorizations.length ? (
          <div className="company-proposal-grid">
            {data.authorizations.map((authorization) => <AuthorizationCard key={authorization.authorizationId} authorization={authorization} canReview={foundationGates} canRevoke={data.available} />)}
          </div>
        ) : <p className="muted">No live-action authorization has been created.</p>}
      </div>
    </section>
  );
}
