import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const storyRoute = readFileSync(
  "app/featured-farmers/[slug]/page.tsx",
  "utf8",
);
const historicalProfile = readFileSync(
  "features/featured-farmers/narayana-reddy.ts",
  "utf8",
);
const sandeepProfile = readFileSync(
  "features/featured-farmers/sandeep-dasari.ts",
  "utf8",
);

describe("Featured Farmer metadata", () => {
  it("uses Article-about-Person semantics with owned sameAs and citations", () => {
    expect(storyRoute).toContain('"@type": "Article"');
    expect(storyRoute).toContain('"@type": "Person"');
    expect(storyRoute).toContain("sameAs: publication.snapshot.socialLinks");
    expect(storyRoute).toContain("citation: publication.snapshot.sources");
    expect(storyRoute).toContain("datePublished:");
    expect(storyRoute).toContain("dateModified:");
    expect(storyRoute).toContain("publishingPrinciples:");
    expect(storyRoute).toContain('"@type": "BreadcrumbList"');
    expect(storyRoute).toContain("wordCount:");
    expect(storyRoute).toContain("keywords:");
    expect(storyRoute).toContain("personMetadata");
    expect(storyRoute).toContain('publication.publication_status !== "preview"');
    expect(storyRoute).toContain("index: false");
    expect(storyRoute).not.toContain('alternateName: ["L Narayana Reddy"');
    expect(storyRoute).not.toContain('"@type": "FAQPage"');
    expect(storyRoute).not.toContain('"@type": "ProfilePage"');
    expect(storyRoute).not.toContain("interactionStatistic");
  });

  it("keeps the historical profile sourced and honest about media and social ownership", () => {
    expect(historicalProfile).toContain("L. Narayana Reddy");
    expect(historicalProfile).toContain("https://www.unsung.in/");
    expect(historicalProfile).toContain("https://www.indiatoday.in/");
    expect(historicalProfile).toContain("https://www.leisaindia.org/");
    expect(historicalProfile).toContain("https://www.youtube.com/watch");
    expect(historicalProfile).toContain("https://www.pib.gov.in/");
    expect(historicalProfile).toContain("milestones:");
    expect(historicalProfile).toContain("questions:");
    expect(historicalProfile).toContain("no verified social account owned by him");
    expect(historicalProfile).toContain("source-hosted preview");
    expect(historicalProfile).toContain("youtube_oembed");
    expect(historicalProfile).toContain("Naguvana Creations");
    expect(historicalProfile).toContain("media: null");
    expect(storyRoute).not.toContain("farmer-network-hero.webp");
    expect(historicalProfile).not.toContain("ProfilePage");
  });

  it("keeps the approved Sandeep publication free of member/store semantics", () => {
    expect(sandeepProfile).toContain('publication_status: "published"');
    expect(sandeepProfile).toContain("Sandeep Dasari");
    expect(sandeepProfile).toContain("Bommalaramaram");
    expect(sandeepProfile).toContain("@AvanivanFarms");
    expect(sandeepProfile).toContain("nzB61ZhIc1Q");
    expect(sandeepProfile).toContain("reportedProducts");
    expect(sandeepProfile).not.toContain("farmer_id");
    expect(sandeepProfile).not.toContain("produce_listings");
  });
});
