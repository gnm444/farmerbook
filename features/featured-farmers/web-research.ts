import {
  featuredFarmerResearchHintsSchema,
  type FeaturedFarmerResearchHints,
} from "./schemas";

export const WEB_RESEARCH_ENDPOINT = "https://www.google.com/search";
export const WEB_RESEARCH_QUERY_MAX_LENGTH = 400;

export type FeaturedFarmerResearchQuery = {
  purpose: "identity" | "significance" | "institutions" | "social" | "current";
  query: string;
  url: string;
};

function withoutQuotes(value: string) {
  return value.replaceAll('"', "").trim();
}

function researchQuery(
  purpose: FeaturedFarmerResearchQuery["purpose"],
  parts: Array<string | undefined>,
): FeaturedFarmerResearchQuery {
  const query = parts.filter(Boolean).join(" ").slice(0, WEB_RESEARCH_QUERY_MAX_LENGTH);
  const url = new URL(WEB_RESEARCH_ENDPOINT);
  url.searchParams.set("q", query);
  return { purpose, query, url: url.toString() };
}

export function buildFeaturedFarmerResearchQueries(
  input: FeaturedFarmerResearchHints,
) {
  const parsed = featuredFarmerResearchHintsSchema.parse(input);
  const name = `"${withoutQuotes(parsed.fullName)}"`;
  const location = [parsed.districtHint, parsed.stateHint].filter(Boolean).join(" ");
  return [
    researchQuery("identity", [name, "farmer agriculture farming", location, parsed.farmingHint, "India"]),
    researchQuery("significance", [name, "farmer innovation award impact community", location, "India"]),
    researchQuery("institutions", [name, "farmer ICAR KVK government FPO cooperative award", location]),
    researchQuery("social", [name, "farmer YouTube Instagram Facebook LinkedIn", location]),
    researchQuery("current", [name, "farmer latest", String(new Date().getUTCFullYear()), location]),
  ];
}
