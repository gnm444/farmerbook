import type { FeaturedFarmerPublication } from "./queries";

const festivalSource = {
  id: "2e2473d4-d9ac-4f39-99eb-6893dc887f6c",
  url: "https://www.tribuneindia.com/news/business/discover-the-beauty-of-sustainable-clothing-and-crafts-ihmc-natural-dye-handmade-festival-in-chennai-29-30-31st-aug-and-bangalore-19-20-21st-sep/",
  publisher: "India Handmade Collective via BusinessWire India / The Tribune",
  title: "Natural Dye Handmade Festival participant announcement",
  publishedAt: "2025-08-30",
  sourceType: "third-party hosted festival announcement",
  quality: "third_party_coverage",
  association: "third_party_coverage",
};

const publishedAt = "2026-10-16T00:23:25.000Z";

export const sarvaniChundruSukalpaPublication: FeaturedFarmerPublication = {
  publication_id: "51d5a9c5-a06e-49e8-b3b6-1318bfe6ae33",
  slug: "sarvani-chundru-sukalpa-ecostore",
  publication_revision: 1,
  publication_status: "published",
  fact_checked_at: publishedAt,
  published_at: publishedAt,
  snapshot: {
    fullName: "Sarvani Chundru",
    district: null,
    state: null,
    locale: "en-IN",
    headline: "Sukalpa Ecostore and a practice of conscious living",
    deck:
      "Sarvani Chundru's supplied brochure describes a move from microbiology work into Sukalpa Ecostore, a venture centred on handwoven clothing, natural materials and everyday products. This is a profile of a sustainability entrepreneur; the available sources do not establish that she is a farmer.",
    whyFeatured:
      "Sukalpa's supplied brochure describes handspun and handwoven fabrics, low-waste tailoring and household products. A 2025 India Handmade Collective announcement separately names Sukalpa among its festival brands. The founder and product details remain attributed to the privately supplied brochure.",
    sections: [
      {
        kind: "origin",
        heading: "From microbiology to Sukalpa",
        body:
          "The undated brochure supplied to FarmerBook names Sarvani Chundru as Sukalpa Ecostore's founder (page 2). It says she studied microbiology at postgraduate level and left corporate work to pursue a lifestyle aligned with her environmental values. This is Sarvani's account as presented by Sukalpa; FarmerBook has not independently verified her education or employment history.",
        claimKeys: ["founder_story"],
      },
      {
        kind: "work",
        heading: "Clothing shaped by materials and making",
        body:
          "Sukalpa's supplied brochure describes handspun, handwoven and naturally dyed clothing, with an emphasis on low-waste tailoring (pages 7 and 11). It names South Indian fabrics such as Ponduru Khadi and describes clothes for children, teens and women. These are the store's descriptions of its range, not an independent assessment of each garment's materials or environmental impact.",
        claimKeys: ["clothing_range"],
      },
      {
        kind: "work",
        heading: "An everyday product range",
        body:
          "The supplied brochure also presents handmade chocolate made with coarsely ground cacao, natural household cleansers and kapok pillows (pages 6 and 12–14). It lists example ingredients for chocolate and cleaning powders. FarmerBook has not checked current availability, ingredients, safety, health effects or certification; this editorial article is not an order page.",
        claimKeys: ["reported_product_range"],
      },
      {
        kind: "community",
        heading: "Taking the work to a craft audience",
        body:
          "A 30 August 2025 India Handmade Collective festival announcement listed Sukalpa Ecostore among brands invited to its natural-dye and handmade events in Chennai and Bengaluru. That supports a public connection to the craft community; the announcement does not independently verify Sarvani's biography, product composition or the store's current operations.",
        claimKeys: ["festival_listing"],
      },
    ],
    categorySlugs: ["featured-professionals"],
    limitations: [
      "The supplied brochure identifies Sarvani as Sukalpa Ecostore's founder, but does not say she farms. This entry is labelled Featured Professionals within the Featured Farmers collection.",
      "The undated brochure was supplied to FarmerBook for this profile and is kept on file; it is not published or linked from this page. Founder and product details are attributed to it by page number, not presented as independently verified facts.",
      "The brochure is undated and self-reported. Current stock, materials, production practices and environmental outcomes have not been independently verified.",
      "The 2025 festival announcement names Sukalpa Ecostore as a participating brand; it does not confirm current participation or the founder's biography.",
      "The brochure's health and safety assertions have not been evaluated and are not repeated as FarmerBook claims.",
      "This editorial profile is not a FarmerBook member account, certification, endorsement, marketplace listing or purchasing channel.",
    ],
    claims: [
      {
        id: "f8c8cf49-9aa5-4b81-890d-46461ac2f4a9",
        key: "founder_story",
        type: "leadership",
        statement:
          "Sukalpa Ecostore's supplied brochure identifies Sarvani Chundru as its founder and describes her prior microbiology studies and work.",
        displayLabel: "Founder",
        displayValue: "Sarvani Chundru",
        displayContext: "Sukalpa's supplied brochure",
        sources: [],
      },
      {
        id: "b133221f-f090-4e4e-a435-be6355982dd5",
        key: "clothing_range",
        type: "innovation",
        statement:
          "Sukalpa's brochure describes handspun, handwoven and naturally dyed clothing made with a low-waste tailoring focus.",
        displayLabel: "Reported focus",
        displayValue: "Handwoven clothing",
        displayContext: "Store description; not independently audited",
        sources: [],
      },
      {
        id: "278cacb1-660d-4b5d-8e65-a6420fec01ca",
        key: "reported_product_range",
        type: "significance",
        statement:
          "The supplied brochure presents handmade cacao chocolate, natural cleaning powders and kapok pillows alongside clothing.",
        displayLabel: "Brochure range",
        displayValue: "Clothing and home goods",
        displayContext: "Undated brochure; availability unconfirmed",
        sources: [],
      },
      {
        id: "6758b2b3-a22b-457f-8e4a-28b76586c142",
        key: "festival_listing",
        type: "community",
        statement:
          "A 2025 India Handmade Collective festival announcement listed Sukalpa Ecostore among its participating brands.",
        displayLabel: "Craft community",
        displayValue: "2025 festival listing",
        displayContext: "India Handmade Collective announcement",
        sources: [festivalSource],
      },
    ],
    sources: [festivalSource],
    socialLinks: [],
    coverage: [
      {
        url: festivalSource.url,
        publisher: festivalSource.publisher,
        title: festivalSource.title,
        sourceType: "Festival announcement",
      },
    ],
    personMetadata: {
      jobTitles: ["Founder of Sukalpa Ecostore", "Sustainability entrepreneur"],
      homeLocation: "India",
      knowsAbout: ["Handspun textiles", "Handwoven clothing", "Low-waste tailoring", "Sustainable products"],
    },
    media: null,
    editorialDisclosure:
      "FarmerBook editorial profile based on an undated Sukalpa Ecostore brochure supplied privately to FarmerBook and a linked 2025 festival announcement. Brochure-based details are attributed in the story but the source document is not published. Sarvani Chundru is featured as a sustainability professional; farming activity is not established. This is not membership, identity verification, certification, endorsement or a marketplace listing.",
  },
};
