import type { FeaturedFarmerPublication } from "./queries";

const ownedChannelSource = {
  id: "43000000-0000-4000-8000-000000000001",
  url: "https://www.youtube.com/@AvanivanFarms",
  publisher: "Avanivan Farms",
  title: "Avanivan Farms — farm-owned YouTube channel",
  publishedAt: null,
  sourceType: "youtube channel",
  quality: "owned_social_profile",
  association: "owned_social_profile",
};

const farmTourSource = {
  id: "43000000-0000-4000-8000-000000000002",
  url: "https://www.youtube.com/watch?v=PaJk_KSsD5I",
  publisher: "Avanivan Farms",
  title: "A Tour of Avani Van Farms — Part 1",
  publishedAt: null,
  sourceType: "first-party YouTube farm tour",
  quality: "first_party",
  association: "professional_reference",
};

const farmTourPartTwoSource = {
  id: "43000000-0000-4000-8000-000000000004",
  url: "https://www.youtube.com/watch?v=gP1G_HbD4EA",
  publisher: "Avanivan Farms",
  title: "A Tour of Avani Van Farms — Part 2",
  publishedAt: null,
  sourceType: "first-party YouTube farm tour",
  quality: "first_party",
  association: "professional_reference",
};

const miAndhraSource = {
  id: "43000000-0000-4000-8000-000000000003",
  url: "https://www.youtube.com/watch?v=nzB61ZhIc1Q",
  publisher: "Mi Andhra Adapaduchu",
  title:
    "Leaving a software career for organic farming — interview and farm tour",
  publishedAt: null,
  sourceType: "third-party YouTube interview",
  quality: "third_party_coverage",
  association: "third_party_coverage",
};

const reportedProducts = [
  { name: "Desi cow milk", categorySlug: "cow-milk" },
  { name: "Buffalo milk", categorySlug: "buffalo-milk" },
  { name: "Desi chicken", categorySlug: "chicken-meat" },
  { name: "Desi eggs", categorySlug: "chicken-eggs" },
  { name: "Paneer", categorySlug: "paneer" },
  { name: "Ghee", categorySlug: "ghee" },
  {
    name: "Cold-pressed oils (types not yet specified)",
    categorySlug: "oilseeds",
  },
  { name: "Jaggery", categorySlug: "jaggery" },
  { name: "Mulberry", categorySlug: "mulberry" },
].map((product) => ({
  ...product,
  status: "reported" as const,
  sourceUrls: [ownedChannelSource.url],
}));

