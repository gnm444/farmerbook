import type { FeaturedFarmerPublication } from "./queries";

const hmtvSource = {
  id: "24ba070f-6c58-4227-b975-e6a323f91551",
  url: "https://www.youtube.com/watch?v=3QCCayr95uU",
  publisher: "HMTV Agri",
  title:
    "Uddamarri Village Farmer Prasad Reddy Success Story in Natural Farming",
  publishedAt: "2019-09-16",
  sourceType: "third-party Telugu YouTube feature",
  quality: "third_party_coverage",
  association: "third_party_coverage",
};

const rythunesthamSource = {
  id: "03e05a8b-bb6c-462a-94df-01041294f553",
  url: "https://www.youtube.com/watch?v=WV8jyJD0TB0",
  publisher: "Rythunestham",
  title:
    "Natural Farm with 60 Varieties of Fruits and Medicinal Plants | Prasad Reddy",
  publishedAt: "2019-10-03",
  sourceType: "third-party Telugu YouTube feature",
  quality: "third_party_coverage",
  association: "third_party_coverage",
};

const villageSource = {
  id: "4391e4a2-54c6-44ab-9035-cf457c28426d",
  url: "https://medchal-malkajgiri.telangana.gov.in/village-panchayats/",
  publisher: "Medchal-Malkajgiri District, Government of Telangana",
  title: "Village Panchayats — Medchal-Malkajgiri District",
  publishedAt: null,
  sourceType: "government village record",
  quality: "official_record",
  association: "professional_reference",
};

const publishedAt = "2026-10-13T01:27:41.000Z";

export const prasadReddyUddamarriPublication: FeaturedFarmerPublication = {
  publication_id: "110e6446-21ce-4b76-a2e7-0b8d4c5cc519",
  slug: "prasad-reddy-uddamarri-natural-farming",
  publication_revision: 1,
  publication_status: "published",
  fact_checked_at: publishedAt,
  published_at: publishedAt,
  snapshot: {
    fullName: "Prasad Reddy",
    district: "Medchal-Malkajgiri",
    state: "Telangana",
    locale: "en-IN",
    headline: "A 2019 record of natural farming in Uddamarri",
    deck:
      "HMTV Agri and Rythunestham profiled Prasad Reddy’s natural-farming work near Keesara in 2019. Their reports describe a family farm and a varied planting mix; this story presents those details as a dated account, not as current information about the farm.",
    whyFeatured:
      "Two Telugu agricultural features recorded a local farmer’s approach to natural farming and a diverse planting mix. Together, they offer a time-bound account of work in Uddamarri while leaving current farm conditions, results and certification unclaimed.",
    sections: [
      {
        kind: "origin",
        heading: "A move into natural farming",
        body:
          "HMTV Agri’s 16 September 2019 feature identifies Prasad Reddy as a farmer in Uddamarri. Its description says Reddy and his family moved into natural farming after trying several businesses. That history is reported by HMTV; FarmerBook has not independently inspected the farm or verified the account beyond the cited coverage.",
        claimKeys: ["family_transition_to_natural_farming"],
      },
      {
        kind: "work",
        heading: "A diverse planting mix, as reported in 2019",
        body:
          "Rythunestham’s 3 October 2019 feature describes the farm as a natural farm with 60 varieties of fruit and medicinal plants. The figure comes from the publisher’s title and report. It is a dated, attributed count, not a current inventory.",
        claimKeys: ["reported_plant_diversity"],
      },
      {
        kind: "lessons",
        heading: "Reading this as a dated record",
        body:
          "The two videos offer a snapshot of farming work described in Uddamarri in 2019. The Medchal-Malkajgiri district village list uses the spelling Uddemarry under Shamirpet. The public sources do not establish what is growing on the farm today, current yields, certification or environmental outcomes.",
        claimKeys: [
          "family_transition_to_natural_farming",
          "reported_plant_diversity",
        ],
      },
    ],
    categorySlugs: [
      "agroforestry",
      "fruit-orchards",
      "medicinal-aromatic-plants",
    ],
    limitations: [
      "This editorial profile relies on third-party reporting published in 2019; FarmerBook has not independently inspected the farm.",
      "The 60-variety figure is Rythunestham’s reported 2019 figure, not a current crop count or independent audit.",
      "The sources do not establish current farming methods, yields, income, certification, or environmental outcomes.",
      "No farmer-owned social account was confirmed. The linked videos are publisher coverage, not the farmer’s social profiles.",
      "This is not a FarmerBook member profile, identity verification, endorsement, marketplace listing, or agricultural advice.",
    ],
    claims: [
      {
        id: "4f7a8059-d359-4fdb-8d34-cf787d099a15",
        key: "family_transition_to_natural_farming",
        type: "significance",
        statement:
          "HMTV Agri’s 16 September 2019 feature says Prasad Reddy and his family moved into natural farming after trying several businesses.",
        displayLabel: "Move into natural farming",
        displayValue: "Reported in 2019",
        displayContext: "HMTV Agri feature",
        sources: [hmtvSource],
      },
      {
        id: "4cbdc86f-fe82-4133-8c1e-4ca4f604e4e6",
        key: "reported_plant_diversity",
        type: "innovation",
        statement:
          "Rythunestham’s 3 October 2019 feature describes the farm as having 60 varieties of fruit and medicinal plants.",
        displayLabel: "Reported plant varieties",
        displayValue: "60",
        displayContext: "Rythunestham, October 2019",
        sources: [rythunesthamSource],
      },
    ],
    sources: [hmtvSource, rythunesthamSource, villageSource],
    socialLinks: [],
    coverage: [
      {
        url: hmtvSource.url,
        publisher: hmtvSource.publisher,
        title: hmtvSource.title,
        sourceType: "Telugu YouTube feature · FarmerBook editorial summary",
      },
      {
        url: rythunesthamSource.url,
        publisher: rythunesthamSource.publisher,
        title: rythunesthamSource.title,
        sourceType: "Telugu YouTube feature · FarmerBook editorial summary",
      },
    ],
    media: null,
    video: null,
    editorialDisclosure:
      "FarmerBook editorial profile based on third-party Telugu features published in 2019. It is a dated account, not a FarmerBook membership, identity verification, endorsement, certification, current-status claim or agricultural advice. The linked videos are publisher coverage; no farmer-owned social profile is linked.",
    seo: {
      title: "Prasad Reddy of Uddamarri | FarmerBook",
      description:
        "A source-attributed account of Prasad Reddy’s natural-farming work near Keesara, based on two Telugu features published in 2019.",
      keywords: [
        "Prasad Reddy",
        "Uddamarri farmer",
        "Keesara natural farming",
        "Shamirpet agriculture",
        "Telangana natural farming",
      ],
    },
  },
};
