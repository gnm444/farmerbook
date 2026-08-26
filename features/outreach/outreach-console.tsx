"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  buildManagedFarmerProfileSampleAction,
  discoverManagedFarmerProfileByNameAction,
} from "@/features/profile-agent/actions";
import {
  Bot,
  CheckCircle2,
  ExternalLink,
  FileSearch,
  History,
  PauseCircle,
  PlayCircle,
  RotateCcw,
  ShieldCheck,
  ShieldOff,
  Trash2,
} from "lucide-react";
import {
  loadOutreachProspectHistoryAction,
  privacyDeleteOutreachProspectAction,
  researchOutreachSourceAction,
  retryOutreachFailureAction,
  setOutreachDeliveryPauseAction,
  suppressOutreachProspectAction,
} from "./actions";
import type {
  OutreachDashboardSummary,
  OutreachFailure,
  OutreachHistoryItem,
  OutreachProspect,
  OutreachRuntimeHealth,
} from "./types";
import type { OutreachAutonomyReadiness } from "./autonomous-readiness";

const summaryCards: Array<[
  keyof OutreachDashboardSummary,
  string,
  string,
]> = [
  ["discovered", "Research queue", "Description or screenshot evidence recorded"],
  ["blocked", "Consent blocked", "No compliant consent path is available"],
  ["consented", "Verified consent", "Eligible for one introduction"],
  ["introduced", "Introduced", "Provider accepted the message"],
  ["onboarding", "Onboarding", "Participant began account setup"],
  ["joined", "Joined", "Participant completed FarmerBook onboarding"],
  ["optedOut", "Opted out", "Contact is suppressed from future delivery"],
];

