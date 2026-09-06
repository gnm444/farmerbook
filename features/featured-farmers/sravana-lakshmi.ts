import type { FeaturedFarmerPublication } from "./queries";

const channelSource = {
  id: "47000000-0000-4000-8000-000000000001",
  url: "https://www.youtube.com/@sravanamegham",
  publisher: "శ్రావణ మేఘం / Sravana Megham",
  title: "Sravana Megham — public YouTube channel and About description",
  publishedAt: null,
  sourceType: "first-party YouTube channel",
  quality: "owned_social_profile",
  association: "owned_social_profile",
};

const websiteSource = {
  id: "47000000-0000-4000-8000-000000000010",
  url: "https://sravanavedham.com/",
  publisher: "Sravana Vedham Natural Products",
  title: "Sravana Vedham — farm, founder story and product catalogue",
  publishedAt: null,
  sourceType: "first-party website",
  quality: "first_party",
  association: "professional_reference",
};

const videos = [
  {
    id: "47000000-0000-4000-8000-000000000002",
    url: "https://www.youtube.com/watch?v=6f7gg_10opg",
    title: "కూరగాయల విత్తనాలు పెట్టాను — vegetable seeds planted",
    sourceType: "first-party YouTube video",
  },
  {
    id: "47000000-0000-4000-8000-000000000003",
    url: "https://www.youtube.com/watch?v=x5JOyqESG8Y",
    title: "మన ఆవుల కథలు — తోటలో కాసిన కాయలు — cows and garden produce",
    sourceType: "first-party YouTube video",
  },
  {
    id: "47000000-0000-4000-8000-000000000004",
    url: "https://www.youtube.com/watch?v=5-8qoKMK6bc",
    title: "మల్లెపూల మాల — jasmine flower garland",
    sourceType: "first-party YouTube Short",
  },
  {
    id: "47000000-0000-4000-8000-000000000005",
    url: "https://www.youtube.com/watch?v=zYxr6E6eHMg",
    title: "ఎందుకు వంట బయట చేస్తున్నాను — why I cook outdoors",
    sourceType: "first-party YouTube video",
  },
  {
    id: "47000000-0000-4000-8000-000000000006",
    url: "https://www.youtube.com/watch?v=3pM5REzSse0",
    title: "ఈ జీవనశైలి కష్టమైనది కాని ఇక్కడ దొరికే ప్రశాంతత — the peace of this lifestyle",
    sourceType: "first-party YouTube video",
  },
  {
    id: "47000000-0000-4000-8000-000000000007",
    url: "https://www.youtube.com/watch?v=EwhEsoRxqB0",
    title: "ఆవు నా జీవితంలో చాలా మార్పులు తీసుకొచ్చింది — how a cow changed my life",
    sourceType: "first-party YouTube video",
  },
  {
    id: "47000000-0000-4000-8000-000000000008",
    url: "https://www.youtube.com/watch?v=JS4Zc6gU2lY",
    title: "వరలక్ష్మీ వ్రతం — Varalakshmi Vratam",
    sourceType: "first-party YouTube Short",
  },
  {
    id: "47000000-0000-4000-8000-000000000009",
    url: "https://www.youtube.com/watch?v=p7tRlVA242k",
    title: "మనసుకు నచ్చిన పని ఎంత కష్టమైనా ఆనందంగానే చెయ్యాలనిపిస్తుంది — joy in meaningful work",
    sourceType: "first-party YouTube video",
  },
] as const;

const videoSources = videos.map((video) => ({
  id: video.id,
  url: video.url,
  publisher: "శ్రావణ మేఘం / Sravana Megham",
  title: video.title,
  publishedAt: null,
  sourceType: video.sourceType,
  quality: "first_party",
  association: "professional_reference",
}));

