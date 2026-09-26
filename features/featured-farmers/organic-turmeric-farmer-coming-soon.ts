import type { FeaturedFarmerPublication } from "./queries";

const featureVideo = {
  id: "4a000000-0000-4000-8000-000000000021",
  url: "https://www.youtube.com/watch?v=UV94JK7GDIU",
  publisher: "Sasyasyamalam",
  title:
    "మనిషెత్తు పసుపు పంటకు..మూత మందు కూడా కొట్టలేదు… Organic Turmeric | Natural Farming | Agriculture",
  publishedAt: "2024-12-07",
  sourceType: "third-party Telugu YouTube feature",
  quality: "third_party_coverage",
  association: "third_party_coverage",
};

const matchingShort = {
  id: "4a000000-0000-4000-8000-000000000022",
  url: "https://www.youtube.com/watch?v=WBgm4suZWks",
  publisher: "Sasyasyamalam",
  title:
    "మనిషెత్తు పసుపు పంటకు మూత మందు కూడా కొట్టలేదు..! #pasupu #shorts #naturalfarming #organic #turmeric",
  publishedAt: null,
  sourceType: "third-party Telugu YouTube Short",
  quality: "third_party_coverage",
  association: "third_party_coverage",
};

const publisherChannel = {
  id: "4a000000-0000-4000-8000-000000000023",
  url: "https://www.youtube.com/@sasyasyamalam",
  publisher: "Sasyasyamalam",
  title: "Sasyasyamalam — public channel profile",
  publishedAt: null,
  sourceType: "official publisher channel",
  quality: "owned_social_profile",
  association: "professional_reference",
};

const sourceLinks = [
  publisherChannel,
  featureVideo,
  matchingShort,
  {
    id: "4a000000-0000-4000-8000-000000000024",
    url: "https://www.facebook.com/sasyasyamalam",
    publisher: "Sasyasyamalam",
    title: "Sasyasyamalam — official Facebook page",
    publishedAt: null,
    sourceType: "official publisher social profile",
    quality: "owned_social_profile",
    association: "professional_reference",
  },
  {
    id: "4a000000-0000-4000-8000-000000000025",
    url: "https://www.instagram.com/sasya_syamalam/",
    publisher: "Sasyasyamalam",
    title: "Sasyasyamalam — official Instagram profile",
    publishedAt: null,
    sourceType: "official publisher social profile",
    quality: "owned_social_profile",
    association: "professional_reference",
  },
];

const videoCoverage = [featureVideo, matchingShort].map((video) => {
  const videoId = new URL(video.url).searchParams.get("v");
  return {
    url: video.url,
    publisher: video.publisher,
    title: video.title,
    sourceType: "Sasyasyamalam Telugu video · FarmerBook editorial link",
    thumbnail: videoId
      ? {
          assetUrl: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
          altText: `${video.title} — YouTube thumbnail`,
          provider: "youtube_oembed" as const,
        }
      : undefined,
  };
});

