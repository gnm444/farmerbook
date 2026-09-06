import type { FeaturedFarmerPublication } from "./queries";

const marketUrl = "https://farmaahaaravanam.com";
const vegetablesUrl = `${marketUrl}/collections/veggies`;
const fruitsUrl = `${marketUrl}/collections/fruits`;

const channelSource = {
  id: "4b000000-0000-4000-8000-000000000001",
  url: "https://www.youtube.com/@AahaaraVanamOrganicFarm",
  publisher: "Aahaara Vanam Organic Farm",
  title: "Aahaara Vanam Organic Farm — YouTube channel",
  publishedAt: null,
  sourceType: "farm YouTube channel",
  quality: "owned_social_profile",
  association: "owned_social_profile",
};

const storySource = {
  id: "4b000000-0000-4000-8000-000000000002",
  url: `${marketUrl}/pages/about-us`,
  publisher: "Aahaara Vanam",
  title: "Our Story — A Quiet Stand",
  publishedAt: null,
  sourceType: "first-party farm website",
  quality: "first_party",
  association: "professional_reference",
};

const marketSource = {
  id: "4b000000-0000-4000-8000-000000000003",
  url: marketUrl,
  publisher: "Aahaara Vanam",
  title: "Farm Aahaara Vanam online market",
  publishedAt: null,
  sourceType: "first-party online market",
  quality: "first_party",
  association: "professional_reference",
};

const vegetablesSource = {
  id: "4b000000-0000-4000-8000-000000000004",
  url: vegetablesUrl,
  publisher: "Aahaara Vanam",
  title: "Leafy Greens & Vegetables — Aahaara Vanam catalogue",
  publishedAt: null,
  sourceType: "first-party product catalogue",
  quality: "first_party",
  association: "professional_reference",
};

const fruitsSource = {
  id: "4b000000-0000-4000-8000-000000000005",
  url: fruitsUrl,
  publisher: "Aahaara Vanam",
  title: "Fruits — Aahaara Vanam catalogue",
  publishedAt: null,
  sourceType: "first-party product catalogue",
  quality: "first_party",
  association: "professional_reference",
};

function catalogueItem(
  name: string,
  categorySlug: string,
  productHandle: string,
  collectionUrl: string,
) {
  return {
    name,
    categorySlug,
    status: "reported" as const,
    sourceUrls: [collectionUrl],
    productUrl: `${marketUrl}/products/${productHandle}`,
  };
}

