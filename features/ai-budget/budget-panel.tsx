import { CircleDollarSign, ExternalLink, ShieldCheck } from "lucide-react";
import {
  AI_WORKSTREAMS,
  WORKSTREAM_BUDGET_MICROS,
  type AiWorkstream,
  type AiWorkstreamBudgetStatus,
} from "./contracts";
import type { AiFleetBudgetDashboard } from "./queries";

const WORKSTREAM_LABELS: Record<AiWorkstream, string> = {
  website_greeting: "Website greeting",
  blog_writing: "Blog writing",
  growth_outreach: "Growth outreach + OCR",
  profile_drafting: "Profile drafting",
  customer_support: "Customer support",
  social_content: "Social content",
};

function formatUsd(micros: number) {
  return `$${(micros / 1_000_000).toFixed(2)}`;
}

function percentage(chargedMicros: number, budgetMicros: number) {
  if (budgetMicros === 0) return 0;
  return Math.min(100, (chargedMicros / budgetMicros) * 100);
}

function WorkstreamCard({ item }: { item: AiWorkstreamBudgetStatus }) {
  const blocked = item.budgetMicros === 0;

  return (
    <article className="ai-budget-workstream">
      <div className="ai-budget-workstream__head">
        <h3>{WORKSTREAM_LABELS[item.workstream]}</h3>
        <span className={`managed-agent-status${blocked ? " managed-agent-status--degraded" : ""}`}>
          {blocked ? "Blocked" : `${formatUsd(item.budgetMicros)} cap`}
        </span>
      </div>
      <div
        className="ai-budget-progress"
        {...(blocked
          ? { "aria-hidden": true }
          : {
              role: "progressbar",
              "aria-label": `${WORKSTREAM_LABELS[item.workstream]} budget used`,
              "aria-valuemin": 0,
              "aria-valuemax": item.budgetMicros,
              "aria-valuenow": item.chargedMicros,
            })}
      >
        <span style={{ width: `${percentage(item.chargedMicros, item.budgetMicros)}%` }} />
      </div>
      <dl className="ai-budget-workstream__metrics">
        <div><dt>Reserved / charged</dt><dd>{formatUsd(item.chargedMicros)}</dd></div>
        <div><dt>Remaining</dt><dd>{formatUsd(item.remainingMicros)}</dd></div>
        <div><dt>Calls</dt><dd>{item.calls}</dd></div>
      </dl>
      {item.failedCalls || item.pendingCalls ? (
        <p className="muted">{item.failedCalls} failed · {item.pendingCalls} pending</p>
      ) : null}
    </article>
  );
}

function unavailableWorkstreams(): AiWorkstreamBudgetStatus[] {
  return AI_WORKSTREAMS.map((workstream) => ({
    workstream,
    budgetMicros: WORKSTREAM_BUDGET_MICROS[workstream],
    chargedMicros: 0,
    remainingMicros: WORKSTREAM_BUDGET_MICROS[workstream],
    calls: 0,
    failedCalls: 0,
    pendingCalls: 0,
  }));
}

export function AiBudgetPanel({ dashboard }: { dashboard: AiFleetBudgetDashboard }) {
  const status = dashboard.available ? dashboard.status : null;
  const workstreams = status?.workstreams ?? unavailableWorkstreams();

  return (
    <section className="card ai-budget-panel" aria-labelledby="ai-budget-title">
      <div className="outreach-section-head">
        <div>
          <p className="eyebrow">Private fleet circuit breaker</p>
          <h2 id="ai-budget-title">AI token and cost ledger</h2>
          <p>
            Every Workers AI inference must reserve from this ledger before the model is called.
          </p>
        </div>
        <CircleDollarSign aria-hidden="true" />
      </div>

      {!status ? (
        <div className="form-error" role="status">
          Live ledger usage is unavailable until the AI fleet budget Agent binding is deployed. The approved caps below remain the application policy.
        </div>
      ) : (
        <>
          <div className="ai-budget-summary" aria-label="Monthly AI fleet budget">
            <div><span>UTC month</span><strong>{status.monthKey}</strong></div>
            <div><span>Fleet circuit breaker</span><strong>{formatUsd(status.fleetBudgetMicros)}</strong></div>
            <div><span>Reserved / charged</span><strong>{formatUsd(status.chargedMicros)}</strong></div>
            <div><span>Fleet headroom</span><strong>{formatUsd(status.remainingMicros)}</strong></div>
            <div><span>AI calls</span><strong>{status.calls}</strong></div>
            <div><span>Failed · pending</span><strong>{status.failedCalls} · {status.pendingCalls}</strong></div>
          </div>
          <div
            className="ai-budget-progress ai-budget-progress--fleet"
            role="progressbar"
            aria-label="Fleet monthly budget used"
            aria-valuemin={0}
            aria-valuemax={status.fleetBudgetMicros}
            aria-valuenow={status.chargedMicros}
          >
            <span style={{ width: `${percentage(status.chargedMicros, status.fleetBudgetMicros)}%` }} />
          </div>
          <p className="ai-budget-allocation">
            {formatUsd(status.allocatedBudgetMicros)} allocated · {formatUsd(status.unallocatedBudgetMicros)} unallocated and unavailable to agents
          </p>
        </>
      )}

      <div className="ai-budget-workstreams" aria-label="AI workstream allocations">
        {workstreams.map((item) => <WorkstreamCard key={item.workstream} item={item} />)}
      </div>

      <div className="managed-agent-boundary ai-budget-disclosure">
        <ShieldCheck size={18} aria-hidden="true" />
        <p>
          This is a conservative application ledger, not the Cloudflare invoice. It reserves the maximum priced request before inference. Workers AI free allocation and account-level billing can make invoiced spend lower. Cloudflare budget alerts notify; this application circuit breaker blocks calls.
        </p>
      </div>
      <div className="ai-budget-links">
        <a href="https://dash.cloudflare.com/?to=/:account/ai/workers-ai" target="_blank" rel="noreferrer">
          Workers AI dashboard <ExternalLink size={14} aria-hidden="true" />
        </a>
        <a href="https://dash.cloudflare.com/?to=/:account/billing/billable-usage" target="_blank" rel="noreferrer">
          Cloudflare billable usage <ExternalLink size={14} aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
