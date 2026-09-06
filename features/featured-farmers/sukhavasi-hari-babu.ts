import type { FeaturedFarmerPublication } from "./queries";

const channelSource = {
  id: "43000000-0000-4000-8000-000000000101",
  url: "https://www.youtube.com/@naturalfarmingharibabu-liv6281",
  publisher: "Natural Farming Hari Babu - Live Village Life",
  title: "Natural Farming Hari Babu - Live Village Life — YouTube channel",
  publishedAt: null,
  sourceType: "first-party YouTube channel",
  quality: "owned_social_profile",
  association: "owned_social_profile",
};

const icarSource = {
  id: "43000000-0000-4000-8000-000000000102",
  url: "https://naarm.org.in/wp-content/uploads/2025/08/New-item-August-23-2025-115-FoCARS.pdf",
  publisher: "ICAR–NAARM",
  title: "115th FoCARS: interaction on natural and organic farming",
  publishedAt: "2025-08-23",
  sourceType: "institutional reference",
  quality: "institutional_reference",
  association: "professional_reference",
};

const manageSource = {
  id: "43000000-0000-4000-8000-000000000103",
  url: "https://www.manage.gov.in/publications/Success%20Stories%20-%20Farmers.pdf",
  publisher: "MANAGE",
  title: "Inspiring Stories from Innovative Farmers — Hari Babu",
  publishedAt: null,
  sourceType: "institutional farmer case study",
  quality: "institutional_reference",
  association: "professional_reference",
};

const icfreSource = {
  id: "43000000-0000-4000-8000-000000000104",
  url: "https://nrdp.icfre.gov.in/national-database-slem-practitioners/",
  publisher: "ICFRE",
  title: "National Database of SLEM Practitioners — Mr. Hari Babu",
  publishedAt: null,
  sourceType: "official practitioner database",
  quality: "official_record",
  association: "professional_reference",
};

const hmtvSource = {
  id: "43000000-0000-4000-8000-000000000105",
  url: "https://www.hmtvlive.com/hmtv-agri/high-density-farming-in-10-acres-farmer-hari-babu-success-story--24610",
  publisher: "HMTV Agri",
  title: "High-density farming in 10 acres — Farmer Hari Babu success story",
  publishedAt: null,
  sourceType: "third-party reporting",
  quality: "independent_reporting",
  association: "third_party_coverage",
};

const videos = [
  {
    id: "43000000-0000-4000-8000-000000000106",
    url: "https://www.youtube.com/watch?v=rOgz9dLGQLo",
    title: "Hari babu created a food forest within 7 yrs||hari babu ||natural farming",
    views: "363,382",
  },
  {
    id: "43000000-0000-4000-8000-000000000107",
    url: "https://www.youtube.com/watch?v=iX2_0hzgTNQ",
    title: "Star fruit||China guava||avocado ||jackfruit ||Hari Babu ||Organic ||natural",
    views: "155,390",
  },
  {
    id: "43000000-0000-4000-8000-000000000108",
    url: "https://www.youtube.com/watch?v=cq6dQyfaN_Y",
    title: "First time Litchi fruits in our garden",
    views: "66,800",
  },
  {
    id: "43000000-0000-4000-8000-000000000109",
    url: "https://www.youtube.com/watch?v=Ar3YBFpzWbI",
    title: "Beauty of vakkaya.....live fencing",
    views: "63,100",
  },
  {
    id: "43000000-0000-4000-8000-000000000110",
    url: "https://www.youtube.com/watch?v=kdl3fUJjgcI",
    title: "Thieves destroyed Sandalwood trees",
    views: "49,900",
  },
  {
    id: "43000000-0000-4000-8000-000000000111",
    url: "https://www.youtube.com/watch?v=wffTIE0XftI",
    title: "200 coffee & 200 avocados plants in one acre",
    views: "31,700",
  },
  {
    id: "43000000-0000-4000-8000-000000000112",
    url: "https://www.youtube.com/watch?v=OrDPouEJpv4",
    title: "Farmers can sustain only by natural farming ||hari babu ||natural farming",
    views: "16,777",
  },
  {
    id: "43000000-0000-4000-8000-000000000113",
    url: "https://www.youtube.com/watch?v=Z0lXn6VA97w",
    title: "This Miyawaki food forest is my dream project||hari babu ||natural farming",
    views: "10,266",
  },
] as const;

const sourceForVideo = (video: (typeof videos)[number]) => ({
  id: video.id,
  url: video.url,
  publisher: channelSource.publisher,
  title: video.title,
  publishedAt: null,
  sourceType: "first-party YouTube video",
  quality: "first_party",
  association: "professional_reference",
});

