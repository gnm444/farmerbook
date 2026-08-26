import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { blogPublicationSchema } from "@/features/blog/contracts";
import {
  CALCULATED_TRANSITION_SLUG,
  FOOD_TRACEABILITY_SLUG,
  GHEE_TRUST_SLUG,
  MONEY_CHARACTER_SLUG,
  WEALTH_HEALTH_PARADOX_SLUG,
  foundingBlogPublication,
} from "@/features/blog/published";
import { foodTraceabilityPublication } from "@/features/blog/publications/food-traceability";
import { gheeTrustPublication } from "@/features/blog/publications/ghee-trust";
import { moneyCharacterPublication } from "@/features/blog/publications/money-character";
import { wealthHealthParadoxPublication } from "@/features/blog/publications/wealth-health-paradox";
import { blogUi, translationNotice } from "@/features/blog/presentation";
import { SUPPORTED_LOCALES } from "@/lib/i18n/locales";
import { isPublicPath } from "@/proxy";

describe("managed FarmerBook Blog Writing Agent", () => {
  const agent = readFileSync("features/blog/agent.ts", "utf8");
  const dailyEditorial = readFileSync("features/blog/daily-editorial.ts", "utf8");
  const vite = readFileSync("vite.config.ts", "utf8");
  const worker = readFileSync("worker/index.ts", "utf8");
  const blogPage = readFileSync("app/blog/page.tsx", "utf8");
  const storyPage = readFileSync("app/blog/[slug]/page.tsx", "utf8");

  it("runs as its own scheduled Cloudflare managed Agent", () => {
    expect(vite).toContain('name: "BLOG_WRITING_AGENT"');
    expect(vite).toContain('class_name: "BlogWritingAgent"');
    expect(vite).toContain('tag: "blog-writing-agent-v1"');
    expect(worker).toContain('export { BlogWritingAgent }');
    expect(agent).toContain("DAILY_EDITORIAL_CRON_UTC");
    expect(agent).toContain("DAILY_EDITORIAL_CALLBACK");
    expect(agent).toContain("prepareDailyDraft");
    expect(agent).toContain("blog_agent_runs");
    expect(agent).toContain("cancelEditorialSchedules");
    expect(dailyEditorial).toContain('category: "food_safety"');
    expect(dailyEditorial).toContain('category: "farm_to_table"');
    expect(agent).toContain("natural-farming and food editor");
  });

  it("uses the cheapest allowlisted model within a two-dollar cap", () => {
    expect(agent).toContain('@cf/ibm-granite/granite-4.0-h-micro');
    expect(agent).toContain('@cf/ai4bharat/indictrans2-en-indic-1B');
    expect(agent).toContain("SUPPORTED_MODELS");
    expect(agent).toContain("DEFAULT_MONTHLY_AI_BUDGET_USD = 2");
    expect(agent).toContain("BLOG_MONTHLY_BUDGET_REACHED");
    expect(agent).toContain("estimatedAiSpendMicros");
  });

  it("keeps manual drafts review-bound and autonomous publication policy-bound", () => {
    expect(agent).toContain("'awaiting_review'");
    expect(agent).toContain('decision === "publish"');
    expect(agent).toContain("WHERE status = 'published'");
    expect(agent).toContain("autonomouslyPublishDraft");
    expect(agent).toContain("BLOG_AUTONOMOUS_PUBLISHING");
    expect(agent).toContain("visibility_status IN ('provisional', 'public')");
    expect(vite).toContain('name: "BLOG_PUBLICATION_VERIFIER_AGENT"');
    expect(vite).toContain('tag: "blog-publication-verifier-agent-v1"');
    expect(worker).toContain('export { BlogPublicationVerifierAgent }');
    expect(storyPage).toContain("data-publication-sha256");
  });

  it("exposes public collection and citation-rich article routes", () => {
    expect(blogPage).toContain('href={`/blog/${publication.slug}`}');
    expect(storyPage).toContain('"@type": "Article"');
    expect(storyPage).toContain("publication.sources.map");
    expect(CALCULATED_TRANSITION_SLUG).toBe(
      "calculated-transition-to-natural-farming",
    );
    expect(isPublicPath("/blog")).toBe(true);
    expect(isPublicPath(`/blog/${CALCULATED_TRANSITION_SLUG}`)).toBe(true);
    expect(isPublicPath(`/blog/${GHEE_TRUST_SLUG}`)).toBe(true);
    expect(isPublicPath(`/blog/${FOOD_TRACEABILITY_SLUG}`)).toBe(true);
    expect(isPublicPath(`/blog/${MONEY_CHARACTER_SLUG}`)).toBe(true);
    expect(isPublicPath(`/blog/${WEALTH_HEALTH_PARADOX_SLUG}`)).toBe(true);
  });
});

