"use client";

import { useState, useTransition } from "react";
import { BadgeCheck, Flag, Star } from "lucide-react";
import { useLocale, useTranslations } from "@/components/locale-provider";
import { createReportAction } from "@/features/moderation/actions";
import { formatNumber } from "@/lib/i18n/format";
import type { MarketReview, ReviewSummary } from "@/lib/types";

export function ReviewList({
  reviews,
  title,
}: {
  reviews: MarketReview[];
  title?: string;
}) {
  const locale = useLocale();
  const t = useTranslations("market");
  const [reported, setReported] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const summary: ReviewSummary = {
    count: reviews.length,
    average: reviews.length
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 0,
  };

  function report(reviewId: string) {
    setError("");
    startTransition(async () => {
      const result = await createReportAction({
        targetType: "review",
        targetId: reviewId,
        reason: "unsafe",
        details: "Reported from a completed-enquiry review.",
      });
      if (!result.ok) {
        setError(t("reviewReportFailed"));
        return;
      }
      setReported((current) => new Set(current).add(reviewId));
    });
  }

  return (
    <section className="card reviews-panel">
      <div className="reviews-panel__head">
        <div>
          <p className="eyebrow">{t("purchaseReputation")}</p>
          <h2>{title ?? t("reviewsDefault")}</h2>
        </div>
        {summary.count ? (
          <div className="review-score">
            <Star size={18} fill="currentColor" aria-hidden="true" />
            <strong>{formatNumber(summary.average, locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</strong>
            <span>{t("reviewsCount", { count: formatNumber(summary.count, locale) })}</span>
          </div>
        ) : null}
      </div>
      {reviews.length ? (
        <div className="review-list">
          {reviews.map((review) => (
            <article className="review-card" key={review.id}>
              <div className="review-card__head">
                <span className="rating-inline" aria-label={t("starsAria", { rating: formatNumber(review.rating, locale) })}>
                  {Array.from({ length: 5 }, (_, index) => (
                    <Star
                      key={index}
                      size={14}
                      fill={index < review.rating ? "currentColor" : "none"}
                      aria-hidden="true"
                    />
                  ))}
                </span>
                <span>{review.createdLabel}</span>
              </div>
              <p dir="auto">{review.body}</p>
              <div className="review-card__meta">
                <span>
                  <BadgeCheck size={14} aria-hidden="true" /> {t("sellerConfirmedReview")}
                </span>
                {review.listingTitle ? <span>{review.listingTitle}</span> : null}
                <button
                  className="text-button"
                  type="button"
                  disabled={isPending || reported.has(review.id)}
                  onClick={() => report(review.id)}
                >
                  <Flag size={13} aria-hidden="true" />
                  {reported.has(review.id) ? t("reported") : t("report")}
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="muted">{t("noReviews")}</p>
      )}
      {error ? <p className="form-error">{error}</p> : null}
    </section>
  );
}
