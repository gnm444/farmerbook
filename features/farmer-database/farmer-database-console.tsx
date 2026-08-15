"use client";

import { useState, useTransition } from "react";
import { Database, ExternalLink, LockKeyhole, Search, ShieldCheck } from "lucide-react";
import { INDIA_STATES_AND_UNION_TERRITORIES } from "@/lib/india/regions";
import { localeRegistry } from "@/lib/i18n/locales";
import {
  addPrivateFarmerContactAction,
  createFarmerContactListAction,
  discoverYouTubeFarmerChannelsAction,
  importPrivateFarmerContactsAction,
  privateFarmerContactCsvDryRunAction,
  preparePrivateFarmerEmailAction,
  updatePrivateFarmerContactAction,
} from "./actions";
import type {
  FarmerDatabaseDashboard,
  YouTubeDiscoveryResult,
} from "./types";

type Notice = { kind: "success" | "error"; message: string } | null;

function readableDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function FarmerDatabaseConsole(
  dashboard: FarmerDatabaseDashboard & { youtubeConfigured: boolean },
) {
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<Notice>(null);
  const [youtubeResults, setYoutubeResults] = useState<YouTubeDiscoveryResult[]>([]);
  const [csvSummary, setCsvSummary] = useState<string>("");
  const [validatedCsv, setValidatedCsv] = useState<string>("");

  function run(action: () => Promise<{ ok: boolean; message?: string }>, success: string) {
    setNotice(null);
    startTransition(async () => {
      const result = await action();
      setNotice(result.ok
        ? { kind: "success", message: success }
        : { kind: "error", message: result.message ?? "The request failed." });
    });
  }

  if (!dashboard.configured) {
    return (
      <section className="card farmer-database-empty">
        <LockKeyhole size={30} aria-hidden="true" />
        <h2>Private database is off</h2>
        <p>
          Configure the founder owner UUID and encryption key, then enable both
          the application and database release controls. No contact data is
          available in this state.
        </p>
      </section>
    );
  }

  return (
    <div className="farmer-database-console">
      <section className="private-data-notice" role="note">
        <ShieldCheck aria-hidden="true" />
        <div>
          <strong>Private to your administrator account</strong>
          <p>
            Contact values are encrypted. YouTube results are transient and are
            never copied into this database.
          </p>
        </div>
      </section>

      {notice ? (
        <p className={notice.kind === "error" ? "form-error" : "form-success"} role="status">
          {notice.message}
        </p>
      ) : null}

      <section className="farmer-database-summary" aria-label="Private contact summary">
        {[
          ["Contacts", dashboard.summary.total],
          ["Email consented", dashboard.summary.emailConsented],
          ["Pending", dashboard.summary.pending],
          ["Expired", dashboard.summary.expired],
          ["Suppressed", dashboard.summary.suppressed],
        ].map(([label, value]) => (
          <article className="card" key={String(label)}>
            <span>{label}</span><strong>{value}</strong>
          </article>
        ))}
      </section>

      <section className="farmer-database-grid">
        <form
          className="card admin-form"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            run(
              () => createFarmerContactListAction({
                name: form.get("name"),
                purpose: form.get("purpose"),
                idempotencyKey: crypto.randomUUID(),
              }),
              "Private contact list created.",
            );
          }}
        >
          <p className="eyebrow">Private database</p>
          <h2>Create a contact list</h2>
          <label className="field">
            <span>List name</span>
            <input name="name" minLength={2} maxLength={100} required />
          </label>
          <label className="field">
            <span>Purpose</span>
            <select name="purpose" defaultValue="farmerbook_invitation">
              <option value="farmerbook_invitation">FarmerBook invitation</option>
              <option value="farmerbook_member_support">Member support</option>
            </select>
          </label>
          <button className="button" disabled={pending}>Create list</button>
        </form>

        <form
          className="card admin-form"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const active = form.get("confirmed") === "on";
            run(
              () => addPrivateFarmerContactAction({
                listId: form.get("listId"),
                displayName: form.get("displayName") || undefined,
                email: form.get("email") || undefined,
                phone: form.get("phone") || undefined,
                acquisitionSource: form.get("acquisitionSource"),
                sourceReference: form.get("sourceReference"),
                state: form.get("state"),
                district: form.get("district"),
                preferredLocale: form.get("preferredLocale"),
                sourceAttested: form.get("sourceAttested") === "on",
                consentChannel: form.get("consentChannel"),
                consentPurpose: "farmerbook_invitation",
                consentState: active ? "active" : "pending",
                consentTextVersion: "farmerbook-private-contact-2026-08-13.1",
                consentRecordedAt: new Date().toISOString(),
                channelConfirmedAt: active ? new Date().toISOString() : undefined,
                channelConfirmationReference:
                  active ? form.get("confirmationReference") : undefined,
                idempotencyKey: crypto.randomUUID(),
              }),
              "Encrypted Farmer contact added.",
            );
          }}
        >
          <p className="eyebrow">Consent-evidenced intake</p>
          <h2>Add one Farmer contact</h2>
          <div className="form-grid form-grid--two">
            <label className="field">
              <span>List</span>
              <select name="listId" required defaultValue="">
                <option value="" disabled>Select a list</option>
                {dashboard.lists.map((list) => (
                  <option value={list.id} key={list.id}>{list.name}</option>
                ))}
              </select>
            </label>
            <label className="field"><span>Name</span><input name="displayName" maxLength={100} /></label>
            <label className="field"><span>Email</span><input name="email" type="email" maxLength={254} /></label>
            <label className="field"><span>Indian mobile</span><input name="phone" type="tel" placeholder="+919876543210" /></label>
            <label className="field">
              <span>State</span>
              <select name="state" required defaultValue="">
                <option value="" disabled>Select a state</option>
                {INDIA_STATES_AND_UNION_TERRITORIES.map((state) => (
                  <option value={state} key={state}>{state}</option>
                ))}
              </select>
            </label>
            <label className="field"><span>District</span><input name="district" minLength={2} maxLength={100} required /></label>
            <label className="field">
              <span>Language</span>
              <select name="preferredLocale" defaultValue="en-IN">
                {(["en-IN", "hi-IN", "mr-IN", "te-IN"] as const).map((locale) => (
                  <option value={locale} key={locale}>{localeRegistry[locale].nativeName}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Contact channel</span>
              <select name="consentChannel" defaultValue="email">
                <option value="email">Email</option>
                <option value="phone">Phone record only</option>
              </select>
            </label>
            <label className="field">
              <span>Acquisition source</span>
              <select name="acquisitionSource" defaultValue="manual_consent_import">
                <option value="manual_consent_import">Manual consent import</option>
                <option value="partner_consent_campaign">Partner/FPO consent campaign</option>
                <option value="existing_farmerbook_member">Existing FarmerBook member</option>
              </select>
            </label>
            <label className="field"><span>Consent evidence reference</span><input name="sourceReference" minLength={2} maxLength={500} required /></label>
            <label className="field"><span>Channel confirmation reference</span><input name="confirmationReference" minLength={8} maxLength={500} /></label>
          </div>
          <label className="checkbox-field"><input name="sourceAttested" type="checkbox" required /><span>I attest this source records permission for this FarmerBook purpose.</span></label>
          <label className="checkbox-field"><input name="confirmed" type="checkbox" /><span>The selected channel is already independently confirmed.</span></label>
          <button className="button" disabled={pending || dashboard.lists.length === 0}>Encrypt and add</button>
        </form>
      </section>

      <section className="card youtube-discovery-panel">
        <div>
          <p className="eyebrow">Read-only · official API</p>
          <h2><Search size={22} aria-hidden="true" /> YouTube Discovery Agent</h2>
          <p>
            Results exist only on this screen. The agent does not scrape About
            pages, extract contacts, create prospects, or send messages.
          </p>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setNotice(null);
            const form = new FormData(event.currentTarget);
            startTransition(async () => {
              const result = await discoverYouTubeFarmerChannelsAction({
                query: form.get("query"),
                locale: form.get("locale"),
                idempotencyKey: crypto.randomUUID(),
              });
              if (!result.ok) {
                setYoutubeResults([]);
                setNotice({ kind: "error", message: result.message });
                return;
              }
              setYoutubeResults(result.data.results);
              setNotice({
                kind: "success",
                message: `${result.data.results.length} transient YouTube results returned.`,
              });
            });
          }}
        >
          <label className="field"><span>Approved agriculture query</span><input name="query" minLength={3} maxLength={200} placeholder="natural farming Telugu India" required /></label>
          <label className="field"><span>Language</span><select name="locale" defaultValue="en-IN"><option value="en-IN">English</option><option value="hi-IN">हिन्दी</option><option value="mr-IN">मराठी</option></select></label>
          <button className="button" disabled={pending || !dashboard.youtubeConfigured}>Search current channels</button>
        </form>
        {!dashboard.youtubeConfigured ? <p className="muted">The server-side YouTube API key is not configured.</p> : null}
        {youtubeResults.length ? (
          <div className="youtube-transient-results">
            {youtubeResults.map((result) => (
              <article key={result.channelId}>
                <h3>{result.title}</h3>
                <p>{result.description || "No channel description returned."}</p>
                <a href={result.channelUrl} target="_blank" rel="noreferrer">Open on YouTube <ExternalLink size={14} aria-hidden="true" /></a>
              </article>
            ))}
            <p className="muted">YouTube Data API results · discarded when this page closes.</p>
          </div>
        ) : null}
      </section>

      <section className="card csv-dry-run">
        <p className="eyebrow">No export</p>
        <h2>CSV import dry run</h2>
        <p>Validates up to 100 consent-evidenced rows and reports counts without storing them.</p>
        <form onSubmit={(event) => {
          event.preventDefault();
          const csv = String(new FormData(event.currentTarget).get("csv") ?? "");
          setValidatedCsv("");
          startTransition(async () => {
            const result = await privateFarmerContactCsvDryRunAction(csv);
            if (!result.ok) {
              setCsvSummary(result.message);
              return;
            }
            setValidatedCsv(csv);
            setCsvSummary(`${result.data.rowCount} valid rows · ${result.data.emailCount} emails · ${result.data.phoneCount} phones · ${result.data.activeConsentCount} confirmed`);
          });
        }}>
          <label className="field"><span>CSV data</span><textarea name="csv" rows={5} maxLength={100000} /></label>
          <button className="button button--secondary" disabled={pending}>Validate only</button>
        </form>
        {csvSummary ? <p role="status">{csvSummary}</p> : null}
        {validatedCsv ? (
          <button
            className="button"
            type="button"
            disabled={pending}
            onClick={() => {
              if (!window.confirm("Import these validated encrypted contacts?")) return;
              startTransition(async () => {
                const result = await importPrivateFarmerContactsAction(validatedCsv);
                if (!result.ok) {
                  setCsvSummary(result.message);
                  return;
                }
                setValidatedCsv("");
                setCsvSummary(`${result.data.importedCount} encrypted contacts imported.`);
              });
            }}
          >
            Confirm encrypted import
          </button>
        ) : null}
      </section>

      <section className="card private-contact-table-card">
        <div className="section-heading">
          <div><p className="eyebrow">Encrypted at rest</p><h2><Database size={22} aria-hidden="true" /> Farmer contacts</h2></div>
        </div>
        {dashboard.contacts.length ? (
          <div className="table-scroll"><table className="private-contact-table">
            <thead><tr><th>Farmer</th><th>Contact</th><th>Consent</th><th>Evidence</th><th>Actions</th></tr></thead>
            <tbody>{dashboard.contacts.map((contact) => (
              <tr key={contact.id}>
                <td><strong>{contact.displayName ?? "Name not supplied"}</strong><span>{contact.district}, {contact.state}</span></td>
                <td><span>{contact.email ?? "—"}</span><span>{contact.phone ?? "—"}</span></td>
                <td><strong>{contact.consentState}</strong><span>{contact.consentChannel} · {readableDate(contact.consentRecordedAt)}</span><span>Suppression: {contact.suppressionState}</span></td>
                <td><span>{contact.acquisitionSource.replaceAll("_", " ")}</span><span>{contact.sourceReference}</span></td>
                <td><div className="report-actions">
                  {contact.email && contact.consentChannel === "email" && contact.consentState === "active" && contact.suppressionState === "none" ? <button type="button" className="text-button" disabled={pending} onClick={() => run(() => preparePrivateFarmerEmailAction({ contactId: contact.id, idempotencyKey: crypto.randomUUID() }), "Email queued for the existing consent-checked delivery agent." )}>Prepare email</button> : null}
                  {contact.consentState !== "withdrawn" ? <button type="button" className="text-button" disabled={pending} onClick={() => run(() => updatePrivateFarmerContactAction({ contactId: contact.id, operation: "withdraw", reason: "Administrator recorded consent withdrawal.", idempotencyKey: crypto.randomUUID() }), "Consent withdrawn.")}>Withdraw</button> : null}
                  {contact.suppressionState === "none" ? <button type="button" className="text-button" disabled={pending} onClick={() => run(() => updatePrivateFarmerContactAction({ contactId: contact.id, operation: "suppress", reason: "Administrator suppressed future contact.", idempotencyKey: crypto.randomUUID() }), "Contact suppressed.")}>Suppress</button> : null}
                  <button type="button" className="text-button" disabled={pending} onClick={() => {
                    if (!window.confirm("Permanently redact the stored name, email and phone?")) return;
                    run(() => updatePrivateFarmerContactAction({ contactId: contact.id, operation: "privacy_delete", reason: "Administrator completed a privacy deletion request.", idempotencyKey: crypto.randomUUID() }), "Private values redacted.");
                  }}>Privacy delete</button>
                </div></td>
              </tr>
            ))}</tbody>
          </table></div>
        ) : <p className="muted">No Farmer contacts are stored for this owner.</p>}
      </section>

      <section className="card audit-list">
        <p className="eyebrow">Redacted and immutable</p><h2>Recent contact events</h2>
        {dashboard.events.length ? <ul>{dashboard.events.slice(0, 20).map((event) => <li key={event.id}><strong>{event.eventType.replaceAll("_", " ")}</strong><span>{readableDate(event.createdAt)}</span></li>)}</ul> : <p className="muted">No contact events yet.</p>}
      </section>
    </div>
  );
}
