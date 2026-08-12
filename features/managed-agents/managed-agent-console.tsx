"use client";

import { useState, useTransition } from "react";
import {
  Activity,
  Bot,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { manageManagedAgentAction } from "./actions";
import type {
  ManagedAgentDashboardItem,
  ManagedAgentRecentRun,
} from "./queries";

function intervalLabel(seconds: number) {
  if (seconds % 86_400 === 0) return `every ${seconds / 86_400} day`;
  if (seconds % 3_600 === 0) return `every ${seconds / 3_600} hour`;
  return `every ${seconds / 60} minutes`;
}

function AgentCard({ agent, configured }: {
  agent: ManagedAgentDashboardItem;
  configured: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState("");

  function command(
    operation: "resume" | "pause" | "run_now",
    form: HTMLFormElement,
  ) {
    const data = new FormData(form);
    setFeedback("");
    startTransition(async () => {
      const result = await manageManagedAgentAction({
        role: agent.role,
        operation,
        intervalSeconds: Number(data.get("intervalSeconds")),
        maxItemsPerRun: Number(data.get("maxItemsPerRun")),
        reason: data.get("reason"),
        idempotencyKey: crypto.randomUUID(),
      });
      setFeedback(result.message);
      if (result.ok) window.location.reload();
    });
  }

  return (
    <article className="card managed-agent-card">
      <div className="managed-agent-card__head">
        <span className={`managed-agent-status managed-agent-status--${agent.runtimeState}`}>
          {agent.runtimeState}
        </span>
        <Bot aria-hidden="true" />
      </div>
      <h2>{agent.displayName}</h2>
      <p>{agent.description}</p>
      <div className="tag-row">
        <span className="tag">{intervalLabel(agent.intervalSeconds)}</span>
        <span className="tag">max {agent.maxItemsPerRun}/run</span>
        <span className="tag">{agent.runsLast24Hours} runs/24h</span>
      </div>
      <p className="managed-agent-boundary">
        <ShieldCheck size={16} aria-hidden="true" />
        <span>{agent.boundary}</span>
      </p>
      <dl className="managed-agent-metrics">
        <div><dt>Last run</dt><dd>{agent.lastRunAt ? new Date(agent.lastRunAt).toLocaleString("en-IN") : "Never"}</dd></div>
        <div><dt>24h results</dt><dd>{agent.successesLast24Hours} successful · {agent.failuresLast24Hours} unsuccessful</dd></div>
        <div><dt>Failure streak</dt><dd>{agent.consecutiveFailures}/3{agent.lastFailureCode ? ` · ${agent.lastFailureCode}` : ""}</dd></div>
      </dl>
      <form className="managed-agent-controls" onSubmit={(event) => event.preventDefault()}>
        <label className="field">
          <span>Schedule interval (seconds)</span>
          <input name="intervalSeconds" type="number" min={300} max={604800} defaultValue={agent.intervalSeconds} />
        </label>
        <label className="field">
          <span>Maximum items per run</span>
          <input name="maxItemsPerRun" type="number" min={1} max={25} defaultValue={agent.maxItemsPerRun} />
        </label>
        <label className="field managed-agent-controls__reason">
          <span>Audit reason</span>
          <input name="reason" minLength={5} maxLength={500} defaultValue="Administrator managed operations review." />
        </label>
        <div className="button-row">
          <button
            className="button"
            type="button"
            disabled={!configured || pending || agent.enabled}
            onClick={(event) => command("resume", event.currentTarget.form!)}
          >
            <PlayCircle size={16} aria-hidden="true" /> Resume
          </button>
          <button
            className="button button--secondary"
            type="button"
            disabled={!configured || pending || !agent.enabled}
            onClick={(event) => command("run_now", event.currentTarget.form!)}
          >
            <RefreshCw size={16} aria-hidden="true" /> Run now
          </button>
          <button
            className="button button--secondary"
            type="button"
            disabled={!configured || pending || !agent.enabled}
            onClick={(event) => command("pause", event.currentTarget.form!)}
          >
            <PauseCircle size={16} aria-hidden="true" /> Pause
          </button>
        </div>
      </form>
      {feedback ? <p className="form-helper" role="status">{feedback}</p> : null}
    </article>
  );
}

export function ManagedAgentConsole({ agents, recentRuns, configured }: {
  agents: ManagedAgentDashboardItem[];
  recentRuns: ManagedAgentRecentRun[];
  configured: boolean;
}) {
  return (
    <div className="managed-agent-console">
      {!configured ? (
        <div className="form-error" role="status">
          The fleet is safely off. Apply the private migration, set the Worker secret, enable the application flag and then enable the private database control before initializing schedules.
        </div>
      ) : null}
      <section className="managed-agent-grid" aria-label="Managed operations roles">
        {agents.map((agent) => (
          <AgentCard key={agent.role} agent={agent} configured={configured} />
        ))}
      </section>
      <section className="card managed-agent-runs" aria-labelledby="managed-agent-runs-title">
        <div className="outreach-section-head">
          <div>
            <p className="eyebrow">Immutable operations evidence</p>
            <h2 id="managed-agent-runs-title">Recent managed runs</h2>
          </div>
          <Activity aria-hidden="true" />
        </div>
        {recentRuns.length ? (
          <ol>
            {recentRuns.map((run) => (
              <li key={run.id}>
                <div>
                  <strong>{run.role.replaceAll("_", " ")}</strong>
                  <span>{run.triggerType} · {run.state}</span>
                </div>
                <span>{run.succeededCount} succeeded · {run.failedCount} failed · {new Date(run.startedAt).toLocaleString("en-IN")}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="muted">No managed runs have been recorded.</p>
        )}
      </section>
    </div>
  );
}
