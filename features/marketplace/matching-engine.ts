import {
  marketplaceMatchRequestSchema,
  type MarketplaceMatchDocument,
  type MarketplaceMatchResponse,
} from "./matching-contracts";

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "can", "for", "from", "how", "i", "in",
  "is", "me", "need", "of", "please", "the", "to", "want", "who", "with",
]);

function tokens(value: string) {
  return value
    .toLocaleLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length >= 2 && !STOP_WORDS.has(token));
}

function rankDocument(
  document: MarketplaceMatchDocument,
  questionTokens: string[],
  locationTokens: string[],
  question: string,
  location: string,
) {
  const productText = [
    document.title,
    document.crop,
    document.variety,
    document.description,
    document.profileName,
    document.profileCrops.join(" "),
    document.profileBio,
  ].join(" ").toLocaleLowerCase();
  const locationText = `${document.district} ${document.state}`.toLocaleLowerCase();
  const matchedTerms = questionTokens.filter((token) => productText.includes(token));
  const locationMatches = locationTokens.filter((token) => locationText.includes(token));
  const exactProductPhrase = question.trim().length >= 4 && productText.includes(question.trim().toLocaleLowerCase());
  const exactLocationPhrase = location.trim().length >= 4 && locationText.includes(location.trim().toLocaleLowerCase());
  const deliveryEvidence = document.deliveryOptions.filter((option) =>
    /delivery|transport|collection/i.test(option),
  );
  const score = matchedTerms.length * 5
    + (exactProductPhrase ? 8 : 0)
    + locationMatches.length * 6
    + (exactLocationPhrase ? 8 : 0)
    + (deliveryEvidence.length ? 2 : 0);

  if (!matchedTerms.length) return null;

  return {
    document,
    score,
    matchedTerms,
    evidence: [
      `Active listing for ${document.crop}${document.variety ? ` (${document.variety})` : ""}`,
      `Farmer profile location: ${document.district}, ${document.state}`,
      `Delivery terms listed: ${document.deliveryOptions.join(", ")}`,
      ...(document.deliveryRadiusKm
        ? [`Seller states a delivery radius of ${document.deliveryRadiusKm} km; confirm the actual route.`]
        : []),
      ...(locationMatches.length
        ? ["The requested location matches the seller's listed district or state."]
        : ["The requested location was not an exact district/state match; confirm delivery before ordering."]),
    ],
    confidence: locationMatches.length && deliveryEvidence.length ? "strong" as const : "possible" as const,
  };
}

function responseFor(
  ranked: NonNullable<ReturnType<typeof rankDocument>>[],
  location: string,
): MarketplaceMatchResponse {
  const matches = ranked.slice(0, 5).map(({ document, evidence, confidence, matchedTerms }) => ({
    listingId: document.listingId,
    farmerName: document.profileName,
    farmerHandle: document.profileHandle,
    listingTitle: document.title,
    crop: document.crop,
    location: `${document.district}, ${document.state}`,
    deliveryOptions: document.deliveryOptions,
    deliveryRadiusKm: document.deliveryRadiusKm,
    price: document.price,
    priceUnit: document.priceUnit,
    quantity: document.quantity,
    unit: document.unit,
    evidence,
    matchedTerms,
    confidence,
    listingHref: `/marketplace/${document.listingId}`,
    profileHref: `/profile/${document.profileHandle}`,
  }));

  if (!matches.length) {
    return {
      answer: location
        ? `I could not find an active public listing matching your product request and location (${location}). Try another product description or a nearby district.`
        : "I could not find an active public listing matching that product request. Try adding the crop, variety, quantity or destination.",
      matches: [],
      retrievalCount: 0,
      grounded: true,
      caveats: [
        "Only active public listings were searched.",
        "No farmer was selected when the product evidence did not match.",
      ],
    };
  }

  return {
    answer: location
      ? `I found ${matches.length} active public listing${matches.length === 1 ? "" : "s"} matching your product request near or for consideration in ${location}. Check each seller's delivery terms before placing an enquiry.`
      : `I found ${matches.length} active public listing${matches.length === 1 ? "" : "s"} matching your product request. Add a destination to improve delivery matching.`,
    matches,
    retrievalCount: ranked.length,
    grounded: true,
    caveats: [
      "A matching listing is not a confirmed order, stock reservation or delivery promise.",
      "The displayed delivery radius is supplied by the seller; confirm distance, timing, transport cost and availability directly through the listing enquiry.",
      "Results use public active listings and public farmer-profile fields only.",
    ],
  };
}

export function marketplaceMatch(rawInput: unknown): MarketplaceMatchResponse {
  const input = marketplaceMatchRequestSchema.parse(rawInput);
  const questionTokens = tokens(input.question);
  const locationTokens = tokens(input.deliveryLocation);
  const ranked = input.documents
    .map((document) => rankDocument(
      document,
      questionTokens,
      locationTokens,
      input.question,
      input.deliveryLocation,
    ))
    .filter((match): match is NonNullable<typeof match> => Boolean(match))
    .sort((left, right) => right.score - left.score)
    .slice(0, 20);
  return responseFor(ranked, input.deliveryLocation);
}
