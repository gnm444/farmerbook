import type { FeaturedFarmerPublication } from "./queries";

const suppliedBiographySource = {
  id: "45000000-0000-4000-8000-000000000001",
  url: "https://rythunestham.in/november-2025-magazine/",
  publisher: "Rythunestham",
  title:
    "November 2025 magazine — pages 51–55, shared with FarmerBook by the farmer",
  publishedAt: null,
  sourceType: "operator-supplied biography and magazine extract",
  quality: "first_party",
  association: "professional_reference",
};

const teluguMagazineSource = {
  id: "45000000-0000-4000-8000-000000000002",
  url: "https://rythunestham.in/november-2025-magazine/",
  publisher: "Rythunestham",
  title:
    "Telugu magazine feature on Surabhi Gosala — pages 53–55, shared with FarmerBook by the farmer",
  publishedAt: null,
  sourceType: "operator-supplied Telugu magazine pages",
  quality: "third_party_coverage",
  association: "third_party_coverage",
};

const reportedProducts = [
  { name: "Coconut", categorySlug: "coconut" },
  { name: "Mango", categorySlug: "mango" },
  { name: "Papaya", categorySlug: "papaya" },
  { name: "Sapota", categorySlug: "sapota" },
  { name: "Guava", categorySlug: "guava" },
  { name: "Turmeric", categorySlug: "turmeric" },
  { name: "Ginger", categorySlug: "ginger" },
  { name: "Paddy", categorySlug: "rice" },
  { name: "Plantain", categorySlug: "banana" },
].map((product) => ({
  ...product,
  status: "reported" as const,
  sourceUrls: [suppliedBiographySource.url],
}));

