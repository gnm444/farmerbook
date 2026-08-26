import {
  blogPublicationSchema,
  type BlogPublication,
} from "./contracts";
import type { DailyEditorialBrief } from "./daily-editorial";

export const AUTONOMOUS_PUBLICATION_POLICY_VERSION =
  "owned-blog-standing-policy-2026-08-20-v1";
export const AUTONOMOUS_DAILY_PUBLICATION_LIMIT = 1;
export const AUTONOMOUS_MONTHLY_PUBLICATION_LIMIT = 31;

export type AutonomousPublicationDecisionCode =
  | "AUTO_ELIGIBLE"
  | "RISK_NOT_ELIGIBLE"
  | "SOURCE_MANIFEST_STALE"
  | "SOURCE_SCOPE_MISMATCH"
  | "CONTENT_SCHEMA_FAILED"
  | "CLAIM_POLICY_FAILED"
  | "PERSONAL_DATA_FAILED"
  | "CONTENT_LENGTH_FAILED"
  | "DAILY_LIMIT_REACHED"
  | "MONTHLY_LIMIT_REACHED";

export type AutonomousPublicationDecision = {
  eligible: boolean;
  code: AutonomousPublicationDecisionCode;
};

const disallowedClaimPatterns = [
  /\b(?:guarantee(?:d|s)?|certif(?:y|ies|ied)|assure(?:d|s)?|prove(?:d|s)?|eliminate(?:d|s)?|prevent(?:ed|s)?|cure(?:d|s)?|treat(?:ed|s)?)\b/i,
  /\b(?:always|never|risk[- ]free|chemical[- ]free|pesticide[- ]free|completely safe|completely pure)\b/i,
  /\b(?:yield|income|profit|premium|price|cost saving|return on investment)\b/i,
  /\b(?:dose|dosage|prescription|treatment|medicine|pesticide|fungicide|herbicide|insecticide)\b/i,
  /(?:₹|\$|\b(?:rs\.?|rupees?|dollars?)\b|\d+(?:\.\d+)?\s*%)/i,
  /\b\d+(?:[.,]\d+)?\b/,
  /https?:\/\//i,
  /<\/?(?:script|iframe|object|embed|style|link|meta)\b/i,
] as const;

const personalDataPatterns = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /(?:\+?91[\s.-]?)?[6-9]\d{9}\b/,
  /\b(?:my farm|our farm|I saw|I earned|I grew|I harvested|we earned|we harvested)\b/i,
] as const;

function publicationText(publication: BlogPublication) {
  return [
    publication.english.title,
    publication.english.excerpt,
    publication.english.dek,
    ...publication.english.sections.flatMap((section) => [
      section.heading,
      ...section.paragraphs,
      ...section.bullets,
    ]),
    publication.english.conclusion,
    publication.english.safetyNote,
  ].join("\n");
}

function exactSourceScope(
  publication: BlogPublication,
  brief: DailyEditorialBrief,
) {
  return publication.sources.length === brief.sources.length
    && publication.sources.every((source, index) => {
      const expected = brief.sources[index];
      return expected
        && source.title === expected.title
        && source.publisher === expected.publisher
        && source.url === expected.url;
    });
}

export function evaluateAutonomousPublication(input: {
  publication: unknown;
  brief: DailyEditorialBrief;
  runKey: string;
  sourceManifestFresh: boolean;
  dailyPublishedCount: number;
  monthlyPublishedCount: number;
}): AutonomousPublicationDecision {
  if (input.brief.riskClass !== "low") {
    return { eligible: false, code: "RISK_NOT_ELIGIBLE" };
  }
  if (!input.sourceManifestFresh) {
    return { eligible: false, code: "SOURCE_MANIFEST_STALE" };
  }
  if (input.dailyPublishedCount >= AUTONOMOUS_DAILY_PUBLICATION_LIMIT) {
    return { eligible: false, code: "DAILY_LIMIT_REACHED" };
  }
  if (input.monthlyPublishedCount >= AUTONOMOUS_MONTHLY_PUBLICATION_LIMIT) {
    return { eligible: false, code: "MONTHLY_LIMIT_REACHED" };
  }
  const parsed = blogPublicationSchema.safeParse(input.publication);
  if (!parsed.success) {
    return { eligible: false, code: "CONTENT_SCHEMA_FAILED" };
  }
  const publication = parsed.data;
  if (publication.category !== input.brief.category
    || publication.author !== "FarmerBook Blog Writing Agent"
    || publication.telugu
    || !publication.slug.startsWith(`${input.brief.key}-${input.runKey}-`)
    || !exactSourceScope(publication, input.brief)) {
    return { eligible: false, code: "SOURCE_SCOPE_MISMATCH" };
  }
  const text = publicationText(publication);
  if (personalDataPatterns.some((pattern) => pattern.test(text))) {
    return { eligible: false, code: "PERSONAL_DATA_FAILED" };
  }
  if (disallowedClaimPatterns.some((pattern) => pattern.test(text))) {
    return { eligible: false, code: "CLAIM_POLICY_FAILED" };
  }
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  if (words < 550 || words > 1_100) {
    return { eligible: false, code: "CONTENT_LENGTH_FAILED" };
  }
  return { eligible: true, code: "AUTO_ELIGIBLE" };
}

export async function blogPublicationFingerprint(publication: BlogPublication) {
  const canonical = blogPublicationSchema.parse(publication);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(canonical)),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
