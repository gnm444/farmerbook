import type { FeaturedFarmerPublication } from "./queries";

const linkedinSource = {
  id: "48000000-0000-4000-8000-000000000001",
  url: "https://www.linkedin.com/in/ramoo/",
  publisher: "LinkedIn",
  title: "Ramanjaneyulu G V — public professional profile",
  publishedAt: null,
  sourceType: "public professional profile",
  quality: "owned_social_profile",
  association: "professional_reference",
};

const csaHomeSource = {
  id: "48000000-0000-4000-8000-000000000002",
  url: "https://csa-india.org/",
  publisher: "Centre for Sustainable Agriculture",
  title: "Centre for Sustainable Agriculture — programmes, services and reach",
  publishedAt: null,
  sourceType: "first-party institutional website",
  quality: "first_party",
  association: "professional_reference",
};

const csaAwardSource = {
  id: "48000000-0000-4000-8000-000000000003",
  url: "https://csa-india.org/2025/01/16/dr-g-v-ramanjaneyulu-agliberte-25-conserv-honor-contribution-to-seed-conservation/",
  publisher: "Centre for Sustainable Agriculture",
  title: "AgLiberte 25 Conserv Honor Contribution to Seed Conservation",
  publishedAt: "2025-01-16",
  sourceType: "first-party institutional announcement",
  quality: "first_party",
  association: "professional_reference",
};

const csaTeamSource = {
  id: "48000000-0000-4000-8000-000000000004",
  url: "https://csa-india.org/team/ramanjaneyulu-gv/",
  publisher: "Centre for Sustainable Agriculture",
  title: "Ramanjaneyulu GV — official CSA staff profile and photograph",
  publishedAt: "2022-10-23",
  sourceType: "official staff profile",
  quality: "first_party",
  association: "professional_reference",
};