export const organicTurmericFarmerComingSoonPublication = {
  publication_id: "4a000000-0000-4000-8000-000000000026",
  slug: "organic-turmeric-farmer-coming-soon",
  publication_revision: 1,
  publication_status: "published",
  fact_checked_at: "2026-09-27T00:00:00.000Z",
  published_at: "2026-09-27T00:00:00.000Z",
  snapshot: {
    fullName: "పసుపు రైతు — పేరు త్వరలో",
    district: null,
    state: "Andhra Pradesh",
    locale: "te-IN",
    headline: "Farmer of the Day coming soon: పసుపు పంటలో సహజ సాగు",
    deck:
      "Sasyasyamalam ప్రచురించిన వీడియోలో, మందు స్ప్రే చేయలేదని చూపిస్తున్న పసుపు పంటను పరిచయం చేస్తున్నారు. రైతు పేరు, గ్రామం మరియు సాగు వివరాలను ధృవీకరించిన వెంటనే పూర్తి FarmerBook profile ప్రచురించబడుతుంది.",
    whyFeatured:
      "ఈ teaser ఒక రైతు గుర్తింపును ఊహించకుండా కథకు స్థానం కల్పిస్తుంది. మూల వీడియో పసుపు పంటను సహజ లేదా సేంద్రియ పద్ధతులతో అనుసంధానిస్తూ పరిచయం చేస్తుంది; FarmerBook ప్రస్తుతం రైతు వ్యక్తిగత వివరాలు, ధృవీకరణ లేదా సేంద్రియ సర్టిఫికేషన్‌ను నిర్ధారించలేదు.",
    categorySlugs: ["turmeric", "natural-farming", "featured-professionals"],
    limitations: [
      "ఈ పేజీ Coming Soon teaser మాత్రమే; వీడియోలో లేదా పబ్లిక్ metadataలో రైతు పేరు, గ్రామం, జిల్లా, ఫోన్ లేదా WhatsApp వివరాలు కనిపించలేదు.",
      "పురుగుమందు లేదా ఇతర మందులు ఉపయోగించలేదనే విషయం మూల వీడియో శీర్షిక/ప్రదర్శనలోని source-attributed claim మాత్రమే; FarmerBook స్వతంత్రంగా ధృవీకరించలేదు.",
      "Organic లేదా natural-farming పదాలు certification, residue testing లేదా marketplace approvalకు సమానం కావు.",
      "YouTube transcript export అందుబాటులో లేకపోవడంతో పూర్తి transcript ప్రచురించలేదు; ఈ పేజీ శీర్షిక, thumbnail, channel metadata మరియు పబ్లిక్ links ఆధారంగా రూపొందించబడింది.",
      "Sasyasyamalam యొక్క phone/email ఈ publisher channelకు సంబంధించిన public contact మాత్రమే; దాన్ని రైతు contactగా చూపించలేదు.",
    ],
    editorialDisclosure:
      "FarmerBook editorial teaser based on cited Sasyasyamalam public videos and publisher profiles; not identity verification, organic certification, endorsement, marketplace listing or agricultural advice.",
    personMetadata: {
      jobTitles: ["Farmer — identity confirmation pending"],
      homeLocation: "Not disclosed — identity confirmation pending",
      knowsAbout: [
        "పసుపు సాగు",
        "సహజ వ్యవసాయం",
        "సేంద్రియ వ్యవసాయం — source-attributed, not certified",
      ],
    },
    media: null,
    sourceHostedPreview: {
      assetUrl: "https://i.ytimg.com/vi/UV94JK7GDIU/maxresdefault.jpg",
      sourceUrl: featureVideo.url,
      altText: "పసుపు పంటలో నిలబడి ఉన్న రైతు — Sasyasyamalam YouTube thumbnail",
      credit: "Sasyasyamalam, via YouTube",
      creditUrl: publisherChannel.url,
      provider: "youtube_oembed" as const,
      focalPoint: "center" as const,
    },
    socialLinks: [
      { platform: "youtube" as const, url: publisherChannel.url },
      { platform: "facebook" as const, url: "https://www.facebook.com/sasyasyamalam" },
      {
        platform: "instagram" as const,
        url: "https://www.instagram.com/sasya_syamalam/",
      },
    ],
    sources: sourceLinks,
    coverage: videoCoverage,
    reportedProducts: [
      {
        name: "పసుపు",
        categorySlug: "turmeric",
        status: "reported" as const,
        sourceUrls: [featureVideo.url],
      },
    ],
    seo: {
      title: "Organic Turmeric Farmer — Coming Soon | FarmerBook",
      description:
        "Sasyasyamalam వీడియోలో పరిచయం చేసిన పసుపు రైతు కథకు FarmerBook Coming Soon editorial teaser.",
      keywords: [
        "organic turmeric farmer",
        "natural farming Andhra Pradesh",
        "పసుపు సాగు",
        "సేంద్రియ పసుపు",
        "Farmer of the Day",
      ],
    },
    claims: [
      {
        id: "4a000000-0000-4000-8000-000000000027",
        key: "pesticide_free_turmeric_claim",
        type: "ecological_stewardship" as const,
        statement:
          "Sasyasyamalam వీడియో శీర్షికలో పసుపు పంటకు మందు కొట్టలేదని పేర్కొంటుంది; ఇది మూల ప్రచురణ యొక్క claim మాత్రమే.",
        displayLabel: "మూల వీడియో claim",
        displayValue: "మందు స్ప్రే చేయలేదని చూపింపు",
        displayContext: "Sasyasyamalam వీడియో శీర్షిక ఆధారంగా; స్వతంత్రంగా ధృవీకరించలేదు",
        sources: [featureVideo],
      },
    ],
    sections: [
      {
        kind: "origin" as const,
        heading: "ఒక పసుపు పంట కథ — పేరు త్వరలో",
        body:
          "ఈ Farmer of the Day teaserలో ప్రస్తుతం రైతు పేరు చెప్పకుండా, మూల వీడియోలో కనిపించే పసుపు పంటను మాత్రమే పరిచయం చేస్తున్నాం. గుర్తింపును నిర్ధారించే పేరు, గ్రామం లేదా రైతు స్వయంగా అందించిన వివరాలు లభించిన తర్వాత ఈ కథనాన్ని పూర్తి profileగా విస్తరిస్తాం.",
        claimKeys: ["pesticide_free_turmeric_claim"],
      },
      {
        kind: "work" as const,
        heading: "పసుపు పంటపై సహజ సాగు దృష్టి",
        body:
          "వీడియో శీర్షిక పసుపు పంటకు మందు స్ప్రే చేయలేదని చెబుతుంది మరియు thumbnailలో పంట మధ్యలో రైతును చూపిస్తుంది. అందువల్ల ఈ teaser పసుపు సాగు, సహజ పద్ధతులు మరియు రైతు పరిశీలనపై దృష్టి పెడుతుంది; input schedule, దిగుబడి, నేల, నీరు లేదా ధృవీకరణ గురించి ఊహించలేదు.",
        claimKeys: ["pesticide_free_turmeric_claim"],
      },
      {
        kind: "impact" as const,
        heading: "రైతు వివరాలు నిర్ధారించిన తర్వాత",
        body:
          "పూర్తి profileలో రైతు పేరు, ప్రాంతం, సాగు కాలం, విత్తన రకం, సహజ ఇన్‌పుట్లు, కోత, నిల్వ, మార్కెట్ మరియు రైతు స్వయంగా పంచుకునే నేర్చుకున్న పాఠాలను source-attributedగా చేర్చాలి. ప్రస్తుతం అలాంటి వివరాలు పబ్లిక్ sourceలో స్పష్టంగా లేవు.",
        claimKeys: [],
      },
      {
        kind: "community" as const,
        heading: "ప్రచురణకర్తను అనుసరించండి",
        body:
          "ఈ కథనానికి సంబంధించిన YouTube feature మరియు matching Short Sasyasyamalam channelలో ఉన్నాయి. FarmerBook ఈ linksను publisher discovery linksగా అందిస్తుంది; ఇవి రైతు వ్యక్తిగత social profiles అని అర్థం కాదు.",
        claimKeys: [],
      },
      {
        kind: "lessons" as const,
        heading: "పేరు కంటే ముందు నిజ నిర్ధారణ",
        body:
          "రైతు కథను గౌరవంగా ప్రచురించాలంటే సరైన వ్యక్తికి సరైన వీడియోలను కలపడం ముఖ్యం. పేరు లేదా గ్రామం నిర్ధారించకుండా మరో రైతు వీడియోలను కలపడం కంటే, తాత్కాలికంగా Coming Soonగా ఉంచి, నిర్ధారిత వివరాలు వచ్చిన తర్వాత profileను నవీకరించడం FarmerBook editorial policy.",
        claimKeys: [],
      },
    ],
  },
} satisfies FeaturedFarmerPublication;