describe("founder wealth, health and stewardship editorial", () => {
  it("publishes valid reviewed content with an original AI-image disclosure", () => {
    expect(blogPublicationSchema.parse(wealthHealthParadoxPublication)).toEqual(
      wealthHealthParadoxPublication,
    );
    expect(wealthHealthParadoxPublication.author).toBe("Narasimha Gonapa");
    expect(wealthHealthParadoxPublication.english.title).toBe(
      "The Wealth We Accumulate, the Health We Abandon: Our Dangerous Paradox of Prosperity",
    );
    expect(wealthHealthParadoxPublication.heroImage).toMatchObject({
      src: "/images/blog/wealth-health-paradox-editorial.webp",
      provenance: "ai_generated",
      width: 1_600,
      height: 878,
    });
    expect(wealthHealthParadoxPublication.english.conclusion).toMatch(
      /— Narasimha Gonapa$/,
    );
  });

  it("keeps medical and organic-food claims evidence-calibrated", () => {
    const article = JSON.stringify(wealthHealthParadoxPublication);
    expect(article).toContain("cannot promise");
    expect(article).toContain("do not guarantee");
    expect(article).not.toContain("chemical-free food");
    expect(article).not.toContain("Disease-Free Longevity");
    expect(article).not.toContain("prevent chronic illness");
    expect(article).not.toContain("health insurance paid directly to the farmer");
    expect(wealthHealthParadoxPublication.sources.map((source) => new URL(source.url).hostname))
      .toEqual(expect.arrayContaining([
        "www.who.int",
        "nin.res.in",
        "www.fao.org",
        "icar.gov.in",
        "isha.sadhguru.org",
        "www.youtube.com",
      ]));
    expect(article).toContain("The silent crisis at the source: farmers and our land");
    expect(article).toContain("From extraction to expression: reclaiming how we relate");
    expect(article).toContain("Life Is Enriched By Giving, Not By Extraction");
  });

  it("renders image metadata, disclosure and structured data", () => {
    const storyPage = readFileSync("app/blog/[slug]/page.tsx", "utf8");
    const hero = readFileSync(
      "public/images/blog/wealth-health-paradox-editorial.webp",
    );
    expect(storyPage).toContain("summary_large_image");
    expect(storyPage).toContain("publication.heroImage.caption");
    expect(storyPage).toContain("AI-generated editorial illustration");
    expect(new TextDecoder().decode(hero.subarray(0, 4))).toBe("RIFF");
    expect(new TextDecoder().decode(hero.subarray(8, 12))).toBe("WEBP");
  });
});

describe("founder money and organic-farming editorial", () => {
  it("publishes the reviewed article under Narasimha Gonapa's name", () => {
    expect(blogPublicationSchema.parse(moneyCharacterPublication)).toEqual(
      moneyCharacterPublication,
    );
    expect(moneyCharacterPublication.author).toBe("Narasimha Gonapa");
    expect(moneyCharacterPublication.english.title).toBe(
      "Money Is a Mirror: What Organic Farming Teaches Us About Character",
    );
    expect(moneyCharacterPublication.english.conclusion).toContain(
      "Money may reveal our real character",
    );
    expect(moneyCharacterPublication.english.conclusion).toMatch(
      /— Narasimha Gonapa$/,
    );
  });

  it("does not claim certification, guaranteed trust, or image rights", () => {
    const publication = JSON.stringify(moneyCharacterPublication);
    expect(publication).toContain("does not guarantee");
    expect(publication).toContain("rights-cleared source was not available");
    expect(publication).not.toContain("certified organic farmer");
    expect(publication).not.toContain("hero_image");
  });
});

