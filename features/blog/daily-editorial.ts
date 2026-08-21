export const DAILY_EDITORIAL_CRON_UTC = "30 3 * * *";
export const DAILY_EDITORIAL_TIME_ZONE = "Asia/Kolkata";
export const DAILY_EDITORIAL_CALLBACK = "prepareDailyDraft";
export const LEGACY_WEEKLY_EDITORIAL_CALLBACK = "prepareWeeklyDraft";
export const DAILY_SOURCE_MANIFEST_VERSION =
  "daily-editorial-source-manifest-2026-08-20-v1";
export const DAILY_SOURCE_MAX_AGE_DAYS = 180;
export const DAILY_DRAFT_LIMIT = 1;
export const MONTHLY_DRAFT_LIMIT = 31;

const IST_OFFSET_MS = 330 * 60 * 1_000;
const SOURCE_REVIEWED_AT = "2026-08-20T00:00:00.000Z";

export type DailyEditorialSource = {
  title: string;
  publisher: string;
  url: string;
  scope: string;
  reviewedAt: string;
};

export type DailyEditorialBrief = {
  key: string;
  topic: string;
  category: "natural_farming" | "food_safety" | "farm_to_table";
  riskClass: "low" | "medium";
  allowedClaimScope: string;
  prohibitedClaims: readonly string[];
  sources: readonly DailyEditorialSource[];
};

const naturalFarming: DailyEditorialSource = {
  title: "Natural Farming",
  publisher: "NITI Aayog — Natural Farming Initiative",
  url: "https://naturalfarming.niti.gov.in/natural-farming/",
  scope: "Definition, biomass recycling, mulching and on-farm formulations.",
  reviewedAt: SOURCE_REVIEWED_AT,
};

const soilHealth: DailyEditorialSource = {
  title: "Natural Farming and scientific interpretation of Soil Health Card reports",
  publisher: "Indian Council of Agricultural Research",
  url: "https://icar.gov.in/index.php/hi/node/25263",
  scope: "Balanced soil-health interpretation and natural-farming field guidance.",
  reviewedAt: SOURCE_REVIEWED_AT,
};

const pgsIndia: DailyEditorialSource = {
  title: "PGS-India Certification System — revised guidelines and standards",
  publisher: "National Centre for Organic & Natural Farming",
  url: "https://pgsindia-ncof.gov.in/Default/assets/front/PDF/Revised_PGS_India_Guidlines.pdf",
  scope: "Certification, participation, transparency, PGS-Organic, PGS-Green and accurate organic-status claims.",
  reviewedAt: SOURCE_REVIEWED_AT,
};

const fssaiScreening: DailyEditorialSource = {
  title: "Check Adulteration at Home",
  publisher: "Food Safety and Standards Authority of India",
  url: "https://fssai.gov.in/inspection/check-adulteration",
  scope: "Official DART and Food Safety Magic Box demonstrations for screening common adulterants in food.",
  reviewedAt: SOURCE_REVIEWED_AT,
};

const fssaiRegulations: DailyEditorialSource = {
  title: "Food Safety and Standards Regulations",
  publisher: "Food Safety and Standards Authority of India",
  url: "https://fssai.gov.in/food-law/regulations",
  scope: "Current food-safety, labelling and display regulatory source index.",
  reviewedAt: SOURCE_REVIEWED_AT,
};

const gs1Traceability: DailyEditorialSource = {
  title: "GS1 Global Traceability Standard",
  publisher: "GS1",
  url: "https://www.gs1.org/standards/gs1-global-traceability-standard/current-standard",
  scope: "Traceable objects, parties, locations, events and data across supply chains.",
  reviewedAt: SOURCE_REVIEWED_AT,
};

const noGuarantees = [
  "guaranteed yield, income, price, premium, safety or certification outcome",
  "crop-specific input, pesticide, medical, legal or financial instruction",
  "named-person testimonial or personal data",
] as const;

const naturalBrief = (
  key: string,
  topic: string,
  allowedClaimScope: string,
): DailyEditorialBrief => ({
  key,
  topic,
  category: "natural_farming",
  riskClass: "medium",
  allowedClaimScope,
  prohibitedClaims: noGuarantees,
  sources: [naturalFarming, soilHealth],
});

