"use client";

import { useState, useTransition } from "react";
import { Link2, Search, Unlink } from "lucide-react";
import {
  linkFeaturedFarmerAccountAction,
  searchFeaturedFarmerAccountLinkAction,
  unlinkFeaturedFarmerAccountAction,
} from "./account-link-actions";
import type { FeaturedFarmerLinkableProfile } from "./account-link-schemas";

type Publication = { slug: string; fullName: string; district: string | null; state: string | null };

export function FeaturedFarmerAccountLinkAdmin({
  publications,
}: {
  publications: Publication[];
}) {
  const [slug, setSlug] = useState(publications[0]?.slug ?? "");
  const [query, setQuery] = useState("");
  const [note, setNote] = useState("");
  const [profiles, setProfiles] = useState<FeaturedFarmerLinkableProfile[]>([]);
  const [selected, setSelected] = useState<FeaturedFarmerLinkableProfile | null>(null);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function search() {
    setMessage("");
    setSelected(null);
    startTransition(async () => {
      const result = await searchFeaturedFarmerAccountLinkAction(query);
      if (!result.ok) return setMessage(result.message);
      setProfiles(result.profiles);
      if (!result.profiles.length) setMessage("No matching FarmerBook accounts found.");
    });
  }

  function link() {
    if (!selected) return setMessage("Select the intended FarmerBook account first.");
    setMessage("");
    startTransition(async () => {
      const result = await linkFeaturedFarmerAccountAction({ slug, profileId: selected.profile_id, note });
      setMessage(result.ok ? `Linked to @${selected.handle}.` : result.message);
    });
  }

  function unlink() {
    setMessage("");
    startTransition(async () => {
      const result = await unlinkFeaturedFarmerAccountAction({ slug, note });
      setMessage(result.ok ? "The public account link was removed." : result.message);
    });
  }

  return (
    <section className="featured-account-link-admin card">
      <div>
        <p className="eyebrow">Identity-safe account bridge</p>
        <h2>Link a Featured Farmer to a real FarmerBook account</h2>
        <p>Search by name or handle, inspect the account, then record why the link is appropriate. Never link by email alone.</p>
      </div>
      <label className="field">
        <span>Featured Farmer profile</span>
        <select className="select" value={slug} onChange={(event) => setSlug(event.target.value)}>
          {publications.map((publication) => (
            <option key={publication.slug} value={publication.slug}>
              {publication.fullName} · {[publication.district, publication.state].filter(Boolean).join(", ")}
            </option>
          ))}
        </select>
      </label>
      <div className="featured-account-link-admin__search">
        <label className="field">
          <span>Find FarmerBook account</span>
          <input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name or @handle" minLength={2} />
        </label>
        <button className="button button--secondary" type="button" disabled={isPending || query.trim().length < 2} onClick={search}>
          <Search size={16} aria-hidden="true" /> Search
        </button>
      </div>
      {profiles.length ? (
        <div className="featured-account-link-admin__results" role="list">
          {profiles.map((profile) => {
            const eligible = profile.status === "active" && profile.onboarding_complete && profile.account_role === "farmer";
            return (
              <button key={profile.profile_id} className={selected?.profile_id === profile.profile_id ? "is-selected" : ""} type="button" onClick={() => setSelected(profile)} disabled={!eligible} role="listitem">
                <strong>{profile.full_name}</strong><span>@{profile.handle}</span>
                <small>{eligible ? profile.public_profile_enabled ? "Active Farmer · public profile enabled" : "Active Farmer · public profile not yet enabled" : "Not eligible: needs an active, onboarded Farmer account"}</small>
              </button>
            );
          })}
        </div>
      ) : null}
      <label className="field">
        <span>Evidence note</span>
        <textarea className="textarea" value={note} onChange={(event) => setNote(event.target.value)} minLength={2} maxLength={500} placeholder="Example: Account owner confirmed ownership during onboarding review." required />
      </label>
      {message ? <p className={message.startsWith("Linked") || message.startsWith("The public") ? "form-success" : "form-error"} role="status">{message}</p> : null}
      <div className="button-row">
        <button className="button" type="button" disabled={isPending || !selected || note.trim().length < 2} onClick={link}>
          <Link2 size={16} aria-hidden="true" /> Link selected account
        </button>
        <button className="button button--secondary" type="button" disabled={isPending || note.trim().length < 2} onClick={unlink}>
          <Unlink size={16} aria-hidden="true" /> Remove current link
        </button>
      </div>
    </section>
  );
}