const reportedProducts = [
  catalogueItem("Ponnaganti Aaku", "leafy-vegetables", "ponnaganti-aaku", vegetablesUrl),
  catalogueItem("Coriander", "coriander", "coriander", vegetablesUrl),
  catalogueItem("Mint", "mint", "mint", vegetablesUrl),
  catalogueItem("Gongura", "leafy-vegetables", "gongura", vegetablesUrl),
  catalogueItem("Curry Leaf", "curry-leaf", "curry-leaf", vegetablesUrl),
  catalogueItem("Purple Long Brinjal", "brinjal-eggplant", "purple-long-brinjal", vegetablesUrl),
  catalogueItem("Potato", "potato-root-tubers", "potato", vegetablesUrl),
  catalogueItem("Onion", "onion", "onion", vegetablesUrl),
  catalogueItem("English Cucumber", "cucumber", "english-cucumber", vegetablesUrl),
  catalogueItem("Carrot", "carrot", "untitled-29jun_21-32", vegetablesUrl),
  catalogueItem("Ash Gourd Whole", "ash-gourd", "ash-gourd", vegetablesUrl),
  catalogueItem("Pumpkin Whole", "pumpkin-squash", "pumpkin", vegetablesUrl),
  catalogueItem("Radish", "radish", "untitled-21jul_11-41", vegetablesUrl),
  catalogueItem(
    "Yellow Round or Striped Cucumber (based on availability)",
    "cucumber",
    "yellow-round-cucumber",
    vegetablesUrl,
  ),
  catalogueItem("Donda / Ivy Gourd", "vegetables", "donda-ivy-gourd", vegetablesUrl),
  catalogueItem("Coconut", "coconut", "coconut", vegetablesUrl),
  catalogueItem("Tomato", "tomato", "tomato", vegetablesUrl),
  catalogueItem("Desi Garlic / Naatu Vellulli", "garlic", "desi-garlic-naatu-velluli", vegetablesUrl),
  catalogueItem("Green Chilli", "green-chilli", "green-chilli", vegetablesUrl),
  catalogueItem("Bitter Gourd / Kakara", "bitter-gourd", "bitter-gourd-kakara", vegetablesUrl),
  catalogueItem("Beerakaya / Ridge Gourd", "ridge-gourd", "beerakaya-ridge-gourd", vegetablesUrl),
  catalogueItem("Raw Banana", "banana", "raw-banana", vegetablesUrl),
  catalogueItem("Goruchikkudu / Cluster Bean", "cluster-bean-guar", "goruchikkudu-cluster-bean", vegetablesUrl),
  catalogueItem("Cabbage", "cabbage", "cabbage", vegetablesUrl),
  catalogueItem("Bottle Gourd Long", "bottle-gourd", "bottle-gourd-long", vegetablesUrl),
  catalogueItem("Chamagadda / Arvi", "colocasia-taro", "chamagadda-arvi", vegetablesUrl),
  catalogueItem("Bhendi / Ladies Finger", "okra", "benda-ladies-finger", vegetablesUrl),
  catalogueItem("Lemon", "citrus", "lemon", vegetablesUrl),
  catalogueItem("Beetroot", "beetroot", "beetroot", vegetablesUrl),
  catalogueItem("Drumstick", "drumstick-moringa", "drumstick", vegetablesUrl),
  catalogueItem("Snake Gourd", "snake-gourd", "snake-gourd-long", vegetablesUrl),
  catalogueItem("Sweet Corn", "sweet-corn", "sweet-corn", vegetablesUrl),
  catalogueItem("Salad Cucumber", "cucumber", "untitled-29jun_21-33", vegetablesUrl),
  catalogueItem("Capsicum Green", "capsicum", "capsicum-green", vegetablesUrl),
  catalogueItem("Ginger", "ginger", "ginger", vegetablesUrl),
  catalogueItem("Broad Bean / Chikkudu", "broad-bean", "broad-bean-chikkudu", vegetablesUrl),
  catalogueItem("Pomegranate", "pomegranate", "pomegranate", fruitsUrl),
  catalogueItem("Banana Karpuram", "banana", "untitled-23jul_15-29", fruitsUrl),
  catalogueItem("Papaya", "papaya", "papaya", fruitsUrl),
  catalogueItem("Watermelon", "watermelon", "untitled-14jul_10-31", fruitsUrl),
  catalogueItem("Musk Melon", "muskmelon", "untitled-24jul_07-26", fruitsUrl),
];