const certificationBrief = (
  key: string,
  topic: string,
  allowedClaimScope: string,
): DailyEditorialBrief => ({
  key,
  topic,
  category: "natural_farming",
  riskClass: "medium",
  allowedClaimScope,
  prohibitedClaims: noGuarantees,
  sources: [pgsIndia],
});

const trustBrief = (
  key: string,
  topic: string,
  allowedClaimScope: string,
): DailyEditorialBrief => ({
  key,
  topic,
  category: "farm_to_table",
  riskClass: "low",
  allowedClaimScope,
  prohibitedClaims: noGuarantees,
  sources: [pgsIndia, gs1Traceability],
});

const traceabilityBrief = (
  key: string,
  topic: string,
  allowedClaimScope: string,
): DailyEditorialBrief => ({
  key,
  topic,
  category: "farm_to_table",
  riskClass: "low",
  allowedClaimScope,
  prohibitedClaims: noGuarantees,
  sources: [gs1Traceability],
});

const foodSafetyBrief = (
  key: string,
  topic: string,
  allowedClaimScope: string,
): DailyEditorialBrief => ({
  key,
  topic,
  category: "food_safety",
  riskClass: "medium",
  allowedClaimScope,
  prohibitedClaims: noGuarantees,
  sources: [fssaiScreening, fssaiRegulations],
});

export const DAILY_EDITORIAL_TOPICS: readonly DailyEditorialBrief[] = [
  naturalBrief("small-natural-farming-trial", "How to compare a small natural-farming trial with current practice", "General trial planning, observation and questions for local qualified support."),
  naturalBrief("mulch-observation-journal", "How to keep a useful mulch observation journal", "General observation records for soil cover, moisture and field conditions."),
  naturalBrief("soil-health-conversation", "How to prepare for a soil-health conversation with a qualified adviser", "General soil-health literacy and questions; no diagnosis or prescription."),
  naturalBrief("on-farm-input-records", "What to record when preparing an on-farm natural-farming input", "Names, dates, ingredients and observations without recipe or efficacy claims."),
  naturalBrief("transition-field-notes", "Field notes that make a natural-farming transition easier to evaluate", "General before-and-after record keeping without causal or yield claims."),
  naturalBrief("seasonal-observation-boundaries", "Why seasonal observations should not be presented as universal farming results", "The limits of one-field and one-season observations."),
  certificationBrief("organic-label-evidence", "What an organic label proves—and what it does not", "Accurate distinctions between certification evidence and broader quality claims."),
  certificationBrief("under-conversion-language", "What ‘under conversion’ means in an organic-farming journey", "Accurate PGS-Green and conversion-stage language."),
  certificationBrief("pgs-peer-review-literacy", "How peer review and transparency support PGS-India", "General participation, review and transparency concepts in PGS-India."),
  certificationBrief("organic-claim-wording", "How farmers can describe cultivation practices without overstating certification", "Careful separation of practice descriptions from certified status."),
  certificationBrief("certificate-question-checklist", "Questions consumers can ask about an organic-certification claim", "Respectful evidence questions and official verification boundaries."),
  certificationBrief("documents-and-conduct", "Why certification documents and responsible conduct both matter", "Certification evidence plus the limits of documents as a trust guarantee."),
  trustBrief("small-first-order", "Why a small first order can help farmers and consumers build trust", "Bounded transactions, clear expectations and gradual trust."),
  trustBrief("clear-order-commitments", "Five commitments to clarify before a direct farm order", "Product, quantity, timing, payment and delivery records without price advice."),
  trustBrief("seasonal-variation-conversation", "How farmers and consumers can discuss reasonable seasonal variation", "Transparent communication without quality or safety guarantees."),
  trustBrief("fair-cancellation-practice", "Why timely cancellation communication matters in direct farm trade", "Commitment records and respectful communication; no legal advice."),
  trustBrief("problem-resolution-record", "What a fair problem-resolution record should capture", "Issue, evidence, response and agreed next step without dispute adjudication."),
  trustBrief("farm-visit-questions", "Questions that make a farm visit informative without turning it into certification", "Observation and respectful questions; no verification claim."),
  traceabilityBrief("batch-identity-basics", "Why a simple batch identity matters in farm-to-table trade", "General traceable-object and event concepts."),
  traceabilityBrief("harvest-packing-record", "A practical harvest-and-packing record for direct sales", "Dates, lot identity and handoff events without compliance guarantees."),
  traceabilityBrief("traceability-limits", "What traceability records can prove—and where their limits begin", "Recorded identities and events versus unverified cultivation or safety claims."),
  traceabilityBrief("lot-code-literacy", "How a lot code helps people ask better questions about food", "General lot identification and lookup concepts."),
  traceabilityBrief("storage-handoff-notes", "Why storage and transport handoff notes belong in a traceability trail", "General location, custody and event records."),
  traceabilityBrief("buyer-seller-order-ledger", "A simple order ledger for farmer–consumer relationships", "Order, fulfilment and payment-status records without financial advice."),
  foodSafetyBrief("screening-versus-lab", "Why a home adulteration screen is not the same as a laboratory conclusion", "Official screening demonstrations and their evidentiary limits."),
  foodSafetyBrief("food-adulteration-evidence-checks", "How consumers can screen food-adulteration concerns without making unsupported purity claims", "Official home-screening demonstrations and cautious interpretation."),
  foodSafetyBrief("label-regulation-lookup", "How to find the current official source before making a food-label claim", "Using the FSSAI regulation index and recording the version consulted."),
  foodSafetyBrief("unsafe-purity-shortcuts", "Why appearance and taste alone cannot prove food purity", "Limits of sensory impressions and the role of appropriate evidence."),
  foodSafetyBrief("food-concern-escalation", "Where to take a serious food-safety concern", "General escalation to the relevant authority, laboratory or qualified professional."),
  foodSafetyBrief("evidence-first-product-story", "How to tell a farm-product story without turning it into a safety guarantee", "Separating origin and process records from purity, health and safety claims."),
];

