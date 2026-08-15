"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowRight, BookOpenText, FileSearch, Sparkles } from "lucide-react";
import { INDIA_STATES_AND_UNION_TERRITORIES } from "@/lib/india/regions";
import { createFeaturedFarmerResearchAction } from "./actions";
import type { FeaturedFarmerResearchRow } from "./queries";

export function FeaturedFarmerNewsroom({
  available,
  researches,
}: {
  available: boolean;
  researches: FeaturedFarmerResearchRow[];
}) {
  const router = useRouter();
  const [feedback, setFeedback] = useState("");
  const [failed, setFailed] = useState(false);
  const [isPending, startTransition] = useTransition();

  function createResearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setFeedback("");
    setFailed(false);
    startTransition(async () => {
      const result = await createFeaturedFarmerResearchAction({
        fullName: form.get("fullName"),
        districtHint: form.get("districtHint") || undefined,
        stateHint: form.get("stateHint") || undefined,
        farmingHint: form.get("farmingHint") || undefined,
        significanceHypothesis: form.get("significanceHypothesis"),
        preferredLocale: form.get("preferredLocale"),
        idempotencyKey: crypto.randomUUID(),
      });
      if (!result.ok) {
        setFailed(true);
        setFeedback(result.message);
        return;
      }
      formElement.reset();
      router.push(`/admin/featured-farmers/${result.data.researchId}`);
    });
  }

  return (
    <div className="featured-newsroom">
      {!available ? (
        <div className="form-error" role="status">
          The newsroom is unavailable until the application flag, private
          database control, and Supabase administrator configuration are enabled.
        </div>
      ) : null}

      <section className="card featured-newsroom__brief">
        <div>
          <p className="eyebrow">New editorial brief</p>
          <h2>Start with a reason to feature</h2>
          <p className="muted">
            Name the public contribution worth documenting. The newsroom will
            create five bounded Google research routes; it does not scrape search
            results or imply that the farmer joined FarmerBook.
          </p>
        </div>
        <BookOpenText size={36} aria-hidden="true" />
        <form className="featured-newsroom__create" onSubmit={createResearch}>
          <label className="field">
            <span>Farmer&apos;s public name</span>
            <input name="fullName" required minLength={2} maxLength={100} />
          </label>
          <label className="field">
            <span>District hint</span>
            <input name="districtHint" minLength={2} maxLength={100} />
          </label>
          <label className="field">
            <span>State or union territory</span>
            <select name="stateHint" defaultValue="">
              <option value="">Not specified</option>
              {INDIA_STATES_AND_UNION_TERRITORIES.map((state) => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Crop or practice hint</span>
            <input name="farmingHint" minLength={2} maxLength={160} />
          </label>
          <label className="field">
            <span>Story language</span>
            <select name="preferredLocale" defaultValue="en-IN">
              <option value="en-IN">English</option>
              <option value="hi-IN">हिन्दी</option>
              <option value="mr-IN">मराठी</option>
            </select>
          </label>
          <label className="field featured-newsroom__wide">
            <span>Why might this work be significant?</span>
            <textarea
              name="significanceHypothesis"
              required
              minLength={20}
              maxLength={800}
              rows={4}
              placeholder="Describe the documented work, innovation, leadership, community impact, or knowledge sharing that merits an editorial profile."
            />
          </label>
          {feedback ? (
            <div
              className={failed ? "form-error" : "form-success"}
              role={failed ? "alert" : "status"}
            >
              {feedback}
            </div>
          ) : null}
          <button className="button" disabled={!available || isPending}>
            <FileSearch size={17} aria-hidden="true" />
            {isPending ? "Creating research desk…" : "Create research desk"}
          </button>
        </form>
      </section>

      <section className="featured-newsroom__list" aria-labelledby="story-desks-title">
        <div className="featured-newsroom__list-head">
          <div>
            <p className="eyebrow">Editorial pipeline</p>
            <h2 id="story-desks-title">Farmer story desks</h2>
          </div>
          <span className="tag">{researches.length} active</span>
        </div>
        {researches.length ? (
          <div className="featured-newsroom__grid">
            {researches.map((research) => (
              <Link
                className="card featured-newsroom__story-card"
                href={`/admin/featured-farmers/${research.id}`}
                key={`${research.id}:${research.revision}`}
              >
                <div className="featured-newsroom__story-icon">
                  <Sparkles size={20} aria-hidden="true" />
                </div>
                <div>
                  <span className={`tag featured-state featured-state--${research.state}`}>
                    {research.state.replaceAll("_", " ")}
                  </span>
                  <h3>{research.subject_name}</h3>
                  <p>{research.significance_hypothesis}</p>
                  <small>
                    {[research.district_hint, research.state_hint, research.farming_hint]
                      .filter(Boolean)
                      .join(" · ") || "India"}
                  </small>
                </div>
                <ArrowRight aria-hidden="true" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="card empty-state">
            <h3>No editorial briefs yet</h3>
            <p>Create the first research desk above.</p>
          </div>
        )}
      </section>
    </div>
  );
}
