"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  Archive,
  ArrowLeft,
  Clock3,
  ExternalLink,
  FileCheck2,
  History,
  ShieldAlert,
} from "lucide-react";
import {
  archiveSourcedFarmerProfileAction,
  reviewSourcedFarmerProfileAction,
} from "./actions";
import type { SourcedFarmerDetail as SourcedFarmerDetailData } from "./types";

const PRIVATE_NOTICE =
  "Private research · not a FarmerBook member · not verified · no contact or outreach consent.";

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

export function SourcedFarmerDetail({ detail }: { detail: SourcedFarmerDetailData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const { profile } = detail;

  function review(formElement: HTMLFormElement) {
    const form = new FormData(formElement);
    setMessage("");
    setFailed(false);
    startTransition(async () => {
      const input = {
        profileId: profile.id,
        operation: form.get("operation"),
        expectedRevision: profile.revision,
        idempotencyKey: crypto.randomUUID(),
      } as Parameters<typeof reviewSourcedFarmerProfileAction>[0];
      const result = await reviewSourcedFarmerProfileAction(input);
      if (!result.ok) {
        setFailed(true);
        setMessage(result.message ?? "The review decision was not recorded.");
        return;
      }
      setMessage("Review decision recorded.");
      formElement.reset();
      router.refresh();
    });
  }

  function archive(formElement: HTMLFormElement) {
    const form = new FormData(formElement);
    if (!window.confirm("Archive this private sourced research profile?")) return;
    setMessage("");
    setFailed(false);
    startTransition(async () => {
      const input = {
        profileId: profile.id,
        reason: form.get("reason"),
        expectedRevision: profile.revision,
        idempotencyKey: crypto.randomUUID(),
      } as Parameters<typeof archiveSourcedFarmerProfileAction>[0];
      const result = await archiveSourcedFarmerProfileAction(input);
      if (!result.ok) {
        setFailed(true);
        setMessage(result.message ?? "The private profile was not archived.");
        return;
      }
      router.push("/admin/sourced-farmers");
      router.refresh();
    });
  }

  return (
    <div className="sourced-farmer-detail">
      <Link className="button button--ghost" href="/admin/sourced-farmers">
        <ArrowLeft size={16} aria-hidden="true" /> Back to sourced research
      </Link>

      <section className="card sourced-farmer-boundary" role="note">
        <ShieldAlert aria-hidden="true" />
        <div>
          <strong>{PRIVATE_NOTICE}</strong>
          <p>This evidence record is private and cannot be used as consent or a public identity claim.</p>
        </div>
      </section>

      {message ? (
        <p className={failed ? "form-error" : "form-success"} role={failed ? "alert" : "status"}>{message}</p>
      ) : null}

      <section className="card sourced-farmer-detail__identity">
        <div className="tag-row">
          <span className="tag">{humanize(profile.reviewState)}</span>
          <span className="tag">{humanize(profile.evidenceBasis)}</span>
          <span className="tag">revision {profile.revision}</span>
        </div>
        <p className="eyebrow">Private professional research</p>
        <h2 dir="auto">{profile.displayName}</h2>
        <p dir="auto">{profile.summary}</p>
        <dl className="profile-sample-details sourced-farmer-detail__metadata">
          <div><dt>Location</dt><dd dir="auto">{[profile.district, profile.state].filter(Boolean).join(", ") || "Not recorded"}</dd></div>
          <div><dt>Created</dt><dd>{readableDate(profile.createdAt)}</dd></div>
          <div><dt>Last reviewed</dt><dd>{readableDate(profile.lastReviewedAt)}</dd></div>
          <div><dt>Evidence expires</dt><dd>{readableDate(profile.expiresAt)}</dd></div>
        </dl>
        {profile.topicSlugs.length ? <div className="tag-row">{profile.topicSlugs.map((topic) => <span className="tag" key={topic}>{humanize(topic)}</span>)}</div> : null}
        {profile.evidenceUrl ? (
          <a href={profile.evidenceUrl} target="_blank" rel="noreferrer">
            Open primary profile evidence <ExternalLink size={14} aria-hidden="true" />
          </a>
        ) : (
          <p className="muted">Evidence is held as a documented subject-consent reference.</p>
        )}
      </section>

      <section className="card sourced-farmer-facts" aria-labelledby="facts-heading">
        <p className="eyebrow">Field-level provenance</p>
        <h2 id="facts-heading"><FileCheck2 size={22} aria-hidden="true" /> Professional facts</h2>
        {detail.facts.length ? (
          <ol className="profile-sample-citations sourced-farmer-fact-list">
            {detail.facts.map((fact) => (
              <li key={fact.id}>
                <div className="tag-row"><span className="tag">{humanize(fact.factType)}</span><span className="tag">{humanize(fact.reviewState)}</span></div>
                <strong dir="auto">{fact.value}</strong>
                <q dir="auto">{fact.evidenceExcerpt}</q>
                <span className="muted">Recorded {readableDate(fact.createdAt)}</span>
                {fact.sourceUrl ? <a href={fact.sourceUrl} target="_blank" rel="noreferrer">Review fact source <ExternalLink size={13} aria-hidden="true" /></a> : <span className="muted">Documented consent evidence; no public source URL.</span>}
              </li>
            ))}
          </ol>
        ) : (
          <div className="empty-state"><p>No eligible professional facts are attached to this record.</p></div>
        )}
      </section>

      <section className="sourced-farmer-detail__workflow">
        <form className="card admin-form" onSubmit={(event) => {
          event.preventDefault();
          review(event.currentTarget);
        }}>
          <p className="eyebrow">Revision-aware decision</p>
          <h2>Review evidence profile</h2>
          <label className="field"><span>Decision</span><select name="operation" defaultValue="approve"><option value="approve">Approve evidence</option><option value="reject">Reject evidence</option></select></label>
          <button className="button" disabled={pending || profile.reviewState === "archived"}>Record review decision</button>
        </form>

        <form className="card admin-form" onSubmit={(event) => {
          event.preventDefault();
          archive(event.currentTarget);
        }}>
          <p className="eyebrow">Remove from active research</p>
          <h2><Archive size={22} aria-hidden="true" /> Archive profile</h2>
          <p>Archive keeps a redacted audit event and removes this record from active review.</p>
          <label className="field"><span>Archive reason</span><textarea name="reason" rows={3} minLength={4} maxLength={500} required dir="auto" /></label>
          <button className="button button--danger" disabled={pending || profile.reviewState === "archived"}>Archive private profile</button>
        </form>
      </section>

      <section className="card sourced-farmer-audit" aria-labelledby="audit-heading">
        <p className="eyebrow">Redacted immutable history</p>
        <h2 id="audit-heading"><History size={22} aria-hidden="true" /> Audit events</h2>
        {detail.events.length ? (
          <ol className="audit-list">
            {detail.events.map((event) => <li key={event.id}><strong>{humanize(event.eventType)}</strong><span><Clock3 size={14} aria-hidden="true" /> {readableDate(event.createdAt)}</span></li>)}
          </ol>
        ) : (
          <div className="empty-state"><p>No audit events are available for this profile.</p></div>
        )}
      </section>
    </div>
  );
}
