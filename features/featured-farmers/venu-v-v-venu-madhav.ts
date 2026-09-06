import type { FeaturedFarmerPublication } from "./queries";

const orchardVideoSource = {
  id: "4a000000-0000-4000-8000-000000000001",
  url: "https://www.youtube.com/watch?v=Od9NwSFsu9M",
  publisher: "Public YouTube agriculture feature",
  title:
    "నిమ్మ..సపోటా తోటల సాగులో అద్భుతమైన ఫలితాలు సాధిస్తున్న డాక్టర్ వేణు — Organic agriculture",
  publishedAt: null,
  sourceType: "third-party YouTube feature",
  quality: "third_party_coverage",
  association: "third_party_coverage",
};

const forestFarmingSource = {
  id: "4a000000-0000-4000-8000-000000000002",
  url: "https://www.youtube.com/watch?v=hNyFQZ6bQB4",
  publisher: "Public YouTube agriculture feature",
  title: "అటవీ తరహాలో ఆదర్శ వ్యవసాయం — Venu",
  publishedAt: null,
  sourceType: "third-party YouTube feature",
  quality: "third_party_coverage",
  association: "third_party_coverage",
};

const organicForestSource = {
  id: "4a000000-0000-4000-8000-000000000003",
  url: "https://www.youtube.com/watch?v=hakpl2slVFg",
  publisher: "Public YouTube agriculture feature",
  title: "సేంద్రీయ పంటల వనాన్ని అభివృద్ధి చేశారు — Venu",
  publishedAt: null,
  sourceType: "third-party YouTube feature",
  quality: "third_party_coverage",
  association: "third_party_coverage",
};

const neemCakeSource = {
  id: "4a000000-0000-4000-8000-000000000004",
  url: "https://www.youtube.com/watch?v=3Mw6d7xQLgQ",
  publisher: "Public YouTube agriculture feature",
  title: "విప్ప పిండితో పంటల కషాయం",
  publishedAt: null,
  sourceType: "third-party YouTube farming clip",
  quality: "third_party_coverage",
  association: "third_party_coverage",
};

