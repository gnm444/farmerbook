"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { BadgeCheck, Send, Trash2 } from "lucide-react";
import {
  submitFeaturedFarmerRecommendationAction,
  withdrawFeaturedFarmerRecommendationAction,
} from "./engagement-actions";
import type { FeaturedFarmerEngagement } from "./engagement-queries";

export function FeaturedFarmerRecommendationForm({
  engagement,
  messages,
}: {
  engagement: FeaturedFarmerEngagement;
  messages: {
    relationshipContext: string;
    recommendationText: string;
    recommendationConsent: string;
    submitRecommendation: string;
    updateRecommendation: string;
    recommendationPending: string;
    recommendationApproved: string;
    recommendationHidden: string;
    withdrawRecommendation: string;
    signInToRecommend: string;
  };
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [savedStatus, setSavedStatus] = useState<"pending" | "withdrawn" | null>(null);
  const idempotencyKey = useRef<string | null>(null);
  const existing = engagement.myRecommendation;

  if (!engagement.viewer.eligibleCustomer) {
    return (
      <p className="featured-engagement__signin">
        {messages.signInToRecommend}{" "}
        <Link href={`/login?next=${encodeURIComponent(`/featured-farmers/${engagement.slug}`)}`}>
          Sign in
        </Link>
      </p>
    );
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    idempotencyKey.current ??= crypto.randomUUID();
    setError("");
    startTransition(async () => {
      const result = await submitFeaturedFarmerRecommendationAction({
        slug: engagement.slug,
        relationshipContext: data.get("relationshipContext"),
        body: data.get("body"),
        consent: data.get("consent") === "on",
        idempotencyKey: idempotencyKey.current,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      idempotencyKey.current = null;
      setSavedStatus("pending");
    });
  }

  function withdraw() {
    setError("");
    startTransition(async () => {
      const result = await withdrawFeaturedFarmerRecommendationAction(
        engagement.slug,
      );
      if (!result.ok) setError(result.message);
      else setSavedStatus("withdrawn");
    });
  }

  const statusMessage = savedStatus === "pending"
    ? messages.recommendationPending
    : savedStatus === "withdrawn"
      ? messages.recommendationHidden
    : existing?.status === "pending"
      ? messages.recommendationPending
      : existing?.status === "approved"
        ? messages.recommendationApproved
        : existing && existing.status !== "withdrawn"
          ? messages.recommendationHidden
          : null;

  return (
    <form className="featured-engagement__form featured-engagement__recommend-form" onSubmit={submit}>
      {statusMessage ? (
        <p className="featured-engagement__status" role="status">
          <BadgeCheck size={18} aria-hidden="true" /> {statusMessage}
        </p>
      ) : null}
      <label className="field">
        <span>{messages.relationshipContext}</span>
        <input
          className="input"
          name="relationshipContext"
          minLength={2}
          maxLength={160}
          defaultValue={existing?.relationshipContext ?? ""}
          placeholder="For example: Regular Gir-cow milk customer"
          required
          dir="auto"
        />
      </label>
      <label className="field">
        <span>{messages.recommendationText}</span>
        <textarea
          className="textarea"
          name="body"
          minLength={50}
          maxLength={1000}
          defaultValue={existing?.body ?? ""}
          required
          dir="auto"
        />
      </label>
      <label className="featured-engagement__consent">
        <input name="consent" type="checkbox" required />
        <span>{messages.recommendationConsent}</span>
      </label>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <div className="featured-engagement__form-actions">
        <button className="button" type="submit" disabled={isPending}>
          <Send size={17} aria-hidden="true" />
          {existing ? messages.updateRecommendation : messages.submitRecommendation}
        </button>
        {existing && existing.status !== "withdrawn" ? (
          <button
            className="button button--secondary"
            type="button"
            disabled={isPending}
            onClick={withdraw}
          >
            <Trash2 size={16} aria-hidden="true" />
            {messages.withdrawRecommendation}
          </button>
        ) : null}
      </div>
    </form>
  );
}
