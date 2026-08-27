import type { FeaturedFarmerPublication } from "./queries";

const suppliedBiographySource = {
  id: "45000000-0000-4000-8000-000000000001",
  url: "https://rythunestham.in/november-2025-magazine/",
  publisher: "Rythunestham",
  title:
    "November 2025 magazine — pages 50–55, shared with FarmerBook by the farmer",
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
    "Telugu magazine feature on Surabhi Gosala — pages 50–55, shared with FarmerBook by the farmer",
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
    headline: "A living natural-farming landscape built around Surabhi Gosala",
    deck:
      "M. Venkata Subbarao’s reported 16-acre farm near Eluru brings together cattle, coconut and fruit trees, banana, paddy, spices and fodder. At its centre is Surabhi Gosala—the place from which he describes building farm-made inputs, observing the soil and growing a diverse landscape over time.",
    whyFeatured:
      "The Rythunestham feature and Subbarao’s shared biography present a farm shaped by patience: cattle care, soil cover, water attention, trees, food crops and fodder are treated as connected work rather than separate activities. This profile makes that story accessible in English while keeping every farm-specific detail attributed to the supplied sources.",
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
    media: {
      assetUrl:
        "https://farmerbook.in/images/featured-farmers/venkata-subbarao-profile-portrait.png",
      altText:
        "M. Venkata Subbarao walking through the tree-covered farm at Surabhi Gosala",
      credit: "Farmer-supplied photograph, used with permission",
      rightsBasis: "subject_permission",
    },
    sourceHostedBackground: {
      assetUrl:
        "https://farmerbook.in/images/featured-farmers/venkata-subbarao-rythunestham-page-51-background.png",
      sourceUrl: teluguMagazineSource.url,
      altText:
        "M. Venkata Subbarao among banana and coconut plants at Surabhi Gosala, from the permitted Rythunestham feature",
      credit: "Rythunestham, November 2025, page 51 — reused with permission",
      creditUrl: teluguMagazineSource.url,
      provider: "farmerbook_permitted",
      focalPoint: "center",
    },
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
        displayValue: "Pages 50–55",
        displayContext: "Magazine pages supplied by the farmer",
        sources: [teluguMagazineSource],
      },
    ],
    sections: [
      {
        kind: "origin",
        heading: "A journey from professional life to a farm classroom",
        body:
          "M. Venkata Subbarao’s supplied biography describes a transition into natural farming in 2015 after his professional career. It records that he attended an eight-day training in Kakinada in January 2016, attributed there to Sri Subhash Palekar. The Rythunestham pages then portray the years that followed as hands-on learning: observing plants, cattle, water and soil instead of treating farming as a fixed recipe. The feature presents him walking through orchards and mixed plantings, with the farm itself becoming a place for continued practice and learning.\n\nThis profile does not claim that one method suits every farm. Rather, it records the farmer’s stated effort to develop a locally rooted system in Eluru—one where practical decisions are made season by season and where the condition of the field matters as much as a planned crop calendar.",
        claimKeys: ["natural_farming_since_2015"],
      },
      {
        kind: "work",
        heading: "Surabhi Gosala: cattle as part of the farming cycle",
        body:
          "In the supplied feature, Surabhi Gosala is not presented as a separate dairy unit placed beside crops. It is described as one part of the farm’s larger working cycle. Subbarao reports that the cattle area is on the farm and that materials from the gosala are used in farm-made preparations for cultivation. The magazine photographs show the cattle shed, cattle, storage vessels and the day-to-day spaces where those preparations are handled.\n\nHis shared biography recorded 17 cows and 9 calves at the time it was prepared, including Ongole, Gir, Sahiwal, desi and Punganur breeds. That is a dated self-reported count, not a current inventory. What the story makes clear is the role he gives cattle: care of animals, fodder, biomass and cultivation are meant to remain connected. FarmerBook records this as the farm’s reported approach and does not certify inputs, methods, products or outcomes.",
        claimKeys: ["mixed_farm_system", "surabhi_gosala"],
      },
      {
        kind: "impact",
        heading: "Sixteen acres of crops, trees, spices and fodder",
        body:
          "Subbarao describes a reported 16-acre farm with coconut, mango, papaya, sapota, guava, banana, turmeric, ginger, paddy and green fodder. The Rythunestham pages show coconut palms and fruit trees above banana and other crops, as well as field areas, harvests and planted rows. Together they give a clear visual impression of a mixed landscape rather than a single-crop holding.\n\nThe supplied biography says he follows a five-layer design wherever possible. In simple terms, that means making room for plants at different heights and growth cycles: taller trees above shorter fruit crops, with spices, ground-level crops and fodder occupying other spaces. The purpose described in the feature is diversity—different kinds of biomass, food, shade, roots and farm work across the year. It is a reported design principle, not a promise of yield, income or performance elsewhere.",
        claimKeys: ["five_layer_model"],
      },
      {
        kind: "community",
        heading: "తెలుగు పత్రికా కథనంలో సురభి గోశాల",
        body:
          "రైతు పంచుకున్న రైతునేస్తం తెలుగు పత్రికా పేజీలు (53–55) సురభి గోశాల, మిశ్రమ పంటలు మరియు వ్యవసాయ క్షేత్రంలో తయారయ్యే ఇన్పుట్లను ఆయన సహజ వ్యవసాయ పద్ధతిలో పరస్పరం అనుసంధానమైన భాగాలుగా వివరిస్తున్నాయి. ఈ సారాంశం పంచుకున్న పత్రికా పేజీల ఆధారంగా మాత్రమే రూపొందించబడింది; ఫార్మర్‌బుక్ స్వతంత్రంగా ఈ పద్ధతులను లేదా ఫలితాలను ధృవీకరించలేదు.",
        claimKeys: ["telugu_magazine_feature"],
      },
      {
        kind: "work",
        heading: "Reading the Telugu feature: a farm designed as relationships",
        body:
          "The five supplied Telugu pages tell a coherent story: the farm is designed through relationships. Cattle are linked to farm-made inputs; fodder is linked to animal care; crop residue and organic matter are linked to soil cover; trees, banana and field crops are linked through space and season. The photographs move between orchard, crop rows, harvested produce, the gosala, water equipment and the farm entrance, making the system feel like a lived working landscape rather than an abstract model.\n\nThe article repeatedly returns to diversity. Coconut and fruit trees form a longer-lived canopy, while banana, papaya, mango, sapota, guava, turmeric, ginger, paddy and green fodder are described as complementary elements. Different crops do not all mature together, and the feature presents that spread of activity as part of the farm’s resilience. FarmerBook’s English reading is an interpretation of the supplied Telugu pages; it does not independently audit reported area, livestock, costs, yields or agricultural results.",
        claimKeys: [
          "telugu_magazine_feature",
          "mixed_farm_system",
          "five_layer_model",
        ],
      },
      {
        kind: "work",
        heading: "Soil cover, farm-made inputs and careful water use",
        body:
          "The Rythunestham article describes farm-made preparations, organic matter and mulching as practical parts of Subbarao’s reported soil-care approach. It shows compost-like material, containers and field rows, and describes returning biological material to the farm rather than treating it as waste. The emphasis is on keeping soil covered, feeding plant life with material available within the system and observing the field over time.\n\nWater is another visible part of the story. The supplied pages include irrigation infrastructure and refer to attention to water use at plot level. FarmerBook deliberately does not repeat the article’s precise financial or output calculations as current facts: crop prices, weather, labour, water availability and farm conditions change. The valuable lesson for readers is not a universal formula, but the discipline of connecting water, soil cover, fodder, trees and livestock in everyday farm management.",
        claimKeys: ["telugu_magazine_feature", "surabhi_gosala"],
      },
      {
        kind: "lessons",
        heading: "What a visitor can learn from the farm story",
        body:
          "For a visitor, the feature offers a way to look at a farm beyond individual crops. It points to the questions Subbarao appears to work with: What can grow together? What becomes fodder or mulch? How can the cattle area and cultivation support each other? Where does water move? What needs attention today, and what takes years of care? The farm images show routine work—walking rows, tending trees, handling harvests, caring for animals and maintaining the farm entrance and working areas.\n\nThat is why this profile features him. The story is not of a miracle method or a guaranteed outcome; it is of sustained attention to a connected farm. The reported crop list is not a live catalogue, and the profile makes no promise about availability, prices, delivery, certification or product quality. It is an attributed record of one farmer’s experience in Eluru, shared so that others can understand the ideas and ask better questions about their own land, water, climate and animals.",
        claimKeys: ["telugu_magazine_feature", "mixed_farm_system"],
      },
    ],
    reportedProducts,
    coverage: [
      {
        url: teluguMagazineSource.url,
        publisher: teluguMagazineSource.publisher,
        title: teluguMagazineSource.title,
        sourceType: "Telugu magazine feature shared by the farmer",
        thumbnail: {
          assetUrl:
            "https://farmerbook.in/images/featured-farmers/venkata-subbarao-rythunestham-page-55.png",
          altText:
            "High-resolution Telugu Rythunestham magazine page featuring Surabhi Gosala",
          provider: "farmerbook_permitted",
        },
      },
    ],
    imageGallery: [
      {
        assetUrl:
          "https://farmerbook.in/images/featured-farmers/venkata-subbarao-rythunestham-page-50.png",
        altText:
          "High-resolution Telugu Rythunestham magazine page 50 about Surabhi Gosala and the farm's crops",
        caption:
          "Rythunestham, November 2025, page 50 — original high-resolution magazine page, reused with permission.",
        sourceUrl: teluguMagazineSource.url,
      },
      {
        assetUrl:
          "https://farmerbook.in/images/featured-farmers/venkata-subbarao-rythunestham-page-51.png",
        altText:
          "High-resolution Telugu Rythunestham magazine page 51 about Surabhi Gosala",
        caption:
          "Rythunestham, November 2025, page 51 — original high-resolution magazine page, reused with permission.",
        sourceUrl: teluguMagazineSource.url,
      },
      {
        assetUrl:
          "https://farmerbook.in/images/featured-farmers/venkata-subbarao-rythunestham-page-52.png",
        altText:
          "High-resolution Telugu Rythunestham magazine page 52 showing M. Venkata Subbarao and farm photographs",
        caption:
          "Rythunestham, November 2025, page 52 — original high-resolution magazine page, reused with permission.",
        sourceUrl: teluguMagazineSource.url,
      },
      {
        assetUrl:
          "https://farmerbook.in/images/featured-farmers/venkata-subbarao-rythunestham-page-53.png",
        altText:
          "High-resolution Telugu Rythunestham magazine page 53 showing M. Venkata Subbarao and farm photographs",
        caption:
          "Rythunestham, November 2025, page 53 — original high-resolution magazine page, reused with permission.",
        sourceUrl: teluguMagazineSource.url,
      },
      {
        assetUrl:
          "https://farmerbook.in/images/featured-farmers/venkata-subbarao-rythunestham-page-54.png",
        altText:
          "High-resolution Telugu Rythunestham magazine page 54 showing Surabhi Gosala and farm-made inputs",
        caption:
          "Rythunestham, November 2025, page 54 — original high-resolution magazine page, reused with permission.",
        sourceUrl: teluguMagazineSource.url,
      },
      {
        assetUrl:
          "https://farmerbook.in/images/featured-farmers/venkata-subbarao-rythunestham-page-55.png",
        altText:
          "High-resolution Telugu Rythunestham magazine page 55 showing Surabhi Gosala and the farm entrance",
        caption:
          "Rythunestham, November 2025, page 55 — original high-resolution magazine page, reused with permission.",
        sourceUrl: teluguMagazineSource.url,
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
