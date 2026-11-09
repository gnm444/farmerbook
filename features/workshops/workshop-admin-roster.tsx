"use client";

import { useEffect, useState } from "react";
import styles from "./workshop-admin-roster.module.css";

const rosterEndpoint = "/api/admin/workshops/hari-babu-2026/registrations";
const pageSize = 25;

type WorkshopAdminRegistration = {
  submissionId: string;
  createdAt: string;
  consentVersion: string;
  farmerName: string;
  phone: string;
  district: string;
  state: string;
  attendanceInterest: "attend" | "interested";
  farmName?: string;
  farmLocation?: string;
  yearsFarming?: number;
  crops?: string;
  challenges?: string;
  proposedSolutions?: string;
};

type RosterPage = {
  count: number;
  offset: number;
  registrations: WorkshopAdminRegistration[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOptionalString(value: unknown) {
  return value === undefined || typeof value === "string";
}

function isRegistration(value: unknown): value is WorkshopAdminRegistration {
  return isRecord(value)
    && typeof value.submissionId === "string"
    && typeof value.createdAt === "string"
    && typeof value.consentVersion === "string"
    && typeof value.farmerName === "string"
    && typeof value.phone === "string"
    && typeof value.district === "string"
    && typeof value.state === "string"
    && (value.attendanceInterest === "attend" || value.attendanceInterest === "interested")
    && isOptionalString(value.farmName)
    && isOptionalString(value.farmLocation)
    && (value.yearsFarming === undefined || typeof value.yearsFarming === "number")
    && isOptionalString(value.crops)
    && isOptionalString(value.challenges)
    && isOptionalString(value.proposedSolutions);
}

function parseRosterPage(value: unknown): RosterPage | null {
  if (!isRecord(value)
    || !Number.isSafeInteger(value.count)
    || Number(value.count) < 0
    || !Number.isSafeInteger(value.offset)
    || Number(value.offset) < 0
    || !Array.isArray(value.registrations)
    || !value.registrations.every(isRegistration)) return null;
  return {
    count: Number(value.count),
    offset: Number(value.offset),
    registrations: value.registrations,
  };
}

function receivedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

function Detail({ label, value }: { label: string; value: string | number | undefined }) {
  if (value === undefined || value === "") return null;
  return <div><dt>{label}</dt><dd>{value}</dd></div>;
}

export function WorkshopAdminRoster() {
  const [offset, setOffset] = useState(0);
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [page, setPage] = useState<RosterPage | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const url = `${rosterEndpoint}?offset=${offset}&limit=${pageSize}`;
    void fetch(url, {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) throw new Error("ROSTER_UNAVAILABLE");
      const parsed = parseRosterPage(await response.json());
      if (!parsed || parsed.offset !== offset) throw new Error("INVALID_ROSTER");
      return parsed;
    }).then((parsed) => {
      if (controller.signal.aborted) return;
      const lastValidOffset = parsed.count === 0
        ? 0
        : Math.floor((parsed.count - 1) / pageSize) * pageSize;
      if (parsed.offset > lastValidOffset) {
        setOffset(lastValidOffset);
        return;
      }
      setPage(parsed);
      setLoading(false);
      setError(false);
    }).catch(() => {
      if (controller.signal.aborted) return;
      setPage(null);
      setLoading(false);
      setError(true);
    });
    return () => controller.abort();
  }, [offset, refresh]);

  function changePage(nextOffset: number) {
    setConfirmDeleteId(null);
    setDeleteError(false);
    setLoading(true);
    setError(false);
    setPage(null);
    setOffset(nextOffset);
  }

  function retry() {
    setLoading(true);
    setError(false);
    setRefresh((value) => value + 1);
  }

  async function deleteRegistration(submissionId: string) {
    if (pendingDeleteId || confirmDeleteId !== submissionId) return;
    setPendingDeleteId(submissionId);
    setDeleteError(false);
    try {
      const response = await fetch(rosterEndpoint, {
        method: "DELETE",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ submissionId }),
      });
      const data: unknown = await response.json().catch(() => null);
      if (!response.ok || !isRecord(data) || data.status !== "deleted") {
        throw new Error("DELETE_UNCONFIRMED");
      }
      setConfirmDeleteId(null);
      setPage(null);
      setLoading(true);
      setRefresh((value) => value + 1);
    } catch {
      setDeleteError(true);
    } finally {
      setPendingDeleteId(null);
    }
  }

  const shown = page?.registrations.length ?? 0;
  const attendingOnPage = page?.registrations.filter((row) => row.attendanceInterest === "attend").length ?? 0;
  const interestedOnPage = shown - attendingOnPage;
  const first = page && shown ? page.offset + 1 : 0;
  const last = page ? page.offset + shown : 0;

  return (
    <section className={styles.roster} aria-label="Private workshop registrations">
      <p className={styles.privacy}>Private organizer view. No messages are sent from this page.</p>
      {loading ? <p className={styles.status} role="status">Loading registrations…</p> : null}
      {error ? (
        <div className={styles.error} role="alert">
          <p>Registrations could not be loaded. Your access or the roster service may be unavailable.</p>
          <button className="button button--secondary" type="button" onClick={retry}>Try again</button>
        </div>
      ) : null}
      {page && !loading ? (
        <>
          <div className={styles.counts} aria-label="Registration counts">
            <div><strong>{page.count}</strong><span>Total registrations</span></div>
            <div><strong>{attendingOnPage}</strong><span>Planning to attend on this page</span></div>
            <div><strong>{interestedOnPage}</strong><span>Interested on this page</span></div>
          </div>
          <p className={styles.range} role="status">
            {shown ? `Showing ${first}–${last} of ${page.count} registrations` : "No registrations on this page"}
          </p>
          {page.count === 0 ? <p className={styles.empty}>No workshop registrations have been received yet.</p> : null}
          <div className={styles.list}>
            {page.registrations.map((row) => (
              <article className={styles.card} key={row.submissionId}>
                <div className={styles.cardTop}>
                  <div>
                    <h2>{row.farmerName}</h2>
                    <p>{row.district}, {row.state} · {receivedAt(row.createdAt)}</p>
                  </div>
                  <span className={styles.badge}>
                    {row.attendanceInterest === "attend" ? "Plans to attend" : "Interested in details"}
                  </span>
                </div>
                <p className={styles.phone}><span>Mobile</span> {row.phone}</p>
                <details className={styles.details}>
                  <summary>View registration details and discussion topics</summary>
                  <dl>
                    <Detail label="Farm name" value={row.farmName} />
                    <Detail label="Farm or village location" value={row.farmLocation} />
                    <Detail label="Years farming" value={row.yearsFarming} />
                    <Detail label="Main crops" value={row.crops} />
                    <Detail label="Challenges to discuss" value={row.challenges} />
                    <Detail label="Proposed solutions" value={row.proposedSolutions} />
                    <Detail label="Consent version" value={row.consentVersion} />
                    <Detail label="Registration ID" value={row.submissionId} />
                  </dl>
                </details>
                {confirmDeleteId === row.submissionId ? (
                  <div className={styles.deleteConfirm} role="group" aria-label={`Confirm removal for ${row.farmerName}`}>
                    <p>Remove {row.farmerName}&apos;s registration and private answers? This cannot be undone.</p>
                    {deleteError ? <p className={styles.deleteError} role="alert">Removal could not be confirmed. Please retry or leave this registration in place.</p> : null}
                    <div className={styles.deleteButtons}>
                      <button type="button" className="button button--secondary" disabled={pendingDeleteId !== null} onClick={() => {
                        setConfirmDeleteId(null);
                        setDeleteError(false);
                      }}>Keep registration</button>
                      <button type="button" className={styles.deleteDanger} disabled={pendingDeleteId !== null} onClick={() => void deleteRegistration(row.submissionId)}>
                        {pendingDeleteId === row.submissionId ? "Removing…" : "Yes, remove registration"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button type="button" className={styles.deleteTrigger} disabled={pendingDeleteId !== null} onClick={() => {
                    setConfirmDeleteId(row.submissionId);
                    setDeleteError(false);
                  }}>Remove registration</button>
                )}
              </article>
            ))}
          </div>
          {page.count > pageSize ? (
            <nav className={styles.pagination} aria-label="Registration pages">
              <button className="button button--secondary" type="button" disabled={page.offset === 0} onClick={() => changePage(Math.max(0, page.offset - pageSize))}>Previous</button>
              <span>Page {Math.floor(page.offset / pageSize) + 1} of {Math.ceil(page.count / pageSize)}</span>
              <button className="button button--secondary" type="button" disabled={page.offset + pageSize >= page.count} onClick={() => changePage(page.offset + pageSize)}>Next</button>
            </nav>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