export const ramanjaneyuluCsaPublication: FeaturedFarmerPublication = {
  publication_id: "48000000-0000-4000-8000-000000000010",
  slug: "raman-janeyulu-csa",
  publication_revision: 1,
  publication_status: "published",
  fact_checked_at: "2026-08-31T12:00:00.000Z",
  published_at: "2026-08-31T12:00:00.000Z",
  snapshot: {
    fullName: "Ramanjaneyulu G V",
    district: null,
    state: "Telangana",
    locale: "en-IN",
    headline: "Building farmer-owned ecological food systems",
    deck:
      "Ramanjaneyulu G V is an agricultural scientist and agroecology leader whose public work connects farmer knowledge, farmer institutions, ecological farming, markets and policy. As Executive Director of the Centre for Sustainable Agriculture, he works with farmer collectives and partner organisations on practical pathways toward resilient rural livelihoods.",
    whyFeatured:
      "Ramanjaneyulu belongs in FarmerBook’s Agripreneurs / NGOs category because his work sits at the meeting point of farming practice, farmer-owned institutions and public-interest agricultural change. The public sources reviewed for this profile describe a career that combines scientific training with field programmes, FPO development, organic and natural farming support, market innovation, training and policy research. This is a source-attributed editorial profile, not a claim that every reported programme, reach figure or outcome is current or independently audited.",
    categorySlugs: ["agripreneurs-ngos", "integrated-farming", "fpo-cooperative-services"],
    limitations: [
      "The profile is based on a public LinkedIn profile and public Centre for Sustainable Agriculture webpages. FarmerBook has not interviewed Ramanjaneyulu or independently audited the reported programme figures.",
      "Greater Hyderabad Area is the public professional location visible on LinkedIn; no precise home address is published here.",
      "The Agripreneurs / NGOs label is a FarmerBook discovery category. It does not assert a legal entity type, employment relationship, partnership or endorsement.",
      "Programme reach, acreage, farmer counts, FPO counts, revenue and price-share figures are reported claims from public sources and may refer to different dates, programmes or measurement methods.",
      "This is an editorial profile, not a FarmerBook member account, identity verification, certification, endorsement, service contract, marketplace listing or agricultural advice.",
    ],
    editorialDisclosure:
      "FarmerBook editorial profile based on cited public professional and institutional sources; created for discovery and public-interest context, not membership, identity verification, certification, endorsement or a service guarantee.",
    personMetadata: {
      alternateNames: ["Dr. G. V. Ramanjaneyulu", "GV Ramanjaneyulu"],
      jobTitles: [
        "Agricultural scientist",
        "Executive Director, Centre for Sustainable Agriculture",
        "Agroecology and farmer-institution leader",
      ],
      homeLocation: "Greater Hyderabad Area, Telangana, India",
      knowsAbout: [
        "Agroecology",
        "Natural farming",
        "Farmer Producer Organisations",
        "Organic farming transitions",
        "Sustainable seed systems",
        "Farmer-owned markets",
        "Participatory organic certification",
        "Agriculture policy and research",
      ],
    },
    sourceHostedPreview: {
      assetUrl: "https://csa-india.org/wp-content/uploads/2022/10/ramoo-sir-pic.jpg",
      sourceUrl: csaTeamSource.url,
      altText: "Dr. G. V. Ramanjaneyulu, Executive Director of the Centre for Sustainable Agriculture",
      credit: "Photograph displayed from the official Centre for Sustainable Agriculture staff profile",
      creditUrl: csaTeamSource.url,
      provider: "public_source",
    },
    socialLinks: [{ platform: "linkedin", url: linkedinSource.url }],
    sources: [linkedinSource, csaHomeSource, csaAwardSource, csaTeamSource],
    claims: [
      {
        id: "48000000-0000-4000-8000-000000000011",
        key: "scientific_and_field_background",
        type: "knowledge_sharing",
        statement:
          "Ramanjaneyulu’s public LinkedIn profile describes him as an agricultural scientist with a PhD from the Indian Agricultural Research Institute and previous work with ICAR’s Directorate of Oilseeds Research before joining the Centre for Sustainable Agriculture.",
        displayLabel: "Professional foundation",
        displayValue: "Agricultural scientist",
        displayContext: "Reported on his public professional profile",
        sources: [linkedinSource],
      },
      {
        id: "48000000-0000-4000-8000-000000000012",
        key: "csa_leadership",
        type: "leadership",
        statement:
          "Ramanjaneyulu’s public LinkedIn profile identifies him as Executive Director of the Centre for Sustainable Agriculture, while CSA’s public website presents agroecology, livelihoods, producer organisations, markets, policy research and support services as core areas of work.",
        displayLabel: "Current leadership",
        displayValue: "Executive Director, CSA",
        displayContext: "LinkedIn role and CSA’s public programme description",
        sources: [linkedinSource, csaHomeSource],
      },
      {
        id: "48000000-0000-4000-8000-000000000013",
        key: "farmer_institutions",
        type: "impact",
        statement:
          "CSA’s public website reports work with 66 Farmer Producer Organisations and lists Farmer Service Centres, FPO ecosystem building, direct marketing, quality assurance and traceability among its public programmes and services.",
        displayLabel: "Producer institutions",
        displayValue: "66 FPOs reported by CSA",
        displayContext: "Institutional website snapshot; date and programme scope may vary",
        sources: [csaHomeSource],
      },
      {
        id: "48000000-0000-4000-8000-000000000014",
        key: "agroecology_programmes",
        type: "ecological_stewardship",
        statement:
          "CSA’s public programme description includes climate-change adaptation, organic and natural farming, sustainable seed systems, extension and advisory services, ecosystem services and carbon financing under its agroecology work.",
        displayLabel: "Agroecology focus",
        displayValue: "Ecology + livelihoods",
        displayContext: "CSA programme description",
        sources: [csaHomeSource],
      },
      {
        id: "48000000-0000-4000-8000-000000000015",
        key: "public_recognition",
        type: "award",
        statement:
          "CSA published an announcement saying its Executive Director, Dr. GV Ramanjaneyulu, was conferred the AgLiberte 2025 award by CEORA and Inba Seva Sangam at a conference in Coimbatore on 11 January 2025.",
        displayLabel: "Public recognition",
        displayValue: "AgLiberte 2025",
        displayContext: "CSA announcement dated 16 January 2025",
        sources: [csaAwardSource],
      },
    ],
    sections: [
      {
        kind: "origin",
        heading: "A scientist who moved toward farmer-led systems",
        body:
          "Ramanjaneyulu’s public professional profile describes a scientific foundation in agriculture, including a PhD from the Indian Agricultural Research Institute and earlier work with ICAR’s Directorate of Oilseeds Research. The profile then frames his present work around a different but complementary question: how can agricultural systems place farmer knowledge, farmer institutions and farmer economics at their centre?\n\nThat combination matters. Scientific training can help with evidence, measurement and technical questions; long-term engagement with farmers can help keep those questions connected to land, labour, risk, markets and household decisions. FarmerBook presents this as the direction described in the public profile, not as a claim that one model resolves every agricultural challenge.",
        claimKeys: ["scientific_and_field_background"],
      },
      {
        kind: "work",
        heading: "Agroecology as a practical transition",
        body:
          "The Centre for Sustainable Agriculture’s public website describes agroecology through several connected areas: climate-change adaptation, organic and natural farming, sustainable seed systems, extension and advisory services, ecosystem services and carbon financing. This is broader than a single input or certification label. It treats the farm as part of a living system shaped by soil, water, biodiversity, climate risk, knowledge and economics.\n\nThe public profile connects Ramanjaneyulu to this work as a leader and practitioner. For readers, the useful takeaway is that agroecology here is presented as a transition supported by local knowledge, field learning and institutions—not as a universal recipe or a guarantee of yield, income or certification.",
        claimKeys: ["agroecology_programmes", "csa_leadership"],
      },
      {
        kind: "impact",
        heading: "Building farmer-owned organisations and markets",
        body:
          "CSA’s public programme pages place Farmer Producer Organisations at the heart of its work. They list FPOs, Farmer Service Centres, workplace principles and an FPO ecosystem initiative, while the markets section describes direct marketing, farmers’ market platforms, quality assurance, traceability, consumer engagement and value addition.\n\nCSA also reports 66 FPOs in its public reach summary. That number is an institutional website figure, not an independent audit or a guarantee that every organisation has the same capacity today. The larger idea is clear: farmers need more than production advice. They also need collective institutions that can negotiate, aggregate, add value, reach consumers and retain more of the value created by their work.",
        claimKeys: ["farmer_institutions"],
      },
      {
        kind: "community",
        heading: "Knowledge that travels through training, extension and policy",
        body:
          "The CSA website describes support services that include training and capacity building, diagnostic services, surveillance and advisory services, participatory organic certification, FPO incubation and digital tools for agriculture. Its policy-research areas include evidence for agroecological approaches, farmer income security, support systems, biosafety and regulatory frameworks.\n\nThis mix suggests a bridge between field practice and public systems. A farmer may need to understand soil or pest pressure; an FPO may need an enterprise model; a government programme may need evidence; consumers may need quality assurance and traceability. The profile features Ramanjaneyulu because his public work is described across these levels rather than inside one narrow agricultural specialty.",
        claimKeys: ["agroecology_programmes", "csa_leadership"],
      },
      {
        kind: "lessons",
        heading: "Why this profile belongs in Agripreneurs / NGOs",
        body:
          "FarmerBook’s Agripreneurs / NGOs category is for people and organisations helping agriculture move through enterprise, public-interest programmes, research, training, farmer institutions or ecological practice. Ramanjaneyulu’s public profile fits that discovery purpose through his stated focus on farmer-owned ecological food systems and his role at CSA.\n\nA reader looking for support should still ask practical questions before acting: What geography does a programme cover? Is it meant for an individual farmer, an FPO or a government partner? What is the cost, timeline and evidence? Which claims are current? Who is responsible for delivery? This editorial page is a starting point for informed discovery, not a substitute for direct verification or a service agreement.",
        claimKeys: ["farmer_institutions", "public_recognition"],
      },
    ],
    coverage: [
      {
        url: csaAwardSource.url,
        publisher: csaAwardSource.publisher,
        title: csaAwardSource.title,
        sourceType: "Institutional announcement",
      },
    ],
    seo: {
      title: "Ramanjaneyulu G V — Agripreneurs / NGOs | FarmerBook",
      description:
        "A source-attributed FarmerBook profile of Ramanjaneyulu G V, CSA Executive Director working across agroecology, farmer institutions, markets, training and agriculture policy.",
      keywords: [
        "Ramanjaneyulu G V",
        "GV Ramanjaneyulu",
        "Centre for Sustainable Agriculture",
        "agroecology",
        "Farmer Producer Organisations",
        "Agripreneurs NGOs",
      ],
    },
    media: {
      assetUrl: "/images/featured-farmers/raman-janeyulu-gv.webp",
      altText:
        "Ramanjaneyulu G V standing with folded arms in front of a blue botanical mural",
      credit: "Photograph supplied for the FarmerBook profile; used with permission",
      rightsBasis: "subject_permission",
    },
  },
};