describe("community-derived food articles", () => {
  it("publishes valid reviewed Indian English and Telugu content", () => {
    expect(blogPublicationSchema.parse(gheeTrustPublication)).toEqual(
      gheeTrustPublication,
    );
    expect(blogPublicationSchema.parse(foodTraceabilityPublication)).toEqual(
      foodTraceabilityPublication,
    );
    expect(gheeTrustPublication.telugu?.title).toContain("ఐదు తనిఖీలు");
    expect(foodTraceabilityPublication.telugu?.title).toContain("ట్రేసబిలిటీ");
  });

  it("keeps unsupported WhatsApp claims out of the ghee article", () => {
    const english = JSON.stringify(gheeTrustPublication.english);
    const telugu = JSON.stringify(gheeTrustPublication.telugu);
    expect(english).toContain("not evidence that 95% of all ghee");
    expect(english).not.toContain("15,000");
    expect(english).not.toContain("25 to 30 litres");
    expect(telugu).not.toContain("15,000");
    expect(gheeTrustPublication.sources.map((source) => new URL(source.url).hostname))
      .toEqual(expect.arrayContaining(["fssai.gov.in", "www.youtube.com"]));
  });

  it("summarizes the shared traceability video without treating blockchain as verification", () => {
    const english = JSON.stringify(foodTraceabilityPublication.english);
    expect(english).toContain("30-minute project video");
    expect(english).toContain("does not inspect a field");
    expect(english).toContain("not verified");
    expect(foodTraceabilityPublication.sources[0]?.url).toBe(
      "https://www.youtube.com/watch?v=VwBg4-J0VZo",
    );
  });
});

describe("founding natural-farming article", () => {
  it("is a valid reviewed publication with official source links", () => {
    expect(blogPublicationSchema.parse(foundingBlogPublication)).toEqual(
      foundingBlogPublication,
    );
    expect(foundingBlogPublication.sources.map((source) => new URL(source.url).hostname))
      .toEqual(expect.arrayContaining([
        "naturalfarming.niti.gov.in",
        "soilhealth.dac.gov.in",
        "icar.gov.in",
        "pgsindia-ncof.gov.in",
      ]));
  });

  it("publishes reviewed Telugu and Indian English without unsafe guarantees", () => {
    const english = JSON.stringify(foundingBlogPublication.english);
    const telugu = JSON.stringify(foundingBlogPublication.telugu);
    expect(english).not.toContain("95%");
    expect(telugu).not.toContain("95%");
    expect(english).toContain("does not guarantee a 30–50% premium");
    expect(telugu).toContain("30–50% లేదా మరే ప్రీమియం ధరనూ హామీ ఇవ్వదు");
    expect(english).toContain("Twenty per cent can be an example, not a universal rule");
    expect(telugu).toContain("20% అనేది ఒక ఉదాహరణ మాత్రమే");
    expect(english).toContain("qualified local professional");
  });

  it("uses the required organic certification evidence label", () => {
    expect(JSON.stringify(foundingBlogPublication.english)).toContain(
      "Non-certified organic farmer (paperwork not yet completed to prove certification)",
    );
    expect(JSON.stringify(foundingBlogPublication.telugu)).toContain(
      "పత్రాలు అప్లోడ్ చేసి సమీక్ష పూర్తైన తర్వాత మాత్రమే",
    );
  });
});

describe("selected-language blog delivery", () => {
  it("covers Indian English and all 22 Scheduled Languages", () => {
    expect(SUPPORTED_LOCALES).toHaveLength(23);
    expect(SUPPORTED_LOCALES).toContain("te-IN");
    expect(SUPPORTED_LOCALES).toContain("ur-IN");
    expect(SUPPORTED_LOCALES).toContain("sat-Olck-IN");
  });

  it("discloses reviewed, AI-assisted, and fallback provenance", () => {
    expect(translationNotice("reviewed_original", "te-IN")).toBe(
      blogUi("te-IN").reviewed,
    );
    expect(translationNotice("ai_assisted_translation", "hi-IN")).toContain(
      "AI-assisted translation",
    );
    expect(translationNotice("english_fallback", "ur-IN")).toContain(
      "temporarily unavailable",
    );
  });
});
