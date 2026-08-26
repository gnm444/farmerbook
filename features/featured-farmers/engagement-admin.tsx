"use client";

import { useState, useTransition } from "react";
import { Check, EyeOff, X } from "lucide-react";
import { moderateFeaturedFarmerRecommendationAction } from "./engagement-actions";
import type { FeaturedFarmerRecommendationQueueRow } from "./engagement-queries";

export function FeaturedFarmerEngagementAdmin({
  recommendations,
}: {
  recommendations: FeaturedFarmerRecommendationQueueRow[];
}) {
  if (!recommendations.length) {
    return <div className="empty-state">No recommendations are waiting for review.</div>;
  }
  return (
    <div className="featured-engagement-admin">
      {recommendations.map((recommendation) => (
        <RecommendationDecision
          key={recommendation.recommendation_id}
          recommendation={recommendation}
        />
      ))}
    </div>
  );
}

function RecommendationDecision({
  recommendation,
}: {
  recommendation: FeaturedFarmerRecommendationQueueRow;
}) {
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [isPending, startTransition] = useTransition();

  function decide(nextStatus: "approved" | "rejected" | "hidden") {
    setError("");
    setSaved("");
    startTransition(async () => {
      const result = await moderateFeaturedFarmerRecommendationAction({
        recommendationId: recommendation.recommendation_id,
        nextStatus,
        note,
      });
      if (!result.ok) setError(result.message);
      else setSaved(`Saved as ${nextStatus}.`);
    });
  }

  return (
    <article className="card featured-engagement-admin__item">
      <header>
        <div>
          <p className="eyebrow">{recommendation.subject_name}</p>
          <h2>{recommendation.reviewer_name}</h2>
          <p>@{recommendation.reviewer_handle} · {recommendation.relationship_context}</p>
        </div>
        <span className="status-pill">{recommendation.recommendation_status}</span>
      </header>
      <blockquote>{recommendation.body}</blockquote>
      <small>
        Submitted {new Intl.DateTimeFormat("en-IN", {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date(recommendation.created_at))}
      </small>
      <label className="field">
        <span>Decision note</span>
        <textarea
          className="textarea"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          minLength={2}
          maxLength={500}
          required
        />
      </label>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {saved ? <p className="form-success" role="status">{saved}</p> : null}
      <div className="featured-engagement-admin__actions">
        <button className="button" type="button" disabled={isPending || note.trim().length < 2} onClick={() => decide("approved")}>
          <Check size={16} aria-hidden="true" /> Approve
        </button>
        <button className="button button--secondary" type="button" disabled={isPending || note.trim().length < 2} onClick={() => decide("rejected")}>
          <X size={16} aria-hidden="true" /> Reject
        </button>
        <button className="button button--secondary" type="button" disabled={isPending || note.trim().length < 2} onClick={() => decide("hidden")}>
          <EyeOff size={16} aria-hidden="true" /> Hide
        </button>
      </div>
    </article>
  );
}