const productCatalog = [
  {
    name: "Palli Oil — Eddhu Ganuga Nune | Bull Churned Cold Pressed Groundnut Oil",
    categorySlug: "groundnut",
    productUrl:
      "https://sravanavedham.com/products/palli-oil-eddhu-ganuga-nune-bull-churned-cold-pressed-groundnut-oil",
    price: "₹305 listed price at review",
    packSizes: ["500ml", "1 Litre", "2 Litres", "5 Litres", "10 Litres", "15 Litres"],
  },
  {
    name: "Verri Nuvvula Nune — Eddhu Ganuga Nune | Bull Churned Cold Pressed Niger Seed Oil",
    categorySlug: "niger-seed",
    productUrl:
      "https://sravanavedham.com/products/verri-nuvvula-nune-eddhu-ganuga-nune-bull-churned-cold-pressed-niger-seed-oil",
    price: "₹1,640 listed price at review",
    packSizes: ["500ml", "1 Litre", "2 Litres", "5 Litres", "10 Litres", "15 Litres"],
  },
  {
    name: "Kuridi Kobbari Eddhu Ganuga Nune | Bull Churned Cold Pressed Coconut Oil",
    categorySlug: "coconut",
    productUrl:
      "https://sravanavedham.com/products/coconut-oil-eddhu-ganuga-nune-bull-churned-cold-pressed-coconut-oil",
    price: "₹630 listed price at review",
    packSizes: ["500ml", "1 Litre", "2 Litres", "5 Litres", "10 Litres", "15 Litres"],
  },
  {
    name: "Nuvvu Pappu Nune — Eddhu Ganuga Nune | Bull Churned Cold Pressed White Sesame Oil",
    categorySlug: "sesame",
    productUrl:
      "https://sravanavedham.com/products/nuvvu-pappu-nune-eddhu-ganuga-nune-bull-churned-cold-pressed-white-sesame-oil",
    price: "₹505 listed price at review",
    packSizes: ["500ml", "1 Litre", "2 Litres", "5 Litres", "10 Litres", "15 Litres"],
  },
  {
    name: "Amudham Nune — Eddhu Ganuga Nune | Bull Churned Cold Pressed Castor Oil",
    categorySlug: "castor-seed",
    productUrl:
      "https://sravanavedham.com/products/amudham-nune-eddhu-ganuga-nune-bull-churned-cold-pressed-castor-oil",
    price: "₹405 listed price at review",
    packSizes: ["500ml", "1 Litre", "2 Litres", "5 Litres", "10 Litres", "15 Litres"],
  },
  {
    name: "Nalla Nuvvula Nune — Eddhu Ganuga Nune | Bull Churned Cold Pressed Black Sesame Oil",
    categorySlug: "sesame",
    productUrl:
      "https://sravanavedham.com/products/nalla-nuvvula-nune-eddhu-ganuga-nune-bull-churned-cold-pressed-black-sesame-oil",
    price: "₹405 listed price at review",
    packSizes: ["500ml", "1 Litre", "2 Litres", "5 Litres", "10 Litres", "15 Litres"],
  },
  {
    name: "Badham Nune — Eddhu Ganuga Nune | Bull Churned Cold Pressed Almond Oil",
    categorySlug: "on-farm-processing",
    productUrl:
      "https://sravanavedham.com/products/badham-nune-eddhu-ganuga-nune-bull-churned-cold-pressed-almond-oil",
    price: "₹500 listed price at review",
    packSizes: ["100ml", "250ml", "500ml", "1 Litre"],
  },
  {
    name: "Kusuma Nune — Eddhu Ganuga Nune | Bull Churned Cold Pressed Safflower Oil",
    categorySlug: "safflower",
    productUrl:
      "https://sravanavedham.com/products/kusuma-nune-eddhu-ganuga-nune-bull-churned-cold-pressed-safflower-oil",
    price: "₹505 listed price at review",
    packSizes: ["500ml", "1 Litre", "2 Litres", "5 Litres", "10 Litres", "15 Litres"],
  },
  {
    name: "Aava Nune — Eddhu Ganuga Nune | Bull Churned Cold Pressed Mustard Oil",
    categorySlug: "mustard-rapeseed",
    productUrl:
      "https://sravanavedham.com/products/aava-nune-eddhu-ganuga-nune-bull-churned-cold-pressed-mustard-oil",
    price: "₹505 listed price at review",
    packSizes: ["500ml", "1 Litre", "2 Litres", "5 Litres", "10 Litres", "15 Litres"],
  },
  {
    name: "Avisa Nune — Eddhu Ganuga Nune | Bull Churned Cold Pressed Flaxseed Oil",
    categorySlug: "linseed-flaxseed",
    productUrl:
      "https://sravanavedham.com/products/avisalu-nune-eddhu-ganuga-nune-bull-churned-cold-pressed-flaxseed-oil",
    price: "₹750 listed price at review",
    packSizes: ["500ml", "1 Litre", "2 Litres", "5 Litres", "10 Litres", "15 Litres"],
  },
  {
    name: "Sprouted Ragi Flour",
    categorySlug: "finger-millet-ragi",
    productUrl: "https://sravanavedham.com/products/sprouted-ragi-flour",
    price: "₹200 listed price at review",
    packSizes: ["1kg"],
  },
  {
    name: "Sprouted Jonna Flour",
    categorySlug: "sorghum-jowar",
    productUrl: "https://sravanavedham.com/products/sprouted-jonna-flour",
    price: "₹220 listed price at review",
    packSizes: ["1kg"],
  },
  {
    name: "Sprouted Sajja Flour",
    categorySlug: "pearl-millet-bajra",
    productUrl: "https://sravanavedham.com/products/sprouted-sajja-flour",
    price: "₹200 listed price at review",
    packSizes: ["1kg"],
  },
  {
    name: "Sprouted Wheat Flour",
    categorySlug: "wheat",
    productUrl: "https://sravanavedham.com/products/sprouted-wheat-flour",
    price: "₹200 listed price at review",
    packSizes: ["1kg"],
  },
  {
    name: "Avisa Laddu | అవిసె లడ్డు",
    categorySlug: "on-farm-processing",
    productUrl:
      "https://sravanavedham.com/products/avisa-laddu-%E0%B0%85%E0%B0%B5%E0%B0%BF%E0%B0%B8%E0%B1%86-%E0%B0%B2%E0%B0%A1%E0%B1%8D%E0%B0%A1%E0%B1%81",
    price: "₹650 listed price at review",
    packSizes: ["1kg"],
  },
  {
    name: "Organic Jaggery",
    categorySlug: "jaggery",
    productUrl: "https://sravanavedham.com/products/organic-jaggery",
    price: "₹100 listed price at review",
    packSizes: ["500g", "1kg"],
  },
] as const;

