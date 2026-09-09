import type { FeaturedFarmerPublication } from "./queries";

const ilriMaizeSource = {
  id: "4b000000-0000-4000-8000-000000000001",
  url: "https://www.ilri.org/knowledge/publications/identification-superior-dual-purpose-maize-hybrid-among-widely-grown-hybrids",
  publisher: "International Livestock Research Institute",
  title:
    "Identification of a superior dual purpose maize hybrid and value addition to its stover through feed supplementation and feed processing",
  publishedAt: "2013-09-01",
  sourceType: "ILRI publication record",
  quality: "institutional_reference",
  association: "professional_reference",
};

const lambNutritionSource = {
  id: "4b000000-0000-4000-8000-000000000002",
  url: "https://pubmed.ncbi.nlm.nih.gov/25757879/",
  publisher: "PubMed",
  title:
    "Effect of protein and energy levels in sweet sorghum bagasse leaf residue-based diets on the performance of growing Deccani lambs",
  publishedAt: "2015-03-01",
  sourceType: "PubMed-indexed research record",
  quality: "independent_reporting",
  association: "professional_reference",
};

const institutionalListingSource = {
  id: "4b000000-0000-4000-8000-000000000003",
  url: "https://idc.icrisat.org/idc/wp-content/uploads/2015/09/Action-Plan-Preparatory-Workshop-28-29-April-15-1.pdf",
  publisher: "ICRISAT",
  title: "Action Plan Preparatory Workshop, 28–29 April 2015",
  publishedAt: "2015-04-29",
  sourceType: "institutional workshop document",
  quality: "institutional_reference",
  association: "professional_reference",
};

const feedResearchSource = {
  id: "4b000000-0000-4000-8000-000000000004",
  url: "https://www.biochemjournal.com/archives/2025.v9.i11.J.6813/nutritive-pre-eminence-and-parsimony-of-black-soldier-fly-larval-excreta-over-dried-soldier-fly-larval-meal-as-feed-supplement-in-cattle-and-buffalo-ration",
  publisher: "International Journal of Advanced Biochemistry Research",
  title:
    "Nutritive pre-eminence and parsimony of Black Soldier Fly larval excreta over dried larval meal as feed supplement in cattle and buffalo ration",
  publishedAt: "2025-10-01",
  sourceType: "research article",
  quality: "independent_reporting",
  association: "professional_reference",
};

const hinduCoverageSource = {
  id: "4b000000-0000-4000-8000-000000000005",
  url: "https://www.thehindu.com/todays-paper/tp-national/tp-andhrapradesh/can-the-milk-of-indian-cows-cure-diabetes/article3622248.ece",
  publisher: "The Hindu",
  title: "Can the milk of Indian cows cure diabetes?",
  publishedAt: "2013-12-01",
  sourceType: "newspaper coverage",
  quality: "independent_reporting",
  association: "third_party_coverage",
};

const therapeuticMilkSource = {
  id: "4b000000-0000-4000-8000-000000000006",
  url: "https://www.ejpmr.com/issue/2017/VOLUME%204%2C%20FEBRUARY%20ISSUE%202",
  publisher: "European Journal of Pharmaceutical and Medical Research",
  title:
    "Research on Therapeutic Milk Production for Diabetes in Humans from Indigenous Cattle",
  publishedAt: "2017-02-01",
  sourceType: "journal issue article",
  quality: "institutional_reference",
  association: "professional_reference",
};

const therapeuticMilkMirrorSource = {
  id: "4b000000-0000-4000-8000-000000000007",
  url: "https://en.engormix.com/dairy-cattle/milk-quality/research-therapeutic-milk-production_a40450/",
  publisher: "Engormix",
  title:
    "Research on Therapeutic Milk Production for Diabetes in Humans from Indigenous Cattle",
  publishedAt: "2017-10-19",
  sourceType: "author-attributed article mirror",
  quality: "third_party_coverage",
  association: "third_party_coverage",
};