const videoSources = videos.map(sourceForVideo);
const observedViews = "Observed 28 Aug 2026; YouTube counts change over time";

export const sukhavasiHariBabuPublication = {
  publication_id: "40000000-0000-4000-8000-000000000003",
  slug: "sukhavasi-hari-babu-natural-farming",
  publication_revision: 1,
  publication_status: "published",
  fact_checked_at: "2026-08-28T09:00:00.000Z",
  published_at: "2026-08-28T09:00:00.000Z",
  snapshot: {
    fullName: "Sukhavasi Hari Babu",
    district: null,
    state: "Telangana",
    locale: "en-IN",
    headline: "Growing a food forest through high-density natural farming",
    deck:
      "Sukhavasi Hari Babu uses his public channel, Hari Babu Org Farming, to document a practical natural-farming journey: dense horticulture, food-forest thinking, cow-based biological inputs, soil care and a wide range of fruit and medicinal plants.",
    whyFeatured:
      "Hari Babu's work is compelling because it joins an ecological idea with the patient, visible work of farming. His videos move from fruit trees and forest plants to soil inputs, livestock systems, harvesting and the everyday questions that shape a farm. The public record also places him in Telangana's natural-farming conversation: ICAR–NAARM records his participation in a natural and organic farming interaction, while MANAGE and ICFRE describe an integrated farming model associated with his name. This profile brings those strands together without turning a reported farm story into a certification, guarantee or FarmerBook inspection.",
    categorySlugs: [
      "fruit-orchards",
      "agroforestry",
      "medicinal-aromatic-plants",
      "cattle-rearing",
      "compost",
      "nursery-saplings",
    ],
    limitations: [
      "This is an attributed editorial profile, not a FarmerBook membership record, identity verification, certification or endorsement.",
      "The exact farm address and district are not stated consistently enough in the public sources to publish here; Telangana is the supported state-level reference.",
      "Farm size, tree counts, animal counts, crop lists and input practices are reported by cited institutional or first-party sources and have not been independently inspected by FarmerBook.",
      "The video cards are a curated high-view selection located in public YouTube results, ordered by view counts observed on 28 August 2026. They are not a guaranteed complete all-time ranking and counts may change.",
      "Natural and organic farming practices vary by soil, climate, crop and local rules. The profile does not provide medical, pesticide, yield or income guarantees.",
      "Hari Babu Org Farming is presented as the channel or public name found in the source material; FarmerBook has not verified it as a registered organization or marketplace.",
    ],
    editorialDisclosure:
      "FarmerBook editorial profile based on a first-party YouTube channel and videos plus cited institutional and third-party sources; not membership, identity verification, certification, endorsement, a marketplace listing or medical advice.",
    personMetadata: {
      alternateNames: ["Hari Babu", "Hari Babu Org Farming"],
      jobTitles: ["Farmer", "Natural-farming practitioner", "Agricultural educator"],
      homeLocation: "Telangana, India",
      knowsAbout: [
        "Natural farming",
        "Organic farming",
        "High-density planting",
        "Food forests",
        "Integrated farming",
        "Soil health",
        "Jeevamrutham",
        "Fruit orchards",
        "Medicinal plants",
      ],
    },
    media: {
      assetUrl: "/images/featured-farmers/hari-babu-jackfruit.jpg",
      altText: "Jackfruits growing on a tree in Hari Babu's orchard",
      credit: "Photo supplied for FarmerBook's Hari Babu profile",
      rightsBasis: "subject_permission",
    },
    imageGallery: [
      {
        assetUrl: "/images/featured-farmers/hari-babu-jackfruit.jpg",
        altText: "Jackfruits growing on a tree in Hari Babu's orchard",
        caption: "Jackfruits growing in the orchard; image supplied for this profile.",
        sourceUrl:
          "https://farmerbook.in/featured-farmers/sukhavasi-hari-babu-natural-farming",
      },
      {
        assetUrl: "/images/featured-farmers/hari-babu-orchard.jpg",
        altText: "Dense orchard plantings in Hari Babu's farm",
        caption: "Dense orchard plantings; image supplied for this profile.",
        sourceUrl:
          "https://farmerbook.in/featured-farmers/sukhavasi-hari-babu-natural-farming",
      },
    ],
    video: {
      assetUrl:
        "/images/featured-farmers/hari-babu-field-video-20260902.mp4",
      posterUrl:
        "/images/featured-farmers/hari-babu-field-video-20260902-poster.jpg",
      title: "Hari Babu among the orchard plantings",
      description:
        "A supplied field video featuring Sukhavasi Hari Babu among the orchard plantings.",
      credit: "Video supplied for FarmerBook's Hari Babu profile",
      rightsBasis: "subject_permission",
    },
    sourceHostedPreview: {
      assetUrl: "https://i.ytimg.com/vi/rOgz9dLGQLo/maxresdefault.jpg",
      sourceUrl: videos[0].url,
      altText: "Hari Babu's food-forest farming video thumbnail",
      credit: "Natural Farming Hari Babu, via YouTube",
      creditUrl: channelSource.url,
      provider: "youtube_oembed",
      focalPoint: "center",
    },
    sourceHostedBackground: {
      assetUrl: "https://i.ytimg.com/vi/iX2_0hzgTNQ/maxresdefault.jpg",
      sourceUrl: videos[1].url,
      altText: "Hari Babu's fruit-growing video thumbnail",
      credit: "Natural Farming Hari Babu, via YouTube",
      creditUrl: channelSource.url,
      provider: "youtube_oembed",
      focalPoint: "center",
    },
    socialLinks: [{ platform: "youtube", url: channelSource.url }],
    sources: [
      channelSource,
      icarSource,
      manageSource,
      icfreSource,
      hmtvSource,
      ...videoSources,
    ],
    claims: [
      {
        id: "44000000-0000-4000-8000-000000000101",
        key: "public_channel_mission",
        type: "knowledge_sharing",
        statement:
          "The channel description says Sukhavasi Hari Babu uses Hari Babu Org Farming to reach people with information about the benefits of high-density natural and organic farming.",
        displayLabel: "Public teaching",
        displayValue: "Natural-farming channel",
        displayContext: "Channel description",
        sources: [channelSource],
      },
      {
        id: "44000000-0000-4000-8000-000000000102",
        key: "telangana_practitioner",
        type: "significance",
        statement:
          "ICAR–NAARM identifies Sri Hari Babu Sukhavasi as a progressive natural farmer from Telangana and records his participation in a natural and organic farming interaction in August 2025.",
        displayLabel: "Public recognition",
        displayValue: "ICAR–NAARM interaction",
        displayContext: "Institutional report, 23 Aug 2025",
        sources: [icarSource],
      },
      {
        id: "44000000-0000-4000-8000-000000000103",
        key: "soil_health_focus",
        type: "ecological_stewardship",
        statement:
          "The ICAR–NAARM report attributes to Hari Babu an explanation of how natural-farming practices can support soil microbial activity and organic carbon, with implications for fertility and crop productivity.",
        displayLabel: "Soil focus",
        displayValue: "Microbes + organic carbon",
        displayContext: "Reported in ICAR–NAARM interaction",
        sources: [icarSource, channelSource],
      },
      {
        id: "44000000-0000-4000-8000-000000000104",
        key: "integrated_farm_system",
        type: "innovation",
        statement:
          "MANAGE and ICFRE describe an integrated farming system associated with Hari Babu, including horticulture, livestock and cow-based Jeevamrutham inputs; the details are reported source material, not a current FarmerBook inspection.",
        displayLabel: "Farm model",
        displayValue: "Integrated farming",
        displayContext: "MANAGE and ICFRE descriptions",
        sources: [manageSource, icfreSource],
      },
      {
        id: "44000000-0000-4000-8000-000000000105",
        key: "biodiverse_horticulture",
        type: "ecological_stewardship",
        statement:
          "The MANAGE case study describes a diverse horticulture and tree planting program, including fruit, forest and medicinal plants, and connects the farm's high-density approach with close personal supervision.",
        displayLabel: "Horticulture",
        displayValue: "Fruit + forest diversity",
        displayContext: "MANAGE case study",
        sources: [manageSource, hmtvSource, videoSources[0], videoSources[1]],
      },
      {
        id: "44000000-0000-4000-8000-000000000106",
        key: "farmer_sustainability_message",
        type: "knowledge_sharing",
        statement:
          "Several first-party videos frame natural farming, food forests and soil fertility as practical subjects for farmers and learners, including a video explicitly titled Farmers can sustain only by natural farming.",
        displayLabel: "Core message",
        displayValue: "Farm knowledge in public",
        displayContext: "First-party video series",
        sources: [videoSources[6], videoSources[7], channelSource],
      },
    ],
    sections: [
      {
        kind: "origin",
        heading: "A farmer who teaches in public",
        body:
          "Sukhavasi Hari Babu's public identity is built around a simple idea: farming knowledge should travel. The description of his YouTube channel, Natural Farming Hari Babu – Live Village Life, says it is his way of reaching people with the benefits of high-density natural and organic farming. The channel is also described as Hari Babu Org Farming.\n\nThat matters because the videos do not present farming as a finished formula. They show trees, fruit, inputs, soil, harvests and questions as parts of an ongoing practice. FarmerBook is using the channel as first-party documentation while keeping the distinction clear between what Hari Babu reports or demonstrates and what FarmerBook has independently verified.",
        claimKeys: ["public_channel_mission"],
      },
      {
        kind: "impact",
        heading: "From a Telangana farm to the institutional conversation",
        body:
          "Hari Babu's work has also entered the public institutional record. ICAR–NAARM identifies Sri Hari Babu Sukhavasi as a progressive natural farmer from Telangana and records his participation in a natural and organic farming interaction at Rajendranagar, Hyderabad, in August 2025.\n\nThe report says he discussed practical aspects and benefits of natural farming, including soil microbial activity, soil organic carbon, fertility and crop productivity. It also records examples of high-density planting and cow-based farming systems. This gives the profile a stronger context than a channel alone, while still leaving the specific farm outcomes as reported claims.",
        claimKeys: ["telangana_practitioner", "soil_health_focus"],
      },
      {
        kind: "work",
        heading: "High density as a way to think about land",
        body:
          "In the public material about Hari Babu, high-density planting is not just a count of trees. It is presented as a way to make a piece of land hold many relationships: fruit trees, forest species, medicinal plants, soil organisms, livestock and the people who care for them.\n\nMANAGE's case study describes a farm near Hyderabad with a large mix of tree species and horticultural and medicinal plants. HMTV also reports on high-density fruit farming associated with Hari Babu. The channel's food-forest videos extend that idea visually, showing how a farmer can document the development of a diverse planting system over time.",
        claimKeys: ["biodiverse_horticulture"],
      },
      {
        kind: "work",
        heading: "Connecting cattle, soil and biological inputs",
        body:
          "The integrated-farming story associated with Hari Babu links livestock to soil care. MANAGE and ICFRE describe cows whose dung and urine are used to prepare Jeevamrutham for plants, alongside a broader integrated farming system. In this model, livestock is not an isolated enterprise; it is part of a proposed nutrient cycle.\n\nThese descriptions are useful for understanding the design of the farm, but they should not be read as a guarantee that one input works for every crop or soil. Farmers need to adapt practices to local conditions, safety requirements and agronomic advice.",
        claimKeys: ["integrated_farm_system"],
      },
      {
        kind: "impact",
        heading: "Soil health is the long view",
        body:
          "A recurring theme in Hari Babu's work is that the visible crop is only one part of farming. The ICAR–NAARM account places soil microbial activity and organic carbon near the centre of his explanation of natural farming. That emphasis changes the question from what can be harvested today to what kind of soil, water and biological life can support the farm over time.\n\nHis public videos make that larger idea concrete through subjects such as food forests, soil fertility, biomass-based inputs and tree diversity. FarmerBook presents these as documented themes and reported practices, not as independently measured results or universal prescriptions.",
        claimKeys: ["soil_health_focus", "farmer_sustainability_message"],
      },
      {
        kind: "community",
        heading: "A library of practical farm questions",
        body:
          "The channel's value is also in its breadth. Alongside the headline food-forest story, Hari Babu has published videos about fruit varieties, Miyawaki planting, soil fertility, Jeevamrutham and the economic question of whether farmers can sustain themselves through natural farming. The work is therefore part farm diary, part field lesson and part invitation to observe carefully.\n\nThat public record can help farmers and learners ask better questions: Which trees suit this climate? How should biological inputs be made and handled? What does a dense planting system demand in water and labour? How can soil improvement be assessed rather than assumed? The answers belong to each farm, but the questions are worth sharing.",
        claimKeys: ["farmer_sustainability_message", "public_channel_mission"],
      },
    ],
    coverage: videos.map((video, index) => ({
      url: video.url,
      publisher: channelSource.publisher,
      title: video.title + " — " + video.views + " views observed",
      sourceType: "Top-viewed pick #" + (index + 1) + " · " + observedViews,
      thumbnail: {
        assetUrl:
          "https://i.ytimg.com/vi/" +
          video.url.split("v=")[1] +
          "/maxresdefault.jpg",
        altText: video.title + " — YouTube thumbnail",
        provider: "youtube_oembed" as const,
      },
    })),
    seo: {
      title: "Sukhavasi Hari Babu | Natural Farming | FarmerBook",
      description:
        "An attributed FarmerBook profile of Sukhavasi Hari Babu's high-density natural farming, food-forest, soil-health and integrated-farming work in Telangana.",
      keywords: [
        "Sukhavasi Hari Babu",
        "Hari Babu Org Farming",
        "natural farming Telangana",
        "high-density farming",
        "food forest",
        "integrated farming",
        "Jeevamrutham",
      ],
    },
  },
} satisfies FeaturedFarmerPublication;