const productSources = productCatalog.map((product, index) => ({
  id: `47000000-0000-4000-8000-${String(100 + index).padStart(12, "0")}`,
  url: product.productUrl,
  publisher: websiteSource.publisher,
  title: product.name,
  publishedAt: null,
  sourceType: "first-party website product page",
  quality: "first_party",
  association: "professional_reference",
}));

const reportedProducts = productCatalog.map((product, index) => ({
  ...product,
  packSizes: [...product.packSizes],
  status: "reported" as const,
  sourceUrls: [websiteSource.url, productSources[index]!.url],
}));

const sourcePreview = {
  assetUrl:
    "https://farmerbook.in/images/featured-farmers/sravana-lakshmi-founder.png",
  sourceUrl: websiteSource.url,
  altText:
    "Sravani, farmer and founder of Sravana Vedham, seated beside a bullock-powered Eddu Ganuga wooden oil press",
  credit: "Photograph supplied for the FarmerBook profile; Sravana Vedham founder image",
  creditUrl: websiteSource.url,
  provider: "farmerbook_permitted" as const,
  focalPoint: "right" as const,
};

const sourceBackground = {
  assetUrl: "https://i.ytimg.com/vi/3pM5REzSse0/maxresdefault.jpg",
  sourceUrl: "https://www.youtube.com/watch?v=3pM5REzSse0",
  altText: "Sravana Megham video about the peace of a nature-centred lifestyle",
  credit: "Sravana Megham, via YouTube",
  creditUrl: channelSource.url,
  provider: "youtube_oembed" as const,
  focalPoint: "center" as const,
};