export const AUTONOMOUS_EDITORIAL_TOPICS = DAILY_EDITORIAL_TOPICS.filter(
  (brief) => brief.riskClass === "low",
);

export function indiaDayKey(date: Date) {
  return new Date(date.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

export function indiaMonthKey(date: Date) {
  return indiaDayKey(date).slice(0, 7);
}

function deterministicTopicIndex(runKey: string, topicCount: number) {
  let hash = 2_166_136_261;
  for (const character of runKey) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0) % topicCount;
}

export function selectDailyEditorialBrief(runKey: string) {
  return DAILY_EDITORIAL_TOPICS[
    deterministicTopicIndex(runKey, DAILY_EDITORIAL_TOPICS.length)
  ];
}

export function selectDailyAutonomousBrief(runKey: string) {
  return AUTONOMOUS_EDITORIAL_TOPICS[
    deterministicTopicIndex(runKey, AUTONOMOUS_EDITORIAL_TOPICS.length)
  ];
}

export function sourceHealth(
  brief: DailyEditorialBrief,
  now: Date,
  maxAgeDays = DAILY_SOURCE_MAX_AGE_DAYS,
) {
  const nowTime = now.getTime();
  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1_000;
  const staleUrls = brief.sources
    .filter((source) => {
      const reviewedTime = Date.parse(source.reviewedAt);
      return !Number.isFinite(reviewedTime)
        || reviewedTime > nowTime + 24 * 60 * 60 * 1_000
        || nowTime - reviewedTime > maxAgeMs;
    })
    .map((source) => source.url);
  const oldestReviewedAt = brief.sources
    .map((source) => source.reviewedAt)
    .sort()[0] ?? null;
  return {
    fresh: staleUrls.length === 0,
    oldestReviewedAt,
    staleUrls,
  };
}

export function editorialScheduleIdsToCancel(
  schedules: readonly { id: string; callback: string }[],
  keepDailyScheduleId: string | null,
) {
  return schedules
    .filter((schedule) =>
      schedule.callback === LEGACY_WEEKLY_EDITORIAL_CALLBACK
      || (schedule.callback === DAILY_EDITORIAL_CALLBACK
        && schedule.id !== keepDailyScheduleId))
    .map((schedule) => schedule.id);
}