export const venuVenuMadhavPublication = {
  publication_id: "4a000000-0000-4000-8000-000000000010",
  slug: "venu-v-v-venu-madhav",
  publication_revision: 1,
  publication_status: "published",
  fact_checked_at: "2026-09-03T10:00:00.000Z",
  published_at: "2026-09-03T10:00:00.000Z",
  snapshot: {
    fullName: "Dr. V. V. Venu Madhav",
    district: "Vijayawada",
    state: "Andhra Pradesh",
    locale: "en-IN",
    headline: "From engineering classrooms to a forest-style farm",
    deck:
      "Retired lecturer Dr. V. V. Venu Madhav brings careful observation and a spirit of experimentation to lemon, sapota and diversified farming in Andhra Pradesh.",
    whyFeatured:
      "Venu’s story shows how teaching and farming can strengthen each other. His orchard work and public farming videos invite growers to look closely at trees, soil, water and crop combinations, then make decisions based on what the land is showing them.",
    categorySlugs: ["citrus", "sapota", "agroforestry"],
    limitations: [
      "All information in this editorial profile is pending manual verification. This is not a FarmerBook member account, identity verification, certification, endorsement or marketplace listing.",
      "The information is based on details supplied for editorial review and observations from public videos. Venu’s farming practices and related statements are self-reported or publicly observed, not independently verified, endorsed or guaranteed.",
      "Self-certification only: no organic certification has been completed or verified for this profile. Organic or natural-farming labels should not be used for products or sales without current supporting documentation.",
      "Any fruit-health claims appearing in shared video captions remain unverified and are not medical advice.",
    ],
    editorialDisclosure:
      "FarmerBook editorial profile based on cited public YouTube information and biographical information supplied for editorial review; not membership, identity verification, certification, endorsement, a marketplace listing or agricultural advice.",
    personMetadata: {
      jobTitles: ["Farmer", "Retired lecturer", "Mechanical engineer"],
      homeLocation: "Vijayawada, Andhra Pradesh, India",
      knowsAbout: [
        "Lemon cultivation",
        "Sapota cultivation",
        "Horticulture",
        "Mixed farming",
        "Forest-style farming",
        "Organic-oriented farming",
        "Orchard observation and pruning",
      ],
    },
    media: null,
    sourceHostedPreview: {
      assetUrl: "https://i.ytimg.com/vi/Od9NwSFsu9M/maxresdefault.jpg",
      sourceUrl: orchardVideoSource.url,
      altText:
        "Source video thumbnail for Dr. Venu’s lemon and sapota orchard feature",
      credit: "Public YouTube agriculture feature",
      creditUrl: orchardVideoSource.url,
      provider: "youtube_oembed",
      focalPoint: "center",
    },
    sourceHostedBackground: {
      assetUrl: "https://i.ytimg.com/vi/hNyFQZ6bQB4/maxresdefault.jpg",
      sourceUrl: forestFarmingSource.url,
      altText: "Source video thumbnail for Venu’s forest-style farming feature",
      credit: "Public YouTube agriculture feature",
      creditUrl: forestFarmingSource.url,
      provider: "youtube_oembed",
      focalPoint: "center",
    },
    socialLinks: [],
    sources: [
      orchardVideoSource,
      forestFarmingSource,
      organicForestSource,
      neemCakeSource,
    ],
    claims: [
      {
        id: "4a000000-0000-4000-8000-000000000101",
        key: "orchard_observation",
        type: "knowledge_sharing",
        statement:
          "The orchard video visits a lemon and sapota garden associated with Dr. Venu and discusses tree health, pruning, pests and nutrient balance.",
        displayLabel: "Farm focus",
        displayValue: "Lemon and sapota",
        displayContext: "Public orchard feature",
        sources: [orchardVideoSource],
      },
      {
        id: "4a000000-0000-4000-8000-000000000102",
        key: "mature_lemon_orchard",
        type: "ecological_stewardship",
        statement:
          "The public video describes a roughly 12-year-old lemon orchard in Chiluvuru and examines its condition and seasonal management.",
        displayLabel: "Orchard age",
        displayValue: "About 12 years",
        displayContext: "As described in the public video",
        sources: [orchardVideoSource],
      },
      {
        id: "4a000000-0000-4000-8000-000000000103",
        key: "forest_style_farming",
        type: "innovation",
        statement:
          "Two public videos associated with Venu present forest-style horticulture, mixed farming and a multi-crop system as central themes.",
        displayLabel: "Farm design",
        displayValue: "Mixed and multi-crop",
        displayContext: "Public farming videos",
        sources: [forestFarmingSource, organicForestSource],
      },
      {
        id: "4a000000-0000-4000-8000-000000000104",
        key: "practical_tree_care",
        type: "knowledge_sharing",
        statement:
          "The orchard discussion highlights close observation of upright shoots, leaf damage and nutrient balance before making management decisions.",
        displayLabel: "Working style",
        displayValue: "Observe and correct",
        displayContext: "Context-specific orchard discussion",
        sources: [orchardVideoSource],
      },
      {
        id: "4a000000-0000-4000-8000-000000000105",
        key: "on_farm_input_learning",
        type: "ecological_stewardship",
        statement:
          "A shared farming clip discusses a preparation made with neem cake, pointing to Venu’s interest in locally discussed farm inputs and practices.",
        displayLabel: "Learning theme",
        displayValue: "Local farm inputs",
        displayContext: "Shared public farming clip",
        sources: [neemCakeSource],
      },
    ],
    sections: [
      {
        kind: "origin",
        heading: "A new classroom in the orchard",
        body:
          "After a career in engineering education, Dr. V. V. Venu Madhav has turned his attention to farming. The orchard and farming videos associated with him show a practical, curious approach: look at the plant, understand the condition of the land and make a careful correction.",
        claimKeys: ["orchard_observation"],
      },
      {
        kind: "work",
        heading: "Learning from lemon and sapota trees",
        body: `A public Telugu agriculture feature visits a lemon and sapota garden in Chiluvuru, Duggirala mandal. The video describes a mature lemon orchard and discusses tree health, minor pest damage, nutrient balance and pruning. One lesson is the value of recognising vigorous upright shoots that can compete with productive growth.

Orchard care is never one-size-fits-all. Tree age, variety, soil, rainfall and season all matter. Venu’s example encourages farmers to observe first and adapt management to the conditions in front of them.`,
        claimKeys: ["mature_lemon_orchard", "practical_tree_care"],
      },
      {
        kind: "impact",
        heading: "A forest-style view of farming",
        body: `Two other public videos present Venu’s farming interests through the language of forest farming, horticulture and mixed crops. The idea is to see the farm as a connected system rather than as a single crop in isolation. Crop diversity, canopy, soil cover, water movement and seasonal planning can all become part of the conversation.

The videos share an approach and a set of questions. They do not by themselves establish a particular yield, income, certification or soil outcome.`,
        claimKeys: ["forest_style_farming"],
      },
      {
        kind: "community",
        heading: "Knowledge that can travel farmer to farmer",
        body:
          "Venu’s public farming material is valuable because it makes observation visible. A grower can compare the orchard discussion with local experience, consult an agronomist and test a suitable change on a manageable part of the farm. A shared clip about neem-cake-based inputs adds another reminder: a traditional or locally popular practice still needs the right preparation, timing and crop-specific guidance.",
        claimKeys: ["on_farm_input_learning"],
      },
      {
        kind: "lessons",
        heading: "The habit of measuring before deciding",
        body: `For farmers, the strongest lesson is simple: observe, record and learn. Keep notes on pruning, irrigation, rainfall, pest symptoms, soil tests, input quantities and harvest. For customers and visitors, the same habit becomes better questions about what is grown, how decisions are made and which claims are supported by current evidence.

From engineering classrooms to the living systems of a farm, Venu’s work points toward agriculture as a continuing practice of learning.`,
        claimKeys: ["practical_tree_care", "forest_style_farming"],
      },
    ],
    coverage: [
      {
        url: orchardVideoSource.url,
        publisher: orchardVideoSource.publisher,
        title: orchardVideoSource.title,
        sourceType: "Public Telugu YouTube agriculture feature",
        thumbnail: {
          assetUrl: "https://i.ytimg.com/vi/Od9NwSFsu9M/maxresdefault.jpg",
          altText: "Lemon and sapota orchard feature thumbnail",
          provider: "youtube_oembed",
        },
      },
      {
        url: forestFarmingSource.url,
        publisher: forestFarmingSource.publisher,
        title: forestFarmingSource.title,
        sourceType: "Public YouTube farming feature",
        thumbnail: {
          assetUrl: "https://i.ytimg.com/vi/hNyFQZ6bQB4/maxresdefault.jpg",
          altText: "Forest-style farming feature thumbnail",
          provider: "youtube_oembed",
        },
      },
      {
        url: organicForestSource.url,
        publisher: organicForestSource.publisher,
        title: organicForestSource.title,
        sourceType: "Public YouTube farming feature",
        thumbnail: {
          assetUrl: "https://i.ytimg.com/vi/hakpl2slVFg/maxresdefault.jpg",
          altText: "Organic crop forest feature thumbnail",
          provider: "youtube_oembed",
        },
      },
      {
        url: neemCakeSource.url,
        publisher: neemCakeSource.publisher,
        title: neemCakeSource.title,
        sourceType: "Public YouTube farming clip",
        thumbnail: {
          assetUrl: "https://i.ytimg.com/vi/3Mw6d7xQLgQ/maxresdefault.jpg",
          altText: "Neem-cake farming input clip thumbnail",
          provider: "youtube_oembed",
        },
      },
    ],
    seo: {
      title: "Dr. V. V. Venu Madhav | Forest-Style Farming | FarmerBook",
      description:
        "FarmerBook’s editorial profile of retired lecturer and farmer Dr. V. V. Venu Madhav, whose public videos explore lemon, sapota, horticulture and mixed farming.",
      keywords: [
        "Venu Madhav farmer",
        "retired lecturer farmer",
        "lemon farming Andhra Pradesh",
        "sapota farming",
        "forest farming",
        "mixed farming",
      ],
    },
  },
} satisfies FeaturedFarmerPublication;