export const sandeepDasariPublication = {
  publication_id: "40000000-0000-4000-8000-000000000002",
  slug: "sandeep-dasari-avani-van-farms",
  publication_revision: 3,
  publication_status: "published",
  fact_checked_at: "2026-08-25T01:26:08.000Z",
  published_at: "2026-08-25T00:57:44.000Z",
  snapshot: {
    fullName: "Sandeep Dasari",
    contactEmail: "avanivanfarms@gmail.com",
    district: "Bommalaramaram",
    state: "Telangana",
    locale: "en-IN",
    headline: "Building a farm that works more like a living forest",
    deck:
      "At Avani Van Farms in Bommalaramaram, Sandeep Dasari is developing a natural-farming system around Gir cows, minimal soil disturbance, recycled organic matter and a long-term goal of reducing outside inputs.",
    whyFeatured:
      "Sandeep's story connects a personal decision to leave software engineering with a practical experiment in soil stewardship. His approach brings together Gir cows, retained surface biomass, water management and on-farm waste processing. The farm is still a work in progress: self-sufficiency is his stated goal, not a completed result, and the practices and reported product catalog have not been independently verified.",
    categorySlugs: ["cattle-rearing", "compost", "mulberry"],
    limitations: [
      "Non-certified organic farmer (paperwork not yet completed to prove certification).",
      "This is an editorial profile, not a FarmerBook member account, identity verification, endorsement or medical recommendation.",
      "The story currently relies on a farm-owned YouTube channel, a first-party farm tour and one third-party YouTube interview. FarmerBook found no safe independent non-social source for this Sandeep Dasari.",
      "Statements about farming, animal care and farm infrastructure are attributed to Sandeep or the supplied interview and have not been independently inspected by FarmerBook.",
      "The ₹140–₹150 per-litre figure is Sandeep's dated production-cost estimate in the supplied interview, not a current sale price, quality guarantee or health claim.",
      "The reported products are not live FarmerBook listings. Stock, price, delivery, certification and food-business registration have not been confirmed.",
    ],
    editorialDisclosure:
      "FarmerBook editorial profile based on cited public video sources and operator-supplied information; not membership, identity verification, certification, endorsement, a marketplace listing or medical advice.",
    personMetadata: {
      jobTitles: ["Farmer", "Former software engineer"],
      homeLocation: "Bommalaramaram, Telangana, India",
      knowsAbout: [
        "Natural farming",
        "Gir cattle",
        "Minimal tillage",
        "Soil organic matter",
        "Farm composting",
      ],
    },
    media: null,
    sourceHostedPreview: {
      assetUrl: "https://i.ytimg.com/vi/gP1G_HbD4EA/maxresdefault.jpg",
      sourceUrl: farmTourPartTwoSource.url,
      altText: "Sandeep Dasari seated beside a Gir cow at Avani Van Farms",
      credit: "Avanivan Farms, via YouTube",
      creditUrl: ownedChannelSource.url,
      provider: "youtube_oembed",
      focalPoint: "left",
    },
    sourceHostedBackground: {
      assetUrl: "https://i.ytimg.com/vi/PaJk_KSsD5I/maxresdefault.jpg",
      sourceUrl: farmTourSource.url,
      altText: "Sandeep Dasari among mulberry plants at Avani Van Farms",
      credit: "Avanivan Farms, via YouTube",
      creditUrl: ownedChannelSource.url,
      provider: "youtube_oembed",
      focalPoint: "center",
    },
    socialLinks: [
      {
        platform: "youtube",
        url: ownedChannelSource.url,
      },
    ],
    sources: [
      ownedChannelSource,
      farmTourSource,
      farmTourPartTwoSource,
      miAndhraSource,
    ],
    claims: [
      {
        id: "44000000-0000-4000-8000-000000000001",
        key: "career_and_motivation",
        type: "significance",
        statement:
          "In the supplied Mi Andhra Adapaduchu interview, Sandeep says he left software engineering for full-time farming and describes his father's death from cancer in 2020 as a personal turning point in how he thought about food for his family.",
        displayLabel: "Career change",
        displayValue: "Software to soil",
        displayContext: "Sandeep's interview account",
        sources: [miAndhraSource],
      },
      {
        id: "44000000-0000-4000-8000-000000000002",
        key: "indigenous_cattle",
        type: "ecological_stewardship",
        statement:
          "Sandeep says Avani Van Farms raises Gir cows and describes their manure and biological activity as part of the farm's nutrient cycle.",
        displayLabel: "Gir cattle",
        displayValue: "Gir cows",
        displayContext: "Reported in the farm interview",
        sources: [miAndhraSource, farmTourSource, farmTourPartTwoSource],
      },
      {
        id: "44000000-0000-4000-8000-000000000003",
        key: "animal_care_and_milk_cost",
        type: "ecological_stewardship",
        statement:
          "In the interview, Sandeep describes avoiding growth hormones and unnecessary antibiotics and estimates that his approach to Gir-cow milk can cost approximately ₹140–₹150 per litre to produce without a loss.",
        displayLabel: "Milk cost estimate",
        displayValue: "₹140–₹150/L",
        displayContext: "Dated, self-reported production estimate",
        sources: [miAndhraSource],
      },
      {
        id: "44000000-0000-4000-8000-000000000004",
        key: "minimal_soil_disturbance",
        type: "innovation",
        statement:
          "Sandeep describes avoiding tractor ploughing and intensive tillage, trimming grass with brush cutters and retaining the cut biomass on the soil surface to decompose.",
        displayLabel: "Soil approach",
        displayValue: "Minimal tillage",
        displayContext: "Sandeep's stated farm practice",
        sources: [miAndhraSource, farmTourSource],
      },
      {
        id: "44000000-0000-4000-8000-000000000005",
        key: "six_year_goal",
        type: "innovation",
        statement:
          "Sandeep describes a six-year ambition for the farm to reduce external inputs and artificial watering by learning from the way forests recycle water, biomass and nutrients.",
        displayLabel: "Long-term ambition",
        displayValue: "Six years",
        displayContext: "A goal, not a verified outcome",
        sources: [miAndhraSource],
      },
      {
        id: "44000000-0000-4000-8000-000000000006",
        key: "water_and_compost_systems",
        type: "ecological_stewardship",
        statement:
          "The supplied farm tour and interview describe a water reservoir, an irrigation filtration trap, Black Soldier Fly larvae and bio-waste composting at Avani Van Farms.",
        displayLabel: "On-farm systems",
        displayValue: "Water + compost",
        displayContext: "Shown or described in supplied videos",
        sources: [farmTourSource, miAndhraSource],
      },
    ],
    sections: [
      {
        kind: "origin",
        heading: "From software engineering to full-time farming",
        body:
          "In a Mi Andhra Adapaduchu interview, Sandeep describes leaving a well-paid software career to pursue full-time farming near Hyderabad. He says the death of his father from cancer in 2020 prompted him to think more deeply about the food his family consumed and to focus on natural-farming practices.\n\nThis is Sandeep's personal account of a life-changing loss and the decision that followed it. FarmerBook does not infer that a particular food, chemical or farming practice caused his father's illness.",
        claimKeys: ["career_and_motivation"],
      },
      {
        kind: "work",
        heading: "Gir cows at the centre of the farm",
        body:
          "Sandeep says Avani Van Farms raises Gir cows. He describes an animal-care approach that avoids growth hormones and unnecessary antibiotics, and he presents the cattle as participants in the farm ecology: manure and associated biological activity help return organic material to the soil.\n\nHe also estimates that producing Gir-cow milk under this approach can cost approximately ₹140–₹150 per litre without operating at a loss. That is his dated interview estimate—not a current FarmerBook price assessment or a guarantee about milk quality, health outcomes or production costs.",
        claimKeys: ["indigenous_cattle", "animal_care_and_milk_cost"],
      },
      {
        kind: "work",
        heading: "Protecting soil by disturbing it less",
        body:
          "Sandeep explains that he avoids tractor ploughing and intensive tillage because he wants to protect the soil community beneath the surface. Instead of turning grass into the soil, the farm trims it with brush cutters and leaves the cut material to decompose as surface cover.\n\nThis describes Sandeep's rationale and reported practice; it does not establish that every minimal-tillage method is suitable for every crop, soil or climate.",
        claimKeys: ["minimal_soil_disturbance"],
      },
      {
        kind: "impact",
        heading: "Designing for fewer external inputs",
        body:
          "Avani Van Farms is intended to become more self-sustaining over time. Sandeep describes a six-year ambition to reduce dependence on external inputs and artificial watering by learning from the way forests recycle water, biomass and nutrients. This remains a future goal rather than a verified present-day outcome.\n\nThe supplied videos also describe a water reservoir, a filtration-trap system for irrigation, Black Soldier Fly larvae and bio-waste composting—elements intended to keep organic material cycling through the farm.",
        claimKeys: ["six_year_goal", "water_and_compost_systems"],
      },
    ],
    reportedProducts,
    coverage: [
      {
        url: farmTourSource.url,
        publisher: farmTourSource.publisher,
        title: farmTourSource.title,
        sourceType: "First-party farm tour",
        thumbnail: {
          assetUrl: "https://i.ytimg.com/vi/PaJk_KSsD5I/maxresdefault.jpg",
          altText: "Video thumbnail showing Sandeep Dasari at Avani Van Farms",
          provider: "youtube_oembed",
        },
      },
      {
        url: farmTourPartTwoSource.url,
        publisher: farmTourPartTwoSource.publisher,
        title: farmTourPartTwoSource.title,
        sourceType: "First-party farm tour",
        thumbnail: {
          assetUrl: "https://i.ytimg.com/vi/gP1G_HbD4EA/maxresdefault.jpg",
          altText: "Video thumbnail showing Sandeep Dasari beside a Gir cow",
          provider: "youtube_oembed",
        },
      },
      {
        url: miAndhraSource.url,
        publisher: miAndhraSource.publisher,
        title: miAndhraSource.title,
        sourceType: "Third-party interview and farm tour",
        thumbnail: {
          assetUrl: "https://i.ytimg.com/vi/nzB61ZhIc1Q/maxresdefault.jpg",
          altText: "Video thumbnail for the Mi Andhra Adapaduchu farm interview",
          provider: "youtube_oembed",
        },
      },
    ],
    seo: {
      title: "Sandeep Dasari and Avani Van Farms | FarmerBook",
      description:
        "An attributed editorial profile of Sandeep Dasari's natural-farming work at Avani Van Farms in Bommalaramaram, Telangana.",
      keywords: [
        "Sandeep Dasari",
        "Avani Van Farms",
        "Bommalaramaram",
        "Telangana farming",
        "Gir cows",
        "natural farming",
      ],
    },
  },
} satisfies FeaturedFarmerPublication;
