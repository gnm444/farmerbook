"use client";

import { useState, useTransition } from "react";
import { Star, Trash2 } from "lucide-react";
import type { MarketReview } from "@/lib/types";
import {
  createReviewAction,
  deleteReviewAction,
  updateReviewAction,
} from "./actions";

export function ReviewForm({
  enquiryId,
  initialReview,
}: {
  enquiryId: string;
  initialReview?: MarketReview;
}) {
  const [rating, setRating] = useState(initialReview?.rating ?? 5);
  const [body, setBody] = useState(initialReview?.body ?? "");
  const [saved, setSaved] = useState(Boolean(initialReview));
  const [deleted, setDeleted] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  if (deleted) {
    return <p className="notice notice--success">Review removed.</p>;
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      const result = initialReview
        ? await updateReviewAction({
            reviewId: initialReview.id,
            rating,
            body,
          })
        : await createReviewAction({ enquiryId, rating, body });
      if (!result.ok) {
        setError(result.message ?? "The review could not be saved.");
        return;
      }
      setSaved(true);
    });
  }

  function remove() {
    if (!initialReview) return;
    setError("");
    startTransition(async () => {
      const result = await deleteReviewAction(initialReview.id);
      if (!result.ok) {
        setError(result.message ?? "The review could not be removed.");
        return;
      }
      setDeleted(true);
    });
  }

  return (
    <form className="review-form" onSubmit={submit}>
      <div>
        <strong>{initialReview ? "Your review" : "Review this completed enquiry"}</strong>
        <p>Help other Customers understand the quality and seller experience.</p>
      </div>
      <fieldset className="rating-field">
        <legend>Rating</legend>
        <div>
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              type="button"
              aria-label={`${value} star${value === 1 ? "" : "s"}`}
              aria-pressed={rating === value}
              key={value}
              onClick={() => setRating(value as MarketReview["rating"])}
            >
              <Star
                size={22}
                fill={value <= rating ? "currentColor" : "none"}
                aria-hidden="true"
              />
            </button>
          ))}
        </div>
      </fieldset>
      <label className="field">
        <span>Review</span>
        <textarea
          className="textarea"
          value={body}
          minLength={10}
          maxLength={1000}
          onChange={(event) => setBody(event.target.value)}
          required
        />
      </label>
      {error ? <p className="form-error">{error}</p> : null}
      {saved ? <p className="form-helper">Review saved.</p> : null}
      <div className="review-form__actions">
        <button className="button button--small" type="submit" disabled={isPending}>
          {isPending ? "Saving…" : initialReview ? "Update review" : "Publish review"}
        </button>
        {initialReview ? (
          <button
            className="button button--secondary button--small"
            type="button"
            disabled={isPending}
            onClick={remove}
          >
            <Trash2 size={15} aria-hidden="true" /> Remove
          </button>
        ) : null}
      </div>
    </form>
  );
}
