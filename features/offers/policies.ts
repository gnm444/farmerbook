import type { OfferModerationState } from "./types";

export function isOfferModerationEligibleForPublic(input: {
  requiresModerationReview: boolean;
  moderationState: OfferModerationState;
}) {
  return (
    !input.requiresModerationReview || input.moderationState === "approved"
  );
}