function ProfileSampleControl({
  prospect,
  enabled,
}: {
  prospect: OutreachProspect;
  enabled: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState("");

  function buildSample() {
    setFeedback("");
    startTransition(async () => {
      const result = await buildManagedFarmerProfileSampleAction({
        prospectId: prospect.id,
        subjectName: prospect.businessName ?? undefined,
        idempotencyKey: crypto.randomUUID(),
      });
      if (!result.ok) {
        setFeedback(result.message);
        return;
      }
      setFeedback(
        `Private sample ready with ${result.data.sample.claims.length} cited detail${result.data.sample.claims.length === 1 ? "" : "s"}. It will be attached only to a consented invitation.`,
      );
      router.refresh();
    });
  }

  return (
    <div className="profile-sample-control">
      <button
        className="button button--secondary"
        type="button"
        disabled={
          !enabled ||
          isPending ||
          !["farmer", "unknown"].includes(prospect.suggestedRole)
        }
        onClick={buildSample}
      >
        <Bot size={15} aria-hidden="true" />
        {isPending ? "Building private sample…" : "Build Farmer profile sample"}
      </button>
      {feedback ? <p className="form-helper" role="status">{feedback}</p> : null}
    </div>
  );
}

function NameDiscoveryControl({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState("");
  const [failed, setFailed] = useState(false);

  function discover(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setFeedback("");
    setFailed(false);
    startTransition(async () => {
      const result = await discoverManagedFarmerProfileByNameAction({
        fullName: form.get("farmerName"),
        locationHint: form.get("locationHint") || undefined,
        farmingHint: form.get("farmingHint") || undefined,
        idempotencyKey: crypto.randomUUID(),
      });
      if (!result.ok) {
        setFailed(true);
        setFeedback(result.message);
        return;
      }
      setFeedback(
        `Private Not verified sample built from ${result.data.sourcesFound} agriculture-relevant Brave result${result.data.sourcesFound === 1 ? "" : "s"}. No contact or invitation was created without consent.`,
      );
      router.refresh();
    });
  }

  return (
    <section className="card outreach-name-search-card" aria-labelledby="name-discovery-title">
      <div className="outreach-section-head">
        <div>
          <p className="eyebrow">Approved name discovery</p>
          <h2 id="name-discovery-title">Find a Farmer and build the private sample</h2>
        </div>
        <Bot aria-hidden="true" />
      </div>
      <p className="muted">
        Brave Search returns at most five exact-name, agriculture-relevant public results. FarmerBook records citations and prepares the private sample automatically, but sends nothing until consent is verified.
      </p>
      {!enabled ? (
        <div className="form-error" role="status">
          Name discovery is off until the Brave secret, storage-rights confirmation, Worker flag and private database control are configured.
        </div>
      ) : null}
      <form className="outreach-name-search-form" onSubmit={discover}>
        <label className="field">
          <span>Farmer full name</span>
          <input name="farmerName" required minLength={2} maxLength={100} autoComplete="off" />
        </label>
        <label className="field">
          <span>District or state <em>optional, recommended for common names</em></span>
          <input name="locationHint" maxLength={120} autoComplete="off" />
        </label>
        <label className="field">
          <span>Crop or farming hint <em>optional</em></span>
          <input name="farmingHint" maxLength={120} autoComplete="off" />
        </label>
        {feedback ? (
          <div className={failed ? "form-error" : "form-success"} role={failed ? "alert" : "status"}>
            {feedback}
          </div>
        ) : null}
        <button className="button" type="submit" disabled={!enabled || isPending}>
          <FileSearch size={17} aria-hidden="true" />
          {isPending ? "Searching and building…" : "Find and build private sample"}
        </button>
      </form>
    </section>
  );
}

function readScreenshot(file: File) {
  return new Promise<string>((resolve, reject) => {
    if (file.size > 2_000_000) {
      reject(new Error("Upload a screenshot smaller than 2 MB."));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("The screenshot could not be read."));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  });
}

function DeliveryControls({
  health,
  enabled,
  readiness,
}: {
  health: OutreachRuntimeHealth;
  enabled: boolean;
  readiness: OutreachAutonomyReadiness;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [reason, setReason] = useState(health.pauseReason);
  const [feedback, setFeedback] = useState("");

  function updatePauseState() {
    setFeedback("");
    startTransition(async () => {
      const result = await setOutreachDeliveryPauseAction({
        paused: !health.deliveryPaused,
        reason,
        idempotencyKey: crypto.randomUUID(),
      });
      if (!result.ok) {
        setFeedback(result.message);
        return;
      }
      setFeedback(
        health.deliveryPaused
          ? "Delivery resumed. Only consented queued work can be claimed."
          : "Delivery paused. Webhooks and opt-outs remain active.",
      );
      router.refresh();
    });
  }

  return (
    <section className="card outreach-operations-card" aria-labelledby="outreach-delivery-title">
      <div className="outreach-section-head">
        <div>
          <p className="eyebrow">Emergency control</p>
          <h2 id="outreach-delivery-title">Delivery {health.deliveryPaused ? "paused" : "active"}</h2>
        </div>
        {health.deliveryPaused ? <PauseCircle aria-hidden="true" /> : <PlayCircle aria-hidden="true" />}
      </div>
      <p>{health.pauseReason}</p>
      {!readiness.ready ? (
        <div className="form-error" role="status">
          <strong>{readiness.code.replaceAll("_", " ")}</strong>
          <span>{readiness.action}</span>
        </div>
      ) : null}
      <div className="tag-row">
        <span className="tag">{health.pendingCount} pending</span>
        <span className="tag">{health.failedCount} failed</span>
        <span className="tag">
          Last delivery {health.lastDeliveredAt ? new Date(health.lastDeliveredAt).toLocaleString("en-IN") : "none"}
        </span>
        <span className="tag">
          Today {health.dailyAuthorizedCount}/{health.dailyDeliveryLimit} authorized
        </span>
      </div>
      {health.lastAutomaticStopCode ? (
        <p className="form-helper">
          Last automatic stop: {health.lastAutomaticStopCode.replaceAll("_", " ")}
          {health.lastAutomaticStopAt
            ? ` · ${new Date(health.lastAutomaticStopAt).toLocaleString("en-IN")}`
            : ""}
        </p>
      ) : null}
      <label className="field">
        <span>Operational reason</span>
        <input value={reason} onChange={(event) => setReason(event.target.value)} minLength={5} maxLength={500} />
      </label>
      {feedback ? <p className="form-helper" role="status">{feedback}</p> : null}
      <button
        className={`button ${health.deliveryPaused ? "" : "button--secondary"}`}
        type="button"
        disabled={!enabled || !readiness.ready || isPending || reason.trim().length < 5}
        onClick={updatePauseState}
      >
        {health.deliveryPaused ? <PlayCircle size={17} aria-hidden="true" /> : <PauseCircle size={17} aria-hidden="true" />}
        {isPending ? "Updating…" : health.deliveryPaused ? "Resume consented delivery" : "Pause all delivery"}
      </button>
    </section>
  );
}

function ProspectControls({ prospect }: { prospect: OutreachProspect }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [reason, setReason] = useState("Administrator privacy or safety review.");
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [history, setHistory] = useState<OutreachHistoryItem[] | null>(null);

  function runOperation(operation: "suppress" | "delete") {
    setFeedback("");
    startTransition(async () => {
      const action = operation === "suppress"
        ? suppressOutreachProspectAction
        : privacyDeleteOutreachProspectAction;
      const result = await action({
        targetId: prospect.id,
        reason,
        idempotencyKey: crypto.randomUUID(),
      });
      if (!result.ok) {
        setFeedback(result.message);
        return;
      }
      setFeedback(
        operation === "suppress"
          ? "Prospect suppressed; queued delivery and active consent ended."
          : "Research and contact content removed; the suppression hash was retained.",
      );
      router.refresh();
    });
  }

  function loadHistory() {
    setFeedback("");
    startTransition(async () => {
      const result = await loadOutreachProspectHistoryAction(prospect.id);
      if (!result.ok) {
        setFeedback(result.message);
        return;
      }
      setHistory(result.data);
    });
  }

  return (
    <details className="outreach-prospect-controls">
      <summary>Audit and privacy controls</summary>
      <label className="field">
        <span>Reason recorded in the immutable audit</span>
        <input value={reason} onChange={(event) => setReason(event.target.value)} minLength={5} maxLength={500} />
      </label>
      <div className="button-row">
        <button className="button button--secondary" type="button" disabled={isPending} onClick={loadHistory}>
          <History size={15} aria-hidden="true" /> View history
        </button>
        <button className="button button--secondary" type="button" disabled={isPending || reason.trim().length < 5} onClick={() => runOperation("suppress")}>
          <ShieldOff size={15} aria-hidden="true" /> Suppress
        </button>
      </div>
      <label className="form-check">
        <input type="checkbox" checked={deleteConfirmed} onChange={(event) => setDeleteConfirmed(event.target.checked)} />
        <span>I understand deletion removes research/contact content but retains the suppression hash and required consent/audit receipts.</span>
      </label>
      <button className="button button--secondary" type="button" disabled={isPending || !deleteConfirmed || reason.trim().length < 5} onClick={() => runOperation("delete")}>
        <Trash2 size={15} aria-hidden="true" /> Privacy delete
      </button>
      {feedback ? <p className="form-helper" role="status">{feedback}</p> : null}
      {history ? (
        <ol className="outreach-history-list">
          {history.map((item) => (
            <li key={`${item.historyType}-${item.eventType}-${item.occurredAt}`}>
              <strong>{item.eventType.replaceAll("_", " ")}</strong>
              <span>{item.summary}</span>
              <small>{new Date(item.occurredAt).toLocaleString("en-IN")}</small>
            </li>
          ))}
        </ol>
      ) : null}
    </details>
  );
}

function FailureRecovery({ failures }: { failures: OutreachFailure[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");

  function retry(failure: OutreachFailure) {
    setPendingId(failure.id);
    setFeedback("");
    void retryOutreachFailureAction({
      targetId: failure.id,
      reason: "Administrator reviewed this retryable provider failure.",
      idempotencyKey: crypto.randomUUID(),
    }).then((result) => {
      setPendingId(null);
      if (!result.ok) {
        setFeedback(result.message);
        return;
      }
      setFeedback("Retry queued. It remains subject to consent, expiry and attempt limits.");
      router.refresh();
    });
  }

  if (!failures.length) return null;
  return (
    <section className="card outreach-failure-card" aria-labelledby="outreach-failures-title">
      <div className="outreach-section-head">
        <div><p className="eyebrow">Retry-safe recovery</p><h2 id="outreach-failures-title">Failed deliveries</h2></div>
        <RotateCcw aria-hidden="true" />
      </div>
      {feedback ? <p className="form-helper" role="status">{feedback}</p> : null}
      <ul className="outreach-failure-list">
        {failures.map((failure) => (
          <li key={failure.id}>
            <div>
              <strong>{failure.businessName ?? "Unnamed prospect"}</strong>
              <span>{failure.purpose.replaceAll("_", " ")} · {failure.failureCode ?? "unknown failure"} · attempt {failure.attempts}/5</span>
            </div>
            <button className="button button--secondary" type="button" disabled={pendingId !== null || failure.attempts >= 5 || new Date(failure.expiresAt) <= new Date()} onClick={() => retry(failure)}>
              <RotateCcw size={14} aria-hidden="true" /> {pendingId === failure.id ? "Queuing…" : "Retry once"}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function OutreachConsole({
  prospects,
  summary,
  health,
  failures,
  readiness,
  enabled,
  profileAgentEnabled = false,
  nameSearchEnabled = false,
}: {
  prospects: OutreachProspect[];
  summary: OutreachDashboardSummary;
  health: OutreachRuntimeHealth;
  failures: OutreachFailure[];
  readiness: OutreachAutonomyReadiness;
  enabled: boolean;
  profileAgentEnabled?: boolean;
  nameSearchEnabled?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError("");
    setNotice("");
    startTransition(async () => {
      try {
        const screenshot = fileInput.current?.files?.[0];
        const screenshotDataUrl = screenshot
          ? await readScreenshot(screenshot)
          : undefined;
        const result = await researchOutreachSourceAction({
          sourceUrl: form.get("sourceUrl"),
          businessName: form.get("businessName") || undefined,
          description: form.get("description") || undefined,
          screenshotDataUrl,
          sourcePermissionConfirmed:
            form.get("sourcePermissionConfirmed") === "on",
          idempotencyKey: crypto.randomUUID(),
        });
        if (!result.ok) {
          setError(result.message);
          return;
        }
        setNotice(
          `Prospect saved. ${result.data.contactsFound} visible contact candidate${result.data.contactsFound === 1 ? "" : "s"} found; consent is still required before contact.`,
        );
        router.refresh();
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "The source could not be analyzed.",
        );
      }
    });
  }

  return (
    <div className="outreach-console">
      <section className="outreach-summary" aria-label="Acquisition funnel summary">
        {summaryCards.map(([key, label, description]) => (
          <article className="card outreach-summary__card" key={key}>
            <strong>{summary[key]}</strong>
            <span>{label}</span>
            <small>{description}</small>
          </article>
        ))}
      </section>

      <DeliveryControls
        health={health}
        enabled={enabled}
        readiness={readiness}
      />
      <FailureRecovery failures={failures} />
      <NameDiscoveryControl enabled={nameSearchEnabled} />

      <div className="admin-grid outreach-admin-grid">
        <section className="card outreach-research-card">
          <div className="outreach-section-head">
            <div>
              <p className="eyebrow">Bounded research</p>
              <h2>Analyze a business source</h2>
            </div>
            <FileSearch aria-hidden="true" />
          </div>
          <p className="muted">
            Websites may be read through the safe fetcher. For YouTube or social links, paste the visible description or upload a screenshot; FarmerBook does not scrape profiles.
          </p>
          {!enabled ? (
            <div className="form-error" role="status">
              The Worker flag and private database release control must both be enabled before this console can run.
            </div>
          ) : null}
          <form className="outreach-research-form" onSubmit={submit}>
            <label className="field">
              <span>Public source URL</span>
              <input name="sourceUrl" type="url" placeholder="https://…" required maxLength={2048} />
            </label>
            <label className="field">
              <span>Farm or business name <em>optional</em></span>
              <input name="businessName" maxLength={120} />
            </label>
            <label className="field">
              <span>Visible description <em>required for social sources unless a screenshot is supplied</em></span>
              <textarea name="description" rows={7} maxLength={8000} />
            </label>
            <label className="field">
              <span>Screenshot <em>PNG, JPEG or WebP; maximum 2 MB</em></span>
              <input ref={fileInput} name="screenshot" type="file" accept="image/png,image/jpeg,image/webp" />
            </label>
            <label className="consent-check">
              <input name="sourcePermissionConfirmed" type="checkbox" required />
              <span>
                I confirm this is public business-enquiry material that I may submit. A visible contact is evidence only, never consent.
              </span>
            </label>
            {error ? <div className="form-error" role="alert">{error}</div> : null}
            {notice ? <div className="form-success" role="status">{notice}</div> : null}
            <button className="button" type="submit" disabled={!enabled || isPending}>
              <Bot size={17} aria-hidden="true" />
              {isPending ? "Analyzing safely…" : "Analyze and save"}
            </button>
          </form>
        </section>

        <aside className="outreach-guardrails">
          <section className="card context-card">
            <ShieldCheck size={25} aria-hidden="true" />
            <h2>Autonomy boundary</h2>
            <p>
              The agent may classify, draft and queue. Delivery requires a current channel- and purpose-specific consent receipt. Withdrawals cancel queued work and suppress the contact hash.
            </p>
          </section>
          <section className="card context-card">
            <CheckCircle2 size={25} aria-hidden="true" />
            <h2>Fail-closed delivery</h2>
            <p>
              If the verified-consent or delivery provider is missing, invalid or unavailable, the worker sends nothing.
            </p>
          </section>
        </aside>
      </div>

      <section className="outreach-prospects" aria-labelledby="outreach-prospects-title">
        <div className="outreach-section-head">
          <div>
            <p className="eyebrow">Private prospect ledger</p>
            <h2 id="outreach-prospects-title">Recent prospects</h2>
          </div>
          <span className="badge">{prospects.length} records</span>
        </div>
        {prospects.length ? (
          <div className="outreach-prospect-grid">
            {prospects.map((prospect) => (
              <article className="card outreach-prospect-card" key={prospect.id}>
                <div className="report-head">
                  <span className="badge">{prospect.status.replaceAll("_", " ")}</span>
                  <span className="muted">revision {prospect.revision}</span>
                </div>
                <h3>{prospect.businessName ?? "Unnamed agriculture prospect"}</h3>
                <p className="muted">
                  {prospect.suggestedRole.replaceAll("_", " ")} · {prospect.preferredLocale}
                </p>
                {prospect.introductionDraft ? <p>{prospect.introductionDraft}</p> : null}
                <div className="tag-row">
                  {prospect.categorySlugs.map((slug) => <span className="tag" key={slug}>{slug}</span>)}
                </div>
                <a className="text-link" href={prospect.sourceUrl} target="_blank" rel="noreferrer">
                  View submitted source <ExternalLink size={13} aria-hidden="true" />
                </a>
                <small className="muted">
                  Contact details stay private and are never rendered in this console.
                </small>
                <ProfileSampleControl
                  prospect={prospect}
                  enabled={profileAgentEnabled}
                />
                <ProspectControls prospect={prospect} />
              </article>
            ))}
          </div>
        ) : (
          <section className="card empty-state">
            <div>
              <FileSearch size={30} aria-hidden="true" />
              <h3>No prospects recorded</h3>
              <p>Analyze an approved source to start the consent-first funnel.</p>
            </div>
          </section>
        )}
      </section>
    </div>
  );
}
