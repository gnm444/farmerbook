import Link from "next/link";
import { Mail, MessageSquareQuote } from "lucide-react";
import type { SupportedLocale } from "@/lib/i18n/locales";
import { featuredFarmerPublicMessages } from "./public-messages";
import type { FeaturedFarmerEngagement } from "./engagement-queries";
import { FeaturedFarmerProfileViewCounter } from "./profile-view-counter";
import { FeaturedFarmerQuestionForm } from "./question-form";
import { FeaturedFarmerRecommendationForm } from "./recommendation-form";

function formatRecommendationDate(value: string | null, locale: SupportedLocale) {
  if (!value) return "";
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function FeaturedFarmerEngagementSection({
  engagement,
  locale,
}: {
  engagement: FeaturedFarmerEngagement;
  locale: SupportedLocale;
}) {
  const m = featuredFarmerPublicMessages(locale);
  return (
    <section className="featured-engagement" aria-label="Farm contact and customer recommendations">
      <div className="featured-engagement__summary">
        <a className="featured-engagement__email" href={`mailto:${engagement.publicEmail}`}>
          <Mail size={20} aria-hidden="true" />
          <span><small>{m.farmContact}</small><strong>{engagement.publicEmail}</strong></span>
        </a>
        {engagement.viewsEnabled ? (
          <FeaturedFarmerProfileViewCounter
            slug={engagement.slug}
            initialCount={engagement.profileViewCount}
            label={m.profileViews}
            helpText={m.approximateViews}
          />
        ) : null}
      </div>

      {engagement.questionsEnabled && engagement.questionDeliveryReady ? (
        <FeaturedFarmerQuestionForm
          slug={engagement.slug}
          publicEmail={engagement.publicEmail}
          turnstileSiteKey={engagement.turnstileSiteKey}
          messages={m}
        />
      ) : engagement.questionsEnabled ? (
        <div className="featured-engagement__fallback">
          <h2>{m.privateQuestions}</h2>
          <p>{m.privateQuestionsBody}</p>
          <a className="button" href={`mailto:${engagement.publicEmail}`}>
            <Mail size={17} aria-hidden="true" /> {m.emailFarm}
          </a>
        </div>
      ) : null}

      {engagement.recommendationsEnabled ? (
        <div className="featured-engagement__recommendations" id="customer-recommendations">
          <div className="featured-engagement__heading">
            <span><MessageSquareQuote size={23} aria-hidden="true" /></span>
            <div>
              <h2>{m.recommendations}</h2>
              <p>{m.recommendationsBody}</p>
            </div>
          </div>
          {engagement.recommendations.length ? (
            <div className="featured-engagement__recommendation-list">
              {engagement.recommendations.map((recommendation) => (
                <article key={recommendation.id}>
                  <header>
                    <span aria-hidden="true">
                      {recommendation.reviewerName
                        .split(/\s+/)
                        .map((part) => part[0])
                        .join("")
                        .slice(0, 2)}
                    </span>
                    <div>
                      <h3>
                        <Link href={`/profile/${recommendation.reviewerHandle}`}>
                          {recommendation.reviewerName}
                        </Link>
                      </h3>
                      <p>{recommendation.relationshipContext}</p>
                    </div>
                    <time>{formatRecommendationDate(recommendation.recommendedAt, locale)}</time>
                  </header>
                  <blockquote>{recommendation.body}</blockquote>
                  <small>{m.recommendationTrust}</small>
                </article>
              ))}
            </div>
          ) : (
            <p className="featured-engagement__empty">{m.noRecommendations}</p>
          )}
          <FeaturedFarmerRecommendationForm engagement={engagement} messages={m} />
        </div>
      ) : null}
    </section>
  );
}