export const mVenkataSubbaraoPublication: FeaturedFarmerPublication = {
  publication_id: "40000000-0000-4000-8000-000000000003",
  slug: "m-venkata-subbarao-surabhi-gosala",
  publication_revision: 1,
  publication_status: "published",
  fact_checked_at: "2026-08-27T12:00:00.000Z",
  published_at: "2026-08-27T12:00:00.000Z",
  snapshot: {
    fullName: "M. Venkata Subbarao",
    district: "Eluru",
    state: "Andhra Pradesh",
    locale: "en-IN",
    headline: "Natural farming centred on Surabhi Gosala in Eluru",
    deck:
      "At a reported 16-acre farm in Eluru, M. Venkata Subbarao combines orchard crops, paddy and fodder with Surabhi Gosala and a five-layer farming model.",
    whyFeatured:
      "M. Venkata Subbarao's shared farm biography describes a long-term natural-farming practice built around cattle, crop diversity and on-farm inputs. The profile records his account of the work rather than making a certification, product-quality or availability claim.",
    categorySlugs: ["cattle-rearing", "agroforestry", "rice"],
    limitations: [
      "This profile is based on a biography and magazine extract that M. Venkata Subbarao shared with FarmerBook through WhatsApp. FarmerBook has not independently inspected the farm.",
      "The stated land area, livestock count, crops, training and farming practices are self-reported and may change over time.",
      "FarmerBook does not make a certification claim for this farm. It has not independently verified product quality, livestock care, production methods, stock, prices, delivery or food-business registrations.",
      "Reported crops are not live FarmerBook listings or an order page.",
      "This is an editorial profile, not a FarmerBook member account, identity verification, endorsement or agricultural advice.",
    ],
    editorialDisclosure:
      "FarmerBook editorial preview based on operator-supplied farmer biography and a Rythunestham magazine reference; not membership, identity verification, certification, endorsement, a marketplace listing or agricultural advice.",
    personMetadata: {
      alternateNames: ["Venkata Subba Rao Eluru Gosala"],
      jobTitles: ["Natural farmer", "Cattle rearer"],
      homeLocation: "Eluru, Andhra Pradesh, India",
      knowsAbout: [
        "Natural farming",
        "Cattle rearing",
        "Five-layer farming",
        "Orchard crops",
        "Paddy cultivation",
      ],
    },
    media: null,
    socialLinks: [],
    sources: [suppliedBiographySource, teluguMagazineSource],
    claims: [
      {
        id: "46000000-0000-4000-8000-000000000001",
        key: "natural_farming_since_2015",
        type: "ecological_stewardship",
        statement:
          "In the biography shared with FarmerBook, Subbarao says he began natural farming in 2015 and uses inputs from Surabhi Gosala on the farm.",
        displayLabel: "Natural farming",
        displayValue: "Since 2015",
        displayContext: "Self-reported in the supplied biography",
        sources: [suppliedBiographySource],
      },
      {
        id: "46000000-0000-4000-8000-000000000002",
        key: "mixed_farm_system",
        type: "innovation",
        statement:
          "Subbarao reports a 16-acre farm combining coconut, mango, papaya, sapota, guava, turmeric, ginger, paddy, plantain and green fodder for cattle.",
        displayLabel: "Reported farm area",
        displayValue: "16 acres",
        displayContext: "Self-reported crop mix and land area",
        sources: [suppliedBiographySource],
      },
      {
        id: "46000000-0000-4000-8000-000000000003",
        key: "surabhi_gosala",
        type: "ecological_stewardship",
        statement:
          "The supplied biography reports that Surabhi Gosala is located on the farm and, at the time it was prepared, had 17 cows and 9 calves including Ongole, Gir, Sahiwal, desi and Punganur breeds.",
        displayLabel: "Reported livestock",
        displayValue: "17 cows + 9 calves",
        displayContext: "A dated, self-reported count",
        sources: [suppliedBiographySource],
      },
      {
        id: "46000000-0000-4000-8000-000000000004",
        key: "five_layer_model",
        type: "innovation",
        statement:
          "Subbarao reports following a five-layer model on the farm to the extent possible.",
        displayLabel: "Farm design",
        displayValue: "Five-layer model",
        displayContext: "Self-reported practice",
        sources: [suppliedBiographySource],
      },
      {
        id: "46000000-0000-4000-8000-000000000005",
        key: "telugu_magazine_feature",
        type: "knowledge_sharing",
        statement:
          "A Telugu Rythunestham magazine feature shared by Subbarao presents Surabhi Gosala, mixed crops and farm-made inputs as connected parts of his natural-farming approach. FarmerBook has summarised the supplied pages and has not independently verified the reported practices.",
        displayLabel: "Telugu feature",
        displayValue: "Pages 53–55",
        displayContext: "Magazine pages supplied by the farmer",
        sources: [teluguMagazineSource],
      },
    ],
    sections: [
      {
        kind: "origin",
        heading: "A shift to natural farming",
        body:
          "M. Venkata Subbarao reports beginning natural farming in 2015. His biography also records an eight-day natural-farming training in Kakinada in January 2016, attributed there to Sri Subhash Palekar.",
        claimKeys: ["natural_farming_since_2015"],
      },
      {
        kind: "work",
        heading: "Crops, fodder and Surabhi Gosala",
        body:
          "The farm is described as a mixed system: orchard crops, paddy, plantain, spices and green fodder are grown alongside the cattle. The biography says farm inputs used for cultivation come from Surabhi Gosala, which is situated on the farm. These are the farmer's reported practices; FarmerBook has not independently assessed the system or its results.",
        claimKeys: ["mixed_farm_system", "surabhi_gosala"],
      },
      {
        kind: "impact",
        heading: "Working with layers and diversity",
        body:
          "Subbarao says he follows a five-layer model wherever possible. His supplied crop list spans fruit trees, field crops, spices and fodder—an approach intended to keep several kinds of plants and farm activity together. FarmerBook presents this as a reported farm design, not as a guarantee of performance or suitability elsewhere.",
        claimKeys: ["five_layer_model"],
      },
      {
        kind: "community",
        heading: "తెలుగు పత్రికా కథనంలో సురభి గోశాల",
        body:
          "రైతు పంచుకున్న రైతునేస్తం తెలుగు పత్రికా పేజీలు (53–55) సురభి గోశాల, మిశ్రమ పంటలు మరియు వ్యవసాయ క్షేత్రంలో తయారయ్యే ఇన్పుట్లను ఆయన సహజ వ్యవసాయ పద్ధతిలో పరస్పరం అనుసంధానమైన భాగాలుగా వివరిస్తున్నాయి. ఈ సారాంశం పంచుకున్న పత్రికా పేజీల ఆధారంగా మాత్రమే రూపొందించబడింది; ఫార్మర్‌బుక్ స్వతంత్రంగా ఈ పద్ధతులను లేదా ఫలితాలను ధృవీకరించలేదు.",
        claimKeys: ["telugu_magazine_feature"],
      },
    ],
    reportedProducts,
    coverage: [
      {
        url: teluguMagazineSource.url,
        publisher: teluguMagazineSource.publisher,
        title: teluguMagazineSource.title,
        sourceType: "Telugu magazine feature shared by the farmer",
      },
    ],
    seo: {
      title: "M. Venkata Subbarao and Surabhi Gosala | FarmerBook",
      description:
        "An attributed editorial profile of M. Venkata Subbarao's reported natural-farming work and Surabhi Gosala in Eluru, Andhra Pradesh.",
      keywords: [
        "M. Venkata Subbarao",
        "Surabhi Gosala",
        "Eluru natural farming",
        "Andhra Pradesh farmer",
        "five-layer farming",
      ],
    },
  },
};