export const saiButchaRaoMallampalliPublication: FeaturedFarmerPublication = {
  publication_id: "4b000000-0000-4000-8000-000000000010",
  slug: "sai-butcha-rao-mallampalli",
  publication_revision: 2,
  publication_status: "published",
  fact_checked_at: "2026-09-07T00:00:00.000Z",
  published_at: "2026-09-07T00:00:00.000Z",
  snapshot: {
    fullName: "Dr. Sai Butcha Rao Mallampalli",
    district: null,
    state: "Telangana",
    locale: "en-IN",
    headline: "Connecting animal health, fodder and farmer livelihoods",
    deck:
      "Dr. Sai Butcha Rao Mallampalli is a veterinarian and livestock professional whose work connects animal healthcare, farmer education, fodder development, indigenous-cattle initiatives and crop–livestock research.",
    whyFeatured:
      "Dr. Sai belongs in FarmerBook’s Featured Professionals category because his career sits at the meeting point of veterinary service, public Animal Husbandry work, farmer training and livestock-feed research. His supplied resume describes more than two decades of field and leadership experience, while public research records identify Sai Butcha Rao as a contributor to studies on crop residues, animal nutrition and alternative feed resources. This is a source-attributed editorial profile, not a verification, endorsement or professional-service recommendation.",
    categorySlugs: [
      "featured-professionals",
      "veterinary-animal-health",
      "animal-feed-fodder",
      "training-extension",
    ],
    limitations: [
      "The supplied resume was used as the starting biographical record. Its detailed employment dates, awards and project outcomes have not been independently corroborated in the public sources reviewed.",
      "Public records use variants including ‘Sai Butcha Rao’, ‘Sai Butcha Rao M.’ and ‘Saibutcha Rao Mallampalli’. The 2025 feed paper is treated as a strong professional match because its name, subject area and Andhra Pradesh Animal Husbandry role are consistent, not as absolute identity proof.",
      "This is an editorial profile, not a FarmerBook member account, identity verification, certification, endorsement, service contract, marketplace listing or veterinary advice.",
      "The public profile intentionally omits the supplied phone number, email address and precise street address. A public phone or email is not, by itself, permission for marketing or outreach.",
      "The diabetes-related milk claims mentioned in historical coverage are unsettled and are not medical advice, treatment guidance or an established health claim.",
      "The 2017 therapeutic-milk paper describes a proposed research design and does not report clinical results establishing that indigenous-cattle milk or curd treats or prevents diabetes.",
      "No Farmer-owned social account was manually confirmed for this publication, so the page does not display social-profile links.",
    ],
    editorialDisclosure:
      "FarmerBook editorial profile based on a supplied professional resume and cited public institutional, research and newspaper sources; created for discovery and public-interest context, not membership, identity verification, certification, endorsement or veterinary advice.",
    personMetadata: {
      alternateNames: ["Sai Butcha Rao", "Sai Butcha Rao M.", "Saibutcha Rao Mallampalli"],
      jobTitles: [
        "Veterinarian",
        "Assistant Director (Animal Husbandry)",
        "Livestock and fodder researcher",
      ],
      homeLocation: "Hyderabad, Telangana, India",
      knowsAbout: [
        "Livestock health management",
        "Veterinary public health",
        "Livestock fodder development",
        "Crop–livestock systems",
        "Animal nutrition",
        "Indigenous-cattle development",
        "Farmer training and extension",
        "Climate-smart livestock production",
      ],
    },
    media: null,
    socialLinks: [],
    sources: [
      ilriMaizeSource,
      lambNutritionSource,
      institutionalListingSource,
      feedResearchSource,
      hinduCoverageSource,
      therapeuticMilkSource,
      therapeuticMilkMirrorSource,
    ],
    claims: [
      {
        id: "4b000000-0000-4000-8000-000000000101",
        key: "public_animal_husbandry_role",
        type: "leadership",
        statement:
          "An ICRISAT-hosted workshop document lists Sai Butcha Rao as a Veterinary Assistant Surgeon with Animal Husbandry in Hyderabad. The supplied resume records a later Assistant Director (Animal Husbandry) role in the Government of Andhra Pradesh; that progression remains resume-supplied.",
        displayLabel: "Public professional record",
        displayValue: "Animal Husbandry",
        displayContext: "Institutional listing plus supplied resume",
        sources: [institutionalListingSource],
      },
      {
        id: "4b000000-0000-4000-8000-000000000102",
        key: "crop_livestock_research",
        type: "knowledge_sharing",
        statement:
          "ILRI and PubMed records identify Sai Butcha Rao or Saibutcha Rao Mallampalli among the authors of research on dual-purpose crops, crop residues, feed processing and diets for Deccani lambs.",
        displayLabel: "Research focus",
        displayValue: "Crop + livestock",
        displayContext: "ILRI and PubMed research records",
        sources: [ilriMaizeSource, lambNutritionSource],
      },
      {
        id: "4b000000-0000-4000-8000-000000000103",
        key: "alternative_feed_research",
        type: "innovation",
        statement:
          "A 2025 research article lists Sai Butcha Rao as a co-author of a study examining black soldier fly larval material and excreta as potential feed supplements for cattle and buffalo.",
        displayLabel: "Recent research",
        displayValue: "Alternative feed",
        displayContext: "2025 research article",
        sources: [feedResearchSource],
      },
      {
        id: "4b000000-0000-4000-8000-000000000104",
        key: "indigenous_cattle_questions",
        type: "ecological_stewardship",
        statement:
          "The Hindu’s 2013 coverage connects Sai Butcha Rao’s ILRI/ICRISAT-linked work with questions about feeding Gir cattle and possible therapeutic properties of milk; the article also notes that the diabetes claim was not settled.",
        displayLabel: "Public-interest question",
        displayValue: "Evidence matters",
        displayContext: "Historical coverage; not a health claim",
        sources: [hinduCoverageSource],
      },
      {
        id: "4b000000-0000-4000-8000-000000000105",
        key: "therapeutic_milk_research",
        type: "knowledge_sharing",
        statement:
          "The 2017 European Journal of Pharmaceutical and Medical Research article attributed to Dr. Saibutcharao Mallampalli proposes studying curd made from indigenous-cattle milk, including Gir and Ongole cattle, through a controlled comparison of dietary groups and blood-glucose measurements.",
        displayLabel: "Research article",
        displayValue: "Therapeutic milk proposal",
        displayContext: "EJPMR, 2017, 4(2), 431–432",
        sources: [therapeuticMilkSource, therapeuticMilkMirrorSource],
      },
    ],
    sections: [
      {
        kind: "origin",
        heading: "A veterinarian working across field service and research",
        body: `The supplied professional record describes Dr. Sai Butcha Rao Mallampalli as a veterinarian with more than two decades of livestock-based technical and social intervention. It records service in Andhra Pradesh Animal Husbandry, a period as a visiting scientist with the International Livestock Research Institute and leadership responsibilities in livestock healthcare, fodder development and indigenous-cattle initiatives.

An ICRISAT-hosted workshop document independently places Sai Butcha Rao in the Andhra Pradesh Animal Husbandry system as a Veterinary Assistant Surgeon in Hyderabad. The public record therefore supports a professional story built around veterinary service and livestock development, while the exact dates and later titles remain attributed to the supplied resume.`,
        claimKeys: ["public_animal_husbandry_role"],
      },
      {
        kind: "work",
        heading: "Health, feed and farmer knowledge belong together",
        body: `The resume describes a practical field approach: routine and critical animal healthcare, fertility camps, artificial-insemination support, disease-control programmes, farmer training on zoonoses and regular extension work. It also records efforts to expand locally useful fodder and feed options, including Azolla and crop residues.

That combination matters in livestock systems. Animal health is shaped not only by treatment, but also by nutrition, breeding, disease prevention, farmer knowledge and the economics of daily care. The specific programme outcomes in the resume have not been independently audited here, so this section presents them as supplied professional experience rather than verified impact metrics.`,
        claimKeys: ["public_animal_husbandry_role"],
      },
      {
        kind: "impact",
        heading: "Crop residues as a livestock resource",
        body: `Public research records make the crop–livestock connection especially visible. The ILRI publication lists Sai Butcha Rao among the authors of a study on dual-purpose maize and the value of its stover through feed supplementation and processing. PubMed also records a study involving Saibutcha Rao Mallampalli on sweet-sorghum bagasse leaf residue diets for growing Deccani lambs.

For farmers, the wider lesson is not a single feed recipe. Crop variety, residue quality, processing, animal age, ration balance and local availability all matter. Research can help frame those questions, but a qualified local veterinarian or animal-nutrition professional should guide decisions for a particular herd.`,
        claimKeys: ["crop_livestock_research"],
      },
      {
        kind: "community",
        heading: "Exploring new feed resources carefully",
        body: `A 2025 paper lists Sai Butcha Rao as a co-author of research on black soldier fly larval material and excreta as potential feed supplements for cattle and buffalo. The paper explores nutrient composition and feed-resource questions; it does not by itself establish that a product is safe, legal, suitable for every animal or ready for farm use.

This is a useful example of the kind of bridge Dr. Sai’s profile represents: veterinary practice, livestock nutrition, crop and by-product use, and research into alternatives that may improve resilience or reduce feed pressure. Any on-farm adoption still requires current evidence and professional advice.`,
        claimKeys: ["alternative_feed_research"],
      },
      {
        kind: "lessons",
        heading: "A professional profile grounded in evidence and restraint",
        body: `Historical newspaper coverage connected Sai Butcha Rao’s research with questions about Gir-cow feeding and possible therapeutic properties of milk. The same coverage made clear that the diabetes-related claim was not settled. That distinction is important: livestock research can generate promising questions without turning them into medical claims.

Dr. Sai’s public-interest contribution is best understood through the combination of veterinary service, fodder and animal-nutrition research, farmer training and indigenous-cattle work described in the supplied resume and public records. Farmers and livestock keepers should use this page as a starting point for discovery, then verify current credentials, availability and advice directly through an appropriate institution or qualified professional.`,
        claimKeys: ["indigenous_cattle_questions", "alternative_feed_research"],
      },
      {
        kind: "impact",
        heading: "Research proposal on therapeutic milk from indigenous cattle",
        body: `The portfolio also includes Dr. Saibutcharao Mallampalli’s 2017 article in the European Journal of Pharmaceutical and Medical Research: “Research on Therapeutic Milk Production for Diabetes in Humans from Indigenous Cattle” (EJPMR, 4(2), 431–432). The Telugu title is “దేశీయ పశువుల నుండి మధుమేహ చికిత్సకు ఉపయోగపడే పాలు ఉత్పత్తిపై పరిశోధన”.

The article proposes investigating curd made from indigenous-cattle milk, including Gir and Ongole cattle, through comparison groups and blood-glucose measurements. It is best represented as a research proposal and public-interest contribution: the article does not establish a diabetes treatment, report clinical efficacy or replace evidence-based medical care.`,
        claimKeys: ["therapeutic_milk_research"],
      },
    ],
    coverage: [
      {
        url: ilriMaizeSource.url,
        publisher: ilriMaizeSource.publisher,
        title: ilriMaizeSource.title,
        sourceType: "ILRI publication record",
      },
      {
        url: feedResearchSource.url,
        publisher: feedResearchSource.publisher,
        title: feedResearchSource.title,
        sourceType: "2025 research article",
      },
      {
        url: therapeuticMilkSource.url,
        publisher: therapeuticMilkSource.publisher,
        title: therapeuticMilkSource.title,
        sourceType: "2017 journal issue article",
      },
      {
        url: therapeuticMilkMirrorSource.url,
        publisher: therapeuticMilkMirrorSource.publisher,
        title: therapeuticMilkMirrorSource.title,
        sourceType: "author-attributed article mirror",
      },
    ],
    seo: {
      title: "Dr. Sai Butcha Rao Mallampalli — Featured Professionals | FarmerBook",
      description:
        "A source-attributed FarmerBook editorial profile of Dr. Sai Butcha Rao Mallampalli, veterinarian and livestock professional working across animal health, fodder, farmer training and crop–livestock research.",
      keywords: [
        "Sai Butcha Rao Mallampalli",
        "veterinarian",
        "livestock health",
        "fodder development",
        "animal nutrition",
        "crop livestock research",
        "therapeutic milk research",
        "Featured Professionals",
      ],
    },
  },
};
