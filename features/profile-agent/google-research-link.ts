import { knownFarmerHintsSchema, type KnownFarmerHints } from "./known-farmer-schemas";

export const GOOGLE_RESEARCH_ENDPOINT = "https://www.google.com/search";
export const GOOGLE_RESEARCH_QUERY_MAX_LENGTH = 400;

function withoutQuotes(value: string) {
  return value.replaceAll('"', "").trim();
}

export function buildKnownFarmerGoogleResearch(input: KnownFarmerHints) {
  const parsed = knownFarmerHintsSchema.parse(input);
  const query = [
    `"${withoutQuotes(parsed.fullName)}"`,
    "farmer agriculture farming",
    parsed.locationHint,
    parsed.farmingHint,
    "India",
  ]
    .filter(Boolean)
    .join(" ")
    .slice(0, GOOGLE_RESEARCH_QUERY_MAX_LENGTH);
  const url = new URL(GOOGLE_RESEARCH_ENDPOINT);
  url.searchParams.set("q", query);
  return { query, url: url.toString() };
}
