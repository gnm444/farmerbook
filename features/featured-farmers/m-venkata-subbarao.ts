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
    media: {
      assetUrl:
        "https://farmerbook.in/images/featured-farmers/venkata-subbarao-profile-portrait.png",
      altText:
        "M. Venkata Subbarao walking through the tree-covered farm at Surabhi Gosala",
      credit: "Farmer-supplied photograph, used with permission",
      rightsBasis: "subject_permission",
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
      {
        kind: "work",
        heading: "English reading of the Telugu Rythunestham feature",
        body:
          "This English rendering is a detailed summary of the Telugu Rythunestham pages supplied by M. Venkata Subbarao, rather than an independent audit of the farm. The feature presents Surabhi Gosala as the centre of an integrated natural-farming system in Eluru. It connects cattle care, crop diversity, on-farm inputs, water management and direct observation of the fields. The recurring idea is that the farm is designed as a working cycle: cattle provide material for farm-made preparations; crops and fodder provide biomass and feed; residues return to the soil; and a diverse orchard and field-crop mix spreads activity across the year.\n\nThe article describes a farm that combines tree crops, annual crops, spices and fodder. Coconut and fruit trees create a longer-lived canopy, while banana, papaya, mango, sapota, guava, turmeric, ginger, paddy and green fodder are presented as complementary elements. Rather than treating each crop as a separate enterprise, the feature frames them as layers and companions in the same landscape. This aligns with the five-layer approach reported in Subbarao's supplied biography: taller trees, shorter fruit crops, herbs or spices, ground-level crops and fodder can occupy different spaces and seasons. The article's photographs show orchards, banana plants, field work and harvests, reinforcing that mixed-crop design.",
        claimKeys: [
          "telugu_magazine_feature",
          "mixed_farm_system",
          "five_layer_model",
        ],
      },
      {
        kind: "work",
        heading: "Cattle, farm-made inputs and soil care",
        body:
          "Cattle are presented as more than a separate dairy activity. The Rythunestham story shows the gosala, cattle shed and cattle at rest, and describes preparations made on the farm using cattle-derived materials. It reports that these preparations are used as inputs in cultivation and that the farm avoids depending entirely on purchased external inputs. The article also shows equipment and containers used for preparing or handling these materials. FarmerBook does not treat this as proof of a specific product, recipe, efficacy or certification; it records what the supplied feature says about the farm's approach.\n\nSoil care is another major theme. The feature describes organic matter, mulching and farm-made inputs as practical ways the farmer seeks to maintain soil condition. It refers to biomass from the farm and to returning material to the fields instead of seeing it as waste. The images of compost-like material, field rows and planted trees support the article's emphasis on soil cover and on keeping biological activity within the farm system. The story also connects soil work with water: it describes irrigation and field-level attention to water use, but FarmerBook does not publish the article's exact cost or output calculations as current, verified figures. Such numbers can change with season, prices, weather and farm conditions.",
        claimKeys: ["telugu_magazine_feature", "surabhi_gosala"],
      },
      {
        kind: "lessons",
        heading: "What the feature says about farm management",
        body:
          "The Telugu feature is also a farm-management narrative. It portrays decisions being made through observation: looking at crop condition, using different plots for different crops, tending fodder, maintaining the cattle area and working with trees over several years. Its account of fruit trees and intercrops suggests a preference for staggered harvests instead of one single crop cycle. That can create several kinds of farm work and potential produce at different times, although the article does not constitute a live catalogue or an assurance of availability. The reported crops on this FarmerBook profile should therefore be read as an attributed crop list, not a promise to sell or deliver them.\n\nThe profile pages also show people working in the field, an entrance to the farm, the cattle shed and a small processing or storage area. These photographs give visual context to the written article: a working farm is portrayed as a place of routine maintenance, not merely a demonstration plot. The feature's value lies in making visible the relationships it describes—trees, fodder, cattle, soil, water and labour. It does not supply a controlled comparison with another farm, a third-party inspection report or a guarantee that the same methods will suit every place.\n\nOverall, the supplied Telugu article describes Subbarao's work as a long-term effort to link natural farming with Surabhi Gosala and a diverse, layered farm design. FarmerBook has translated this into plain English to make the source accessible to more readers. Every substantive practice, area, livestock count and outcome on this page remains attributed to the farmer's shared biography or the supplied Rythunestham feature. Readers interested in adopting any farming method should seek locally appropriate professional guidance and evaluate their own soil, water, climate, animals, regulations and market conditions.",
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
            "https://farmerbook.in/images/featured-farmers/venkata-subbarao-rythunestham-page-55.jpg",
          altText:
            "Permitted Telugu Rythunestham magazine clipping featuring Surabhi Gosala",
          provider: "farmerbook_permitted",
        },
      },
    ],
    imageGallery: [
      {
        assetUrl:
          "https://farmerbook.in/images/featured-farmers/venkata-subbarao-rythunestham-pages-50-51.png",
        altText:
          "Permitted Telugu Rythunestham magazine pages 50–51 about Surabhi Gosala and the farm's crops",
        caption:
          "Rythunestham, November 2025, pages 50–51 — supplied by the farmer with permission to reuse.",
        sourceUrl: teluguMagazineSource.url,
      },
      {
        assetUrl:
          "https://farmerbook.in/images/featured-farmers/venkata-subbarao-rythunestham-pages-52-53.png",
        altText:
          "Permitted Telugu Rythunestham magazine pages 52–53 showing M. Venkata Subbarao in the farm and crop photographs",
        caption:
          "Rythunestham, November 2025, pages 52–53 — supplied by the farmer with permission to reuse.",
        sourceUrl: teluguMagazineSource.url,
      },
      {
        assetUrl:
          "https://farmerbook.in/images/featured-farmers/venkata-subbarao-rythunestham-pages-54-55.png",
        altText:
          "Permitted Telugu Rythunestham magazine pages 54–55 showing Surabhi Gosala, farm inputs and farm entrance",
        caption:
          "Rythunestham, November 2025, pages 54–55 — supplied by the farmer with permission to reuse.",
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
