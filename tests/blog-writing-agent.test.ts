import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { blogPublicationSchema } from "@/features/blog/contracts";
import {
  CALCULATED_TRANSITION_SLUG,
  foundingBlogPublication,
} from "@/features/blog/published";
import { blogUi, translationNotice } from "@/features/blog/presentation";
import { SUPPORTED_LOCALES } from "@/lib/i18n/locales";
import { isPublicPath } from "@/proxy";

describe("managed FarmerBook Blog Writing Agent", () => {
  const agent = readFileSync("features/blog/agent.ts", "utf8");
  const vite = readFileSync("vite.config.ts", "utf8");
  const worker = readFileSync("worker/index.ts", "utf8");
  const blogPage = readFileSync("app/blog/page.tsx", "utf8");
  const storyPage = readFileSync("app/blog/[slug]/page.tsx", "utf8");

  it("runs as its own scheduled Cloudflare managed Agent", () => {
    expect(vite).toContain('name: "BLOG_WRITING_AGENT"');
    expect(vite).toContain('class_name: "BlogWritingAgent"');
    expect(vite).toContain('tag: "blog-writing-agent-v1"');
    expect(worker).toContain('export { BlogWritingAgent }');
    expect(agent).toContain('WEEKLY_CRON_UTC = "30 3 * * 2"');
    expect(agent).toContain('"prepareWeeklyDraft"');
  });

  it("uses the cheapest allowlisted model within a four-dollar cap", () => {
    expect(agent).toContain('@cf/ibm-granite/granite-4.0-h-micro');
    expect(agent).toContain('@cf/ai4bharat/indictrans2-en-indic-1B');
    expect(agent).toContain("SUPPORTED_MODELS");
    expect(agent).toContain("DEFAULT_MONTHLY_AI_BUDGET_USD = 4");
    expect(agent).toContain("BLOG_MONTHLY_BUDGET_REACHED");
    expect(agent).toContain("estimatedAiSpendMicros");
  });

  it("keeps agent-written drafts private until an administrator reviews them", () => {
    expect(agent).toContain("'awaiting_review'");
    expect(agent).toContain('decision === "publish"');
    expect(agent).toContain("WHERE status = 'published'");
    expect(agent).not.toContain("autoPublish");
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
