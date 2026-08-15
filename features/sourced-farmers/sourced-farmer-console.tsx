"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  Clock3,
  Database,
  ExternalLink,
  FilePlus2,
  Play,
  Search,
  ShieldAlert,
  Video,
} from "lucide-react";
import {
  createSourcedFarmerProfileAction,
  runSourcedFarmerDiscoveryAction,
} from "./actions";
import type {
  SourcedFarmerDashboard,
  TransientSourcedVideo,
} from "./types";
import { AGRICULTURE_TOPIC_SLUGS } from "./types";

const PRIVATE_NOTICE =
  "Private research · not a FarmerBook member · not verified · no contact or outreach consent.";

type Notice = { kind: "success" | "error"; message: string } | null;

function readableDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function humanize(value: string) {
  return value.replaceAll("_", " ").replaceAll("-", " ");
}

export function SourcedFarmerConsole({
  dashboard,
  youtubeConfigured,
  initialFilters,
}: {
  dashboard: SourcedFarmerDashboard;
  youtubeConfigured: boolean;
  initialFilters: { q: string; review: string };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<Notice>(null);
  const [transientVideos, setTransientVideos] = useState<TransientSourcedVideo[]>([]);
  const visibleProfiles = dashboard.profiles;
  const previousPage = Math.max(1, dashboard.pagination.page - 1);
  const hasNextPage = dashboard.pagination.page * dashboard.pagination.pageSize <
    dashboard.pagination.total;

  function profilePageHref(page: number) {
    const parameters = new URLSearchParams();
    if (initialFilters.q) parameters.set("q", initialFilters.q);
    if (initialFilters.review) parameters.set("review", initialFilters.review);
    if (page > 1) parameters.set("page", String(page));
    const query = parameters.toString();
    return query ? `/admin/sourced-farmers?${query}` : "/admin/sourced-farmers";
  }

  if (!dashboard.configured) {
    return (
      <section className="card empty-state sourced-farmers-empty">
        <ShieldAlert aria-hidden="true" />
        <div>
          <h2>Private sourced research is off</h2>
          <p>
            Enable the application and database release controls before reading
            or running this founder-only workspace.
          </p>
          <p className="muted">{PRIVATE_NOTICE}</p>
        </div>
      </section>
    );
  }

  function runBatch(formElement: HTMLFormElement) {
    const form = new FormData(formElement);
    setNotice(null);
    setTransientVideos([]);
    startTransition(async () => {
      const input = {
        channelSeed: form.get("channelSeed"),
        idempotencyKey: crypto.randomUUID(),
      } as Parameters<typeof runSourcedFarmerDiscoveryAction>[0];
      const result = await runSourcedFarmerDiscoveryAction(input);
      if (!result.ok) {
        setNotice({
          kind: "error",
          message: result.message ?? "The bounded discovery run could not start.",
        });
        return;
      }
      setTransientVideos(result.data.transientSources);
      setNotice({
        kind: "success",
        message: `${result.data.savedVideoCount} anonymous source records saved. ${result.data.transientSources.length} contact-free videos are shown transiently${result.data.nextPageAvailable ? "; another bounded batch is available" : "; the checkpoint is current"}.`,
      });
      router.refresh();
    });
  }

  function createProfile(formElement: HTMLFormElement) {
    const form = new FormData(formElement);
    const evidenceBasis = String(form.get("evidenceBasis") ?? "");
    const topicSlugs = form
      .getAll("topicSlugs")
      .map((value) => String(value));
    setNotice(null);
    startTransition(async () => {
      const input = {
        displayName: form.get("displayName"),
        district: form.get("district") || undefined,
        state: form.get("state") || undefined,
        summary: form.get("summary"),
        topicSlugs,
        evidenceBasis,
        evidenceUrl: form.get("evidenceUrl") || undefined,
        consentReference: form.get("consentReference") || undefined,
        facts: [
          {
            factType: form.get("factType"),
            value: form.get("factValue"),
            sourceUrl: form.get("evidenceUrl") || undefined,
            evidenceExcerpt: form.get("evidenceExcerpt"),
          },
        ],
        operatorAttested: form.get("operatorAttested") === "on",
        revision: 0,
        idempotencyKey: crypto.randomUUID(),
      } as Parameters<typeof createSourcedFarmerProfileAction>[0];
      const result = await createSourcedFarmerProfileAction(input);
      if (!result.ok) {
        setNotice({
          kind: "error",
          message: result.message ?? "The private evidence profile was not created.",
        });
        return;
      }
      setNotice({ kind: "success", message: "Private evidence profile created." });
      formElement.reset();
      router.push(`/admin/sourced-farmers/${result.data.id}`);
      router.refresh();
    });
  }

  return (
    <div className="sourced-farmer-console">
      <section className="card sourced-farmer-boundary" role="note">
        <ShieldAlert aria-hidden="true" />
        <div>
          <strong>{PRIVATE_NOTICE}</strong>
          <p>
            YouTube descriptions are contact-redacted and transient. A durable
            named record requires documented subject consent or independently
            reviewed non-YouTube evidence.
          </p>
        </div>
      </section>

      {notice ? (
        <p
          className={notice.kind === "error" ? "form-error" : "form-success"}
          role={notice.kind === "error" ? "alert" : "status"}
        >
          {notice.message}
        </p>
      ) : null}

      <section className="farmer-database-summary sourced-farmer-summary" aria-label="Exact sourced research summary">
        {[
          ["Durable profiles", dashboard.summary.profiles],
          ["Pending review", dashboard.summary.pendingReview],
          ["Approved", dashboard.summary.approved],
          ["Stale sources", dashboard.summary.staleSources],
          ["Completed runs", dashboard.summary.completedRuns],
        ].map(([label, value]) => (
          <article className="card" key={String(label)}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </section>

      <section className="sourced-farmer-controls">
        <form
          className="card admin-form sourced-farmer-run-form"
          onSubmit={(event) => {
            event.preventDefault();
            runBatch(event.currentTarget);
          }}
        >
          <p className="eyebrow">Official API · bounded execution</p>
          <h2><Play size={22} aria-hidden="true" /> Run one bounded batch</h2>
          <p>
            Resume from the saved checkpoint. The run stops at its page, video,
            timeout, repeated-cursor, or quota limit.
          </p>
          <label className="field">
            <span>Approved YouTube channel seed</span>
            <input
              name="channelSeed"
              type="text"
              inputMode="url"
              placeholder="@ExampleFarmChannel or a YouTube channel URL"
              minLength={3}
              maxLength={500}
              required
            />
          </label>
          <button className="button" disabled={pending || !youtubeConfigured}>
            {pending ? "Running bounded batch…" : "Run one bounded batch"}
          </button>
          {!youtubeConfigured ? (
            <p className="muted">The server-side YouTube API key is not configured.</p>
          ) : null}
        </form>

        <section className="card sourced-farmer-run-state" aria-labelledby="run-state-heading">
          <p className="eyebrow">Quota and checkpoint</p>
          <h2 id="run-state-heading"><Clock3 size={22} aria-hidden="true" /> Recent runs</h2>
          {dashboard.runs.length ? (
            <ol className="audit-list">
              {dashboard.runs.map((run) => (
                <li key={run.id}>
                  <div className="tag-row">
                    <span className="tag">{humanize(run.state)}</span>
                    <span className="tag">{run.pagesProcessed} pages</span>
                    <span className="tag">{run.videosProcessed} videos</span>
                  </div>
                  <p>Requested {readableDate(run.requestedAt)}</p>
                  <p className="muted">
                    {run.failureCode
                      ? `Stopped safely: ${humanize(run.failureCode)}`
                      : run.completedAt
                        ? `Checkpoint saved ${readableDate(run.completedAt)}`
                        : "Bounded work is awaiting its next state."}
                  </p>
                </li>
              ))}
            </ol>
          ) : (
            <div className="empty-state">
              <p>No discovery run has been requested.</p>
            </div>
          )}
          <p className="form-helper">
            Provider quota is reserved before each official API request. Failed or
            quota-limited runs remain stopped at their saved checkpoint.
          </p>
          {dashboard.channels.length ? (
            <div className="sourced-farmer-channel-state">
              <h3>Approved channel checkpoints</h3>
              <ul>
                {dashboard.channels.map((channel) => (
                  <li key={channel.id}>
                    <a href={channel.canonicalUrl} target="_blank" rel="noreferrer">
                      {channel.channelId} <ExternalLink size={13} aria-hidden="true" />
                    </a>
                    <span className="tag">{humanize(channel.state)}</span>
                    <span className="muted">
                      Refreshed {readableDate(channel.lastRefreshedAt)} · due {readableDate(channel.refreshDueAt)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      </section>

      <section className="card sourced-farmer-transient" aria-labelledby="transient-heading">
        <p className="eyebrow">Current response only · not durable profiles</p>
        <h2 id="transient-heading"><Video size={22} aria-hidden="true" /> Transient contact-free videos</h2>
        {transientVideos.length ? (
          <div className="sourced-farmer-video-grid">
            {transientVideos.map((video) => (
              <article className="featured-source sourced-farmer-video" key={video.videoId}>
                <div className="tag-row">
                  {video.topicSlugs.map((topic) => <span className="tag" key={topic}>{humanize(topic)}</span>)}
                  {video.actorTypes.map((actor) => <span className="tag" key={actor}>{humanize(actor)}</span>)}
                </div>
                <h3 dir="auto">{video.title}</h3>
                <p dir="auto">{video.redactedDescription || "No contact-free description text remains."}</p>
                <p className="muted">Published {readableDate(video.publishedAt)}</p>
                <a href={video.videoUrl} target="_blank" rel="noreferrer">
                  View attributed source <ExternalLink size={14} aria-hidden="true" />
                </a>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>Run one bounded batch to review transient, contact-free source videos.</p>
          </div>
        )}
      </section>

      <section className="card sourced-farmer-create" aria-labelledby="create-profile-heading">
        <p className="eyebrow">Independent evidence or documented subject consent</p>
        <h2 id="create-profile-heading"><FilePlus2 size={22} aria-hidden="true" /> Create a durable research profile</h2>
        <p>
          Do not copy a name, location, or other identity fact from the transient
          YouTube stage. Every professional fact needs eligible evidence.
        </p>
        <form className="admin-form" onSubmit={(event) => {
          event.preventDefault();
          createProfile(event.currentTarget);
        }}>
          <div className="form-grid form-grid--two">
            <label className="field"><span>Professional name</span><input name="displayName" minLength={2} maxLength={100} required dir="auto" /></label>
            <label className="field"><span>Evidence basis</span><select name="evidenceBasis" defaultValue="independent_public_source"><option value="independent_public_source">Independent public source</option><option value="documented_subject_consent">Documented subject consent</option></select></label>
            <label className="field"><span>District (optional)</span><input name="district" minLength={2} maxLength={100} dir="auto" /></label>
            <label className="field"><span>State (optional)</span><input name="state" minLength={2} maxLength={100} dir="auto" /></label>
            <label className="field"><span>Independent non-YouTube evidence URL</span><input name="evidenceUrl" type="url" maxLength={2048} placeholder="https://example.org/evidence" /></label>
            <label className="field"><span>Documented consent reference</span><input name="consentReference" minLength={8} maxLength={500} /></label>
            <label className="field"><span>Agriculture topic</span><select name="topicSlugs" defaultValue="general-agriculture" required>{AGRICULTURE_TOPIC_SLUGS.map((topic) => <option value={topic} key={topic}>{humanize(topic)}</option>)}</select></label>
            <label className="field"><span>Professional fact type</span><select name="factType" defaultValue="professional_role"><option value="professional_name">Professional name</option><option value="professional_role">Professional role</option><option value="farm_location">Farm location</option><option value="crop">Crop</option><option value="livestock">Livestock</option><option value="practice">Practice</option><option value="professional_impact">Professional impact</option></select></label>
          </div>
          <label className="field"><span>Private summary</span><textarea name="summary" rows={3} minLength={20} maxLength={1200} required dir="auto" /></label>
          <label className="field"><span>Fact value</span><input name="factValue" minLength={2} maxLength={500} required dir="auto" /></label>
          <label className="field"><span>Evidence excerpt</span><textarea name="evidenceExcerpt" rows={3} minLength={5} maxLength={1000} required dir="auto" /></label>
          <label className="checkbox-field"><input name="operatorAttested" type="checkbox" required /><span>I attest that identity and facts come from the selected eligible evidence basis, not a YouTube description.</span></label>
          <button className="button button--secondary" disabled={pending}>Create private evidence profile</button>
        </form>
      </section>

      <section className="card sourced-farmer-profiles" aria-labelledby="profiles-heading">
        <div className="section-heading">
          <div><p className="eyebrow">Durable · owner-scoped</p><h2 id="profiles-heading"><Database size={22} aria-hidden="true" /> Evidence profiles</h2></div>
        </div>
        <form className="filters sourced-farmer-filters" method="get">
          <label className="field"><span>Search profiles</span><input name="q" defaultValue={initialFilters.q} maxLength={120} /></label>
          <label className="field"><span>Review state</span><select name="review" defaultValue={initialFilters.review}><option value="">All states</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="archived">Archived</option></select></label>
          <button className="button button--secondary" type="submit"><Search size={16} aria-hidden="true" /> Apply filters</button>
        </form>
        {visibleProfiles.length ? (
          <div className="table-scroll">
            <table className="private-contact-table sourced-farmer-table">
              <thead><tr><th scope="col">Profile</th><th scope="col">Evidence</th><th scope="col">Review</th><th scope="col">Freshness</th><th scope="col">Open</th></tr></thead>
              <tbody>{visibleProfiles.map((profile) => (
                <tr key={profile.id}>
                  <td><strong dir="auto">{profile.displayName}</strong><br /><span className="muted" dir="auto">{[profile.district, profile.state].filter(Boolean).join(", ") || "Location not recorded"}</span></td>
                  <td>{humanize(profile.evidenceBasis)}</td>
                  <td><span className="tag">{humanize(profile.reviewState)}</span></td>
                  <td>{profile.expiresAt ? `Expires ${readableDate(profile.expiresAt)}` : `Created ${readableDate(profile.createdAt)}`}</td>
                  <td><Link className="button button--ghost button--small" href={`/admin/sourced-farmers/${profile.id}`}>Review evidence</Link></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <p>{dashboard.summary.profiles ? "No durable profiles match these filters." : "No durable evidence profile has been created."}</p>
          </div>
        )}
        <div className="sourced-farmer-pagination" aria-label="Evidence profile pages">
          <p className="muted">Page {dashboard.pagination.page} · {dashboard.pagination.total} exact matching profiles</p>
          <div className="report-actions">
            {dashboard.pagination.page > 1 ? (
              <Link className="button button--ghost button--small" href={profilePageHref(previousPage)}>Previous page</Link>
            ) : null}
            {hasNextPage ? (
              <Link className="button button--ghost button--small" href={profilePageHref(dashboard.pagination.page + 1)}>Next page</Link>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