export const sravanaLakshmiPublication = {
  publication_id: "40000000-0000-4000-8000-000000000005",
  slug: "sravana-lakshmi-sravana-megham",
  publication_revision: 1,
  publication_status: "published",
  fact_checked_at: "2026-08-30T12:00:00.000Z",
  published_at: "2026-08-30T12:00:00.000Z",
  snapshot: {
    fullName: "Sravana Lakshmi",
    contactEmail: "sravanisworld2709@gmail.com",
    contactPhone: "+91 7293199999",
    whatsappUrl: "https://wa.me/917293199999",
    district: "Guntur",
    state: "Andhra Pradesh",
    locale: "en-IN",
    headline: "A farmer-founder bringing traditional food into the modern kitchen",
    deck:
      "Sravana Lakshmi—introduced as Sravani, Farmer & Founder on Sravana Vedham—connects Telugu tradition, farm life and food entrepreneurship through a bullock-powered wooden press, cold-pressed oils, sprouted flours, traditional sweets and jaggery.",
    whyFeatured:
      "Sravana Lakshmi is featured because her public work brings together three strands that are rarely told as one story: nature-centred living, Telugu cultural continuity and direct-to-consumer food production. On YouTube, Sravana Megham documents the garden, cows, seeds, flowers, family routines and traditional practices that shape her worldview. On Sravana Vedham, the website introduces Sravani as a farmer and founder who established a traditional Eddu Ganuga—a bullock-powered wooden press—to make food for her own family before opening that catalogue to other households. The website currently lists 16 products across oils, sprouted flours, a traditional laddu and jaggery. This is an attributed editorial profile, not a certification, quality guarantee or FarmerBook sales endorsement.",
    categorySlugs: [
      "vegetables",
      "on-farm-processing",
      "oilseeds",
      "cereals-grains",
      "cattle-rearing",
      "flowers-floriculture",
    ],
    limitations: [
      "This is a FarmerBook editorial profile based on public channel material, not a FarmerBook member account, identity verification, certification or endorsement.",
      "The website gives the business location as Chilakaluripeta, Guntur District, Andhra Pradesh and describes the products as farm-direct from Martur village, Guntur. FarmerBook has not independently inspected either location.",
      "The website lists products, prices and pack sizes, but current stock, fulfilment, product quality, certifications and food-business registrations have not been independently verified by FarmerBook.",
      "The listed products link to the external Sravana Vedham website; they are not FarmerBook listings, and FarmerBook does not process orders or payments for them.",
      "The creator's views about chemical farming, traditional practices and environmental protection are presented as her own perspective; this profile does not make agricultural, health, pesticide or food-safety guarantees.",
      "Channel subscriber, video and view counts change over time and are included only as a dated public snapshot.",
    ],
    editorialDisclosure:
      "FarmerBook editorial profile based on the creator's public YouTube channel and selected first-party videos; not membership, identity verification, certification, endorsement, a marketplace listing or agricultural advice.",
    personMetadata: {
      alternateNames: ["శ్రావణ లక్ష్మి", "Sravana Megham", "శ్రావణ మేఘం"],
      jobTitles: ["Farmer", "Farmer-founder", "Nature educator", "Telugu creator"],
      homeLocation: "Chilakaluripeta, Guntur District, Andhra Pradesh, India",
      knowsAbout: [
        "Cold-pressed oils",
        "Traditional Eddu Ganuga oil pressing",
        "Sprouted millet and wheat flours",
        "Traditional sweets and jaggery",
        "Home and garden cultivation",
        "Cattle care",
        "Telugu traditions",
        "Nature-centred living",
        "Environmental awareness",
      ],
    },
    media: null,
    sourceHostedPreview: sourcePreview,
    sourceHostedBackground: sourceBackground,
    socialLinks: [{ platform: "youtube", url: channelSource.url }],
    sources: [channelSource, websiteSource, ...videoSources, ...productSources],
    claims: [
      {
        id: "48000000-0000-4000-8000-000000000001",
        key: "nature_care_mission",
        type: "ecological_stewardship",
        statement:
          "In her public channel description, Sravana Lakshmi says that she loves nature, opposes tree cutting and chemically grown food as definitions of development, and wants people to work together for a better environment for their children.",
        displayLabel: "Public mission",
        displayValue: "Nature-first living",
        displayContext: "Creator's channel description",
        sources: [channelSource],
      },
      {
        id: "48000000-0000-4000-8000-000000000002",
        key: "documented_garden_work",
        type: "knowledge_sharing",
        statement:
          "Public videos document vegetable-seed planting and garden produce, while the channel description frames the videos as a way to share knowledge, entertainment or rest.",
        displayLabel: "Garden work",
        displayValue: "Seeds + produce",
        displayContext: "First-party video record",
        sources: [videoSources[0], videoSources[1], channelSource],
      },
      {
        id: "48000000-0000-4000-8000-000000000003",
        key: "cattle_and_home_life",
        type: "ecological_stewardship",
        statement:
          "The channel's public video record includes stories about cows and a video describing how a cow brought significant changes to Lakshmi's life.",
        displayLabel: "Livestock story",
        displayValue: "Cows in daily life",
        displayContext: "First-party videos",
        sources: [videoSources[1], videoSources[5]],
      },
      {
        id: "48000000-0000-4000-8000-000000000004",
        key: "telugu_traditions",
        type: "community",
        statement:
          "Lakshmi's channel description says she has a strong affection for Telugu traditions and customs and tries to follow older practices where possible; public videos also include a Varalakshmi Vratam feature.",
        displayLabel: "Cultural focus",
        displayValue: "Telugu traditions",
        displayContext: "Channel description and video record",
        sources: [channelSource, videoSources[6]],
      },
      {
        id: "48000000-0000-4000-8000-000000000005",
        key: "public_channel_scale",
        type: "knowledge_sharing",
        statement:
          "The public channel page displayed approximately 246,000 subscribers, 523 videos and 232 million views when reviewed on 30 August 2026.",
        displayLabel: "Channel snapshot",
        displayValue: "246K subscribers",
        displayContext: "Observed 30 Aug 2026; counts change",
        sources: [channelSource],
      },
      {
        id: "48000000-0000-4000-8000-000000000006",
        key: "farmer_founder_identity",
        type: "leadership",
        statement:
          "The Sravana Vedham website introduces Sravani as a Farmer & Founder and says she established the business to make traditionally pressed food available beyond her own family.",
        displayLabel: "Business role",
        displayValue: "Farmer & Founder",
        displayContext: "Sravana Vedham founder story",
        sources: [websiteSource],
      },
      {
        id: "48000000-0000-4000-8000-000000000007",
        key: "eddu_ganuga_press",
        type: "innovation",
        statement:
          "The Sravana Vedham website says its oils are cold pressed in a traditional wooden Eddu Ganuga powered by a bullock, without machines or chemicals, and identifies the press as part of Sravani's farm-based food story.",
        displayLabel: "Traditional processing",
        displayValue: "Bullock-powered wooden press",
        displayContext: "Sravana Vedham website",
        sources: [websiteSource],
      },
      {
        id: "48000000-0000-4000-8000-000000000008",
        key: "website_product_catalog",
        type: "knowledge_sharing",
        statement:
          "The Sravana Vedham website lists 16 products across cold-pressed oils, sprouted flours, Avisa Laddu and organic jaggery, with product pages showing pack-size options and listed prices at the time of review.",
        displayLabel: "Website catalogue",
        displayValue: "16 listed products",
        displayContext: "Observed 30 Aug 2026; prices and stock change",
        sources: [websiteSource, ...productSources],
      },
    ],
    sections: [
      {
        kind: "origin",
        heading: "A channel born from the happiness of greenery",
        body:
          `Sravana Lakshmi introduces Sravana Megham with an intimate idea: green nature gives her happiness, and sharing that happiness with others makes it grow. Her channel is not framed as a distant agricultural institution. It is a personal window into the places, routines, work and traditions that shape her days.

That starting point gives the channel its distinctive tone. The farm and home are not separated from one another, and knowledge does not arrive only as instruction. A morning, a flower, a cow, a seed or a family activity can all become a small lesson in how to notice the natural world. Lakshmi's stated hope is that her videos offer viewers knowledge, entertainment or at least a little rest.`,
        claimKeys: ["nature_care_mission", "documented_garden_work"],
      },
      {
        kind: "origin",
        heading: "From a family kitchen to Sravana Vedham",
        body:
          `Sravana Vedham's founder story adds an important dimension to Lakshmi's public identity. The website introduces her as Sravani, Farmer & Founder, and describes a decision to slow down and live closer to nature: growing food, eating what the earth gives and returning to practices associated with her grandparents.

The story begins at home. The website says she did not want her family eating oils pressed by machines in factories, so she established a traditional Eddu Ganuga on her farm. After pressing oil for her own kitchen, she decided that other families should also have access to what she calls real, honest food. Sravana Vedham is presented as the result of that decision—a farm-linked food business growing out of a household practice.`,
        claimKeys: ["farmer_founder_identity", "eddu_ganuga_press"],
      },
      {
        kind: "work",
        heading: "The Eddu Ganuga: tradition used as a working technology",
        body:
          `The centrepiece of the website's story is the Eddu Ganuga, a traditional wooden press powered by a bullock. Sravana Vedham says its oils are cold pressed through this process and describes it as a method carried out without machines, chemicals or shortcuts. The founder photograph shows Lakshmi standing beside the large wooden press at the farm.

That image is more than branding. It explains the relationship between the person, the farm and the product catalogue: the processing method is part of the identity of the business. FarmerBook reports the website's description as an attributed claim and does not independently test extraction methods, purity, nutritional properties, chemical residues or health outcomes.`,
        claimKeys: ["eddu_ganuga_press"],
      },
      {
        kind: "impact",
        heading: "A clear environmental ethic",
        body:
          `The public About description is unusually direct about Lakshmi's values. She says that cutting trees and eating chemically grown food should not automatically be accepted as progress. She describes the destruction of nature as a serious concern and asks what happens if people remain silent when the environment is being damaged.

Her response is practical rather than grandiose. She acknowledges that one person's contribution may be as small as a grain of sand in the ocean, but argues that many people must change together so that children inherit a healthier environment. The significance of Sravana Megham lies in that bridge between personal practice and public invitation: viewers are encouraged to begin where they are.`,
        claimKeys: ["nature_care_mission"],
      },
      {
        kind: "work",
        heading: "Seeds, garden produce and the work of growing food",
        body:
          `Recent public videos include vegetable-seed planting and a look at produce growing in the garden. The titles do not provide a complete crop inventory, and FarmerBook has not inferred specific vegetables that are not named. What they do show is Lakshmi's attention to the beginning of the food cycle: putting seeds into the soil, waiting for growth and noticing what the garden produces.

This is a valuable part of the channel's agricultural story. It places food production within ordinary domestic life instead of making it seem distant or industrial. The videos suggest a relationship with food based on observation and participation, while the public description supplies the larger philosophy of avoiding environmental harm. The profile records this as documented garden work, not as proof of certified organic production or commercial supply.`,
        claimKeys: ["documented_garden_work"],
      },
      {
        kind: "work",
        heading: "Cows as companions in a working household",
        body:
          `Cows occupy a visible place in Lakshmi's public storytelling. One video is titled ‘Our cows' stories’ and pairs that subject with fruit or produce from the garden. Another says that a cow brought many changes to her life. The titles point to livestock as part of the emotional and practical texture of her daily world, rather than a separate production unit discussed only in terms of output.

The available public material does not state the number, breeds, production levels or sale of dairy products, so none of those details are claimed here. The well-supported point is simpler: cows, garden work and home life are recurring subjects through which Lakshmi communicates her nature-centred way of living.`,
        claimKeys: ["cattle_and_home_life"],
      },
      {
        kind: "community",
        heading: "Telugu tradition is part of the farm story",
        body:
          `Lakshmi's environmental outlook is closely tied to cultural memory. She writes about her strong affection for Telugu traditions and customs and says that she tries to follow older practices even when doing so means taking a few steps back from modern habits. In this telling, tradition is not presented as decoration; it is part of how a household relates to food, festivals, work and nature.

The public channel also includes a Varalakshmi Vratam video, alongside jasmine flowers, garlands and family-centred daily scenes. These moments expand the meaning of farming. A productive landscape is not only a place where crops are grown; it is also a place where language, ritual, flowers, food and intergenerational practices continue to live.`,
        claimKeys: ["telugu_traditions"],
      },
      {
        kind: "work",
        heading: "A 16-product catalogue built around traditional foods",
        body:
          `At the time of review, Sravana Vedham's public shop listed 16 products. The catalogue is led by 10 bullock-churned, cold-pressed oils: groundnut, niger seed, coconut, white sesame, castor, black sesame, almond, safflower, mustard and flaxseed. It also lists four sprouted flours—ragi, jonna, sajja and wheat—along with Avisa Laddu and Organic Jaggery.

The website displayed pack-size choices for the oils and listed prices ranging from ₹305 for groundnut oil to ₹1,640 for niger seed oil, depending on the product and selected option. Flour, laddu and jaggery pack sizes are also shown on the home page. These are website-listed prices captured on 30 August 2026, not permanent quotations; availability, shipping, taxes, packaging and fulfilment should be confirmed directly with Sravana Vedham.`,
        claimKeys: ["website_product_catalog"],
      },
      {
        kind: "lessons",
        heading: "A slower definition of progress",
        body:
          `Across the public record, Lakshmi offers a slower definition of progress. It includes physical work, planting, caring for animals, cooking, preserving customs, enjoying flowers and making time to notice peace. One of her videos describes the lifestyle as difficult but says that its calm can only be understood by experiencing it; another reflects on the happiness of doing work one truly likes.

That perspective makes Sravana Megham more than a farming video channel. It is a record of values being practised in small, visible ways. For viewers, the invitation is not to copy a complete lifestyle overnight. It is to ask which small choices—about trees, food, waste, gardens, animals or traditions—could help create a more generous relationship with the environment.`,
        claimKeys: ["nature_care_mission", "documented_garden_work", "cattle_and_home_life"],
      },
      {
        kind: "impact",
        heading: "A public community built around everyday nature",
        body:
          `The scale of the channel shows that these quiet subjects have found a large audience. At the time of review, YouTube displayed approximately 246,000 subscribers, 523 videos and more than 232 million views for Sravana Megham. Those figures are a changing platform snapshot, not a measure of farm production or an independent assessment of impact.

What can be said with confidence is that Lakshmi has created a durable public space in Telugu for nature-centred domestic and agricultural storytelling. Her work gives viewers a place to learn, pause and recognise dignity in activities that are often overlooked: planting a seed, tying a jasmine garland, feeding a cow, cooking outdoors or ending a long day close to green life.`,
        claimKeys: ["public_channel_scale", "nature_care_mission"],
      },
    ],
    reportedProducts,
    coverage: videos.map((video, index) => ({
      url: video.url,
      publisher: "శ్రావణ మేఘం / Sravana Megham",
      title: `${video.title} — public video #${index + 1}`,
      sourceType: video.sourceType,
      thumbnail: {
        assetUrl: `https://i.ytimg.com/vi/${video.url.split("v=")[1]}/maxresdefault.jpg`,
        altText: `${video.title} — YouTube thumbnail`,
        provider: "youtube_oembed" as const,
      },
    })),
    seo: {
      title: "Sravana Lakshmi | Sravana Megham | FarmerBook",
      description:
        "A FarmerBook editorial profile of Telugu farmer and nature creator Sravana Lakshmi, documenting garden work, cows, Telugu traditions and nature-centred living.",
      keywords: [
        "Sravana Lakshmi",
        "Sravana Megham",
        "Telugu farmer",
        "home gardening",
        "natural living",
        "vegetable seeds",
        "cattle care",
        "Telugu traditions",
      ],
    },
  },
} satisfies FeaturedFarmerPublication;