export const aahaaraVanamPublication = {
  publication_id: "4b000000-0000-4000-8000-000000000010",
  slug: "aahaara-vanam-shanthi-srinath",
  publication_revision: 1,
  publication_status: "published",
  fact_checked_at: "2026-09-04T06:00:00.000Z",
  published_at: "2026-09-04T06:00:00.000Z",
  snapshot: {
    fullName: "Shanthi & Srinath",
    district: null,
    state: null,
    locale: "en-IN",
    headline: "A quiet stand for soil, food and the lives they touch",
    deck:
      "Co-founders Shanthi and Srinath are building Aahaara Vanam around organic-oriented farming, transparent food choices and a direct online market for fresh produce and pantry staples.",
    whyFeatured:
      "Aahaara Vanam brings together a farming philosophy and a practical route to the customer. Shanthi and Srinath describe their work as a deliberate return to the soil, while their online market connects that story to vegetables, fruits and other farm-linked products that customers can browse and order.",
    categorySlugs: ["integrated-farming", "fruit-orchards", "vegetables"],
    limitations: [
      "This is an editorial profile, not a FarmerBook member account, identity verification, certification, endorsement or marketplace listing.",
      "The organic and pesticide-free descriptions are Aahaara Vanam’s own public statements. FarmerBook does not convert them into an independent certification claim.",
      "The catalogue, prices, pack sizes, stock, delivery areas and delivery schedule can change. Customers should confirm the current details on the Aahaara Vanam market before ordering.",
      "The catalogue entries below link to Aahaara Vanam’s online store. FarmerBook does not process payment or fulfil these orders on this editorial page.",
    ],
    editorialDisclosure:
      "FarmerBook editorial profile based on Aahaara Vanam’s public website, public catalogue and public YouTube channel; not membership, identity verification, certification, endorsement, a marketplace listing or agricultural advice.",
    personMetadata: {
      jobTitles: ["Farmers", "Co-founders of Aahaara Vanam"],
      homeLocation: "India",
      knowsAbout: [
        "Organic-oriented farming",
        "Fresh vegetables",
        "Fresh fruits",
        "Direct farm-to-customer sales",
        "Food and soil stewardship",
        "Farm product curation",
      ],
    },
    media: null,
    sourceHostedPreview: {
      assetUrl:
        "https://cdn.shopify.com/s/files/1/0767/9842/7392/files/20250808_092802_1.jpg?v=1754795833",
      sourceUrl: marketSource.url,
      altText: "Shanthi and Srinath, co-founders of Aahaara Vanam",
      credit: "Aahaara Vanam",
      creditUrl: marketSource.url,
      provider: "public_source",
      focalPoint: "center",
    },
    socialLinks: [{ platform: "youtube", url: channelSource.url }],
    sources: [channelSource, storySource, marketSource, vegetablesSource, fruitsSource],
    claims: [
      {
        id: "4b000000-0000-4000-0000-000000000101",
        key: "quiet_stand",
        type: "ecological_stewardship",
        statement:
          "Aahaara Vanam describes its work as a deliberate stand for soil, food and every life affected by the food system.",
        displayLabel: "Farm philosophy",
        displayValue: "A quiet stand",
        displayContext: "Aahaara Vanam’s public story",
        sources: [storySource],
      },
      {
        id: "4b000000-0000-4000-0000-000000000102",
        key: "shanthi_srinath_founders",
        type: "leadership",
        statement:
          "The Aahaara Vanam story identifies Shanthi and Srinath as the co-founders of the farm and online market.",
        displayLabel: "Founders",
        displayValue: "Shanthi & Srinath",
        displayContext: "Aahaara Vanam public website",
        sources: [storySource, marketSource],
      },
      {
        id: "4b000000-0000-4000-0000-000000000103",
        key: "fresh_produce_catalogue",
        type: "knowledge_sharing",
        statement:
          "The online catalogue lists fresh vegetables, leafy greens and fruits including lemon, tomato, gourds, greens, pomegranate, banana, papaya, watermelon and musk melon.",
        displayLabel: "Online market",
        displayValue: "Vegetables and fruits",
        displayContext: "Current Aahaara Vanam catalogue",
        sources: [vegetablesSource, fruitsSource],
      },
      {
        id: "4b000000-0000-4000-0000-000000000104",
        key: "direct_customer_path",
        type: "community",
        statement:
          "Aahaara Vanam provides a direct online market where customers can browse its current catalogue and place orders with the farm.",
        displayLabel: "Customer path",
        displayValue: "Browse and order online",
        displayContext: "Aahaara Vanam market",
        sources: [marketSource],
      },
      {
        id: "4b000000-0000-4000-0000-000000000105",
        key: "public_farming_channel",
        type: "knowledge_sharing",
        statement:
          "Aahaara Vanam maintains a public YouTube channel for sharing its farming and food story.",
        displayLabel: "Public channel",
        displayValue: "YouTube",
        displayContext: "Aahaara Vanam Organic Farm",
        sources: [channelSource],
      },
    ],
    sections: [
      {
        kind: "origin",
        heading: "Returning to the soil with purpose",
        body:
          "Aahaara Vanam began with a question: what would it mean to grow and share food in a way that respects soil, farmers, customers and the wider living world? Shanthi and Srinath describe their response as a quiet, determined stand—a return to farming shaped by responsibility rather than nostalgia alone.",
        claimKeys: ["quiet_stand", "shanthi_srinath_founders"],
      },
      {
        kind: "work",
        heading: "From farm values to a customer’s basket",
        body:
          "The farm’s public story is paired with a working online market. Customers can browse a fresh-produce catalogue that includes leafy greens, vegetables and fruits, alongside pantry products. This direct route makes the relationship more visible: the customer can read the farm’s stated values, see what is currently offered and follow the store link to check live product details.",
        claimKeys: ["fresh_produce_catalogue", "direct_customer_path"],
      },
      {
        kind: "impact",
        heading: "A broad catalogue of fresh produce",
        body: `The current vegetables collection includes familiar kitchen staples such as tomato, onion, potato, carrot, garlic and lemon, as well as greens, gourds, brinjal, cucumber, drumstick, sweet corn and other seasonal produce. The fruits collection includes pomegranate, Karpuram banana, papaya, watermelon and musk melon.

The FarmerBook catalogue below is a convenience layer over the farm’s own store. Availability and prices belong to the live Aahaara Vanam product pages, so customers should use those pages before placing an order.`,
        claimKeys: ["fresh_produce_catalogue"],
      },
      {
        kind: "community",
        heading: "Sharing the story beyond the shop",
        body:
          "Shanthi and Srinath also share Aahaara Vanam’s work through a public YouTube channel. That combination—story, farm values, catalogue and direct ordering—gives customers more context than a product name alone and gives the farm a way to keep explaining what it is trying to build.",
        claimKeys: ["public_farming_channel", "quiet_stand"],
      },
      {
        kind: "lessons",
        heading: "A practical invitation to choose with attention",
        body: `Aahaara Vanam’s message is ultimately practical: food choices can support the kind of farming and relationship customers want to see more of. Farmers can learn from the effort to connect production with transparent customer access. Customers can ask where food comes from, what is currently available and which farming or certification statements are supported by evidence.

To browse the live catalogue or place an order, use the product links below or visit the Aahaara Vanam online market.`,
        claimKeys: ["direct_customer_path", "shanthi_srinath_founders"],
      },
    ],
    coverage: [
      {
        url: marketSource.url,
        publisher: marketSource.publisher,
        title: marketSource.title,
        sourceType: "Aahaara Vanam online market · Browse and order",
      },
      {
        url: vegetablesSource.url,
        publisher: vegetablesSource.publisher,
        title: vegetablesSource.title,
        sourceType: "Aahaara Vanam fresh-produce collection",
      },
      {
        url: fruitsSource.url,
        publisher: fruitsSource.publisher,
        title: fruitsSource.title,
        sourceType: "Aahaara Vanam fresh-produce collection",
      },
      {
        url: channelSource.url,
        publisher: channelSource.publisher,
        title: channelSource.title,
        sourceType: "Aahaara Vanam public YouTube channel",
      },
    ],
    reportedProducts,
    seo: {
      title: "Shanthi & Srinath | Aahaara Vanam | FarmerBook",
      description:
        "FarmerBook’s profile of Aahaara Vanam co-founders Shanthi and Srinath, with links to the farm’s current vegetables and fruits catalogue.",
      keywords: [
        "Shanthi Srinath Aahaara Vanam",
        "Aahaara Vanam organic farm",
        "fresh vegetables online",
        "fresh fruits online",
        "farm to customer India",
        "organic-oriented farming",
      ],
    },
  },
} satisfies FeaturedFarmerPublication;
