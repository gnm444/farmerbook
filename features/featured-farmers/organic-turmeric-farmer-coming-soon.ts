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

const sasyasyamalamBananaFeature = {
  id: "4a000000-0000-4000-8000-000000000028",
  url: "https://www.youtube.com/watch?v=Z4lg-aBXjTI",
  publisher: "Sasyasyamalam",
  title:
    "పెట్టుబడి లేని వ్యవసాయం - ఎకరాకు 4 లక్షల సంపాదన | A farmer creating miracles with natural farming",
  publishedAt: null,
  sourceType: "third-party Telugu YouTube feature",
  quality: "third_party_coverage",
  association: "third_party_coverage",
};

const sasyasyamalamGreenManureFeature = {
  id: "4a000000-0000-4000-8000-000000000029",
  url: "https://www.youtube.com/watch?v=lA7i-fhK7-o",
  publisher: "Sasyasyamalam",
  title:
    "ఇలా చేస్తే వ్యవసాయం లో అద్భుతాలు చెయ్యొచ్చు...|| If you do this, you can do wonders in agriculture",
  publishedAt: null,
  sourceType: "third-party Telugu YouTube feature",
  quality: "third_party_coverage",
  association: "third_party_coverage",
};

const weekendFarmerFeature = {
  id: "4a000000-0000-4000-8000-000000000030",
  url: "https://www.youtube.com/watch?v=FSfnyB-VcxY",
  publisher: "That Weekend Farmer",
  title:
    "The best natural farmer Kallem Srinivas Reddy on turning your soil fertile",
  publishedAt: null,
  sourceType: "independent English YouTube feature",
  quality: "third_party_coverage",
  association: "third_party_coverage",
};

const raituNesthamFeature = {
  id: "4a000000-0000-4000-8000-000000000031",
  url: "https://www.youtube.com/watch?v=A7BaTen7gpQ",
  publisher: "Raitu Nestham",
  title:
    "ప్రకృతి వ్యవసాయంలో ఈ రైతు విధానాలు భేష్ | Natural Farmer | Srinivas Reddy",
  publishedAt: null,
  sourceType: "third-party Telugu YouTube feature",
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
  sasyasyamalamBananaFeature,
  sasyasyamalamGreenManureFeature,
  weekendFarmerFeature,
  raituNesthamFeature,
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

const videoCoverage = [
  featureVideo,
  matchingShort,
  sasyasyamalamBananaFeature,
  sasyasyamalamGreenManureFeature,
  weekendFarmerFeature,
  raituNesthamFeature,
].map((video) => {
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

export const kallamSrinivasReddyPublication = {
  publication_id: "4a000000-0000-4000-8000-000000000026",
  slug: "kallam-srinivas-reddy",
  publication_revision: 1,
  publication_status: "published",
  fact_checked_at: "2026-09-27T00:00:00.000Z",
  published_at: "2026-09-27T00:00:00.000Z",
  snapshot: {
    fullName: "కళ్ళం శ్రీనివాస్ రెడ్డి",
    contactPhone: "9866339832",
    district: "Guntur",
    state: "Andhra Pradesh",
    locale: "te-IN",
    headline: "Farmer of the Day: సహజ పద్ధతుల్లో పసుపు, అరటి మరియు బహుళ పంటల సాగు",
    deck:
      "కళ్ళం శ్రీనివాస్ రెడ్డి గారు నూతక్కి సమీపంలోని కొత్తపాలెం గ్రామంలో సహజ పద్ధతులతో అరటి, దుంపలు మరియు పసుపు వంటి పంటలను సాగు చేస్తున్న రైతుగా పలు వీడియోల్లో పరిచయం అయ్యారు.",
    whyFeatured:
      "ఈ profileలో కళ్ళం శ్రీనివాస్ రెడ్డి గారి పసుపు మరియు సహజ వ్యవసాయంపై అందుబాటులో ఉన్న YouTube coverageను ఒకచోట చేర్చాం. FarmerBook గుర్తింపు, సాగు పద్ధతులు, దిగుబడి లేదా సేంద్రియ certificationను స్వతంత్రంగా ధృవీకరించలేదు.",
    categorySlugs: ["turmeric", "natural-farming", "featured-professionals"],
    limitations: [
      "ఇది FarmerBook editorial profile; సభ్యత్వం, గుర్తింపు ధృవీకరణ లేదా marketplace listing కాదు.",
      "పురుగుమందు లేదా ఇతర మందులు ఉపయోగించలేదనే విషయం మూల వీడియో శీర్షిక/ప్రదర్శనలోని source-attributed claim మాత్రమే; FarmerBook స్వతంత్రంగా ధృవీకరించలేదు.",
      "Organic లేదా natural-farming పదాలు certification, residue testing లేదా marketplace approvalకు సమానం కావు.",
      "ఈ కథనం video titles, descriptions మరియు YouTube-generated summaries ఆధారంగా source-attributedగా రూపొందించబడింది; పూర్తి transcript కాదు.",
      "9866339832 నంబర్ Raitu Nestham వీడియో descriptionలో ఇచ్చిన రైతు contactగా ప్రచురించబడింది; అది FarmerBook ద్వారా స్వతంత్రంగా ధృవీకరించబడలేదు.",
    ],
    editorialDisclosure:
      "FarmerBook editorial profile based on cited public YouTube coverage; not identity verification, organic certification, endorsement, marketplace listing or agricultural advice.",
    personMetadata: {
      alternateNames: ["Kallam Srinivas Reddy", "Kallem Srinivas Reddy", "కల్లెం శ్రీనివాస్ రెడ్డి"],
      jobTitles: ["Farmer", "Natural farming practitioner"],
      homeLocation: "Kothapalem near Nuthakki, Mangalagiri mandal, Guntur, Andhra Pradesh, India",
      knowsAbout: [
        "పసుపు సాగు",
        "సహజ వ్యవసాయం",
        "సేంద్రియ వ్యవసాయం — source-attributed, not certified",
        "అరటి, దుంపలు మరియు పసుపు బహుళ పంటల సాగు",
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
      title: "కళ్ళం శ్రీనివాస్ రెడ్డి | Natural Farming | FarmerBook",
      description:
        "కళ్ళం శ్రీనివాస్ రెడ్డి గారి పసుపు, అరటి మరియు సహజ వ్యవసాయంపై FarmerBook source-attributed editorial profile.",
      keywords: [
        "organic turmeric farmer",
        "natural farming Andhra Pradesh",
        "Kallam Srinivas Reddy",
        "పసుపు సాగు",
        "సేంద్రియ పసుపు",
        "Farmer of the Day",
      ],
    },
    claims: [
      {
        id: "4a000000-0000-4000-8000-000000000032",
        key: "farmer_identity_and_location",
        type: "significance" as const,
        statement:
          "Raitu Nestham వీడియో description ప్రకారం, శ్రీనివాస్ రెడ్డి గారు గుంటూరు జిల్లా మంగళగిరి మండలం నూతక్కి సమీపంలోని కొత్తపాలెం గ్రామానికి చెందిన రైతు.",
        displayLabel: "ప్రాంతం",
        displayValue: "కొత్తపాలెం, గుంటూరు",
        displayContext: "Raitu Nestham వీడియో description ప్రకారం",
        sources: [raituNesthamFeature],
      },
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
        heading: "కొత్తపాలెం నుంచి సహజ వ్యవసాయం వరకు",
        body:
          "కళ్ళం శ్రీనివాస్ రెడ్డి గారు గుంటూరు జిల్లా మంగళగిరి మండలం నూతక్కి సమీపంలోని కొత్తపాలెం గ్రామానికి చెందిన రైతుగా Raitu Nestham coverageలో పరిచయం అయ్యారు. ఆయన సహజ వ్యవసాయ పద్ధతులపై పలు వీడియోలు ఉన్నాయి.",
        claimKeys: ["farmer_identity_and_location"],
      },
      {
        kind: "work" as const,
        heading: "పసుపు పంటపై సహజ సాగు దృష్టి",
        body:
          "వీడియోలలో పసుపు పంటకు మందు స్ప్రే చేయలేదని, అరటి తోటలో పసుపును అంతర పంటగా సాగు చేస్తున్నారని, అలాగే పచ్చిరొట్ట పంటలతో నేల సారాన్ని పెంచుతున్నారని వివరించబడింది. ఇవి మూల వీడియోలలోని claims మాత్రమే; input schedule, దిగుబడి లేదా certificationను FarmerBook ధృవీకరించలేదు.",
        claimKeys: ["pesticide_free_turmeric_claim"],
      },
      {
        kind: "impact" as const,
        heading: "మట్టిని గమనిస్తూ పంటలను కలిపి సాగు చేయడం",
        body:
          "సంబంధిత వీడియోలలో పచ్చిరొట్ట పంటలు, రసాయన ఎరువులు లేకుండా సాగు, అంతర పంటలు మరియు నేల సారాన్ని పెంచే పద్ధతుల గురించి చర్చించబడింది. సహజ పద్ధతుల ప్రభావం ప్రాంతం, నేల, నీరు మరియు శ్రమపై ఆధారపడి ఉంటుంది.",
        claimKeys: ["pesticide_free_turmeric_claim"],
      },
      {
        kind: "community" as const,
        heading: "ప్రచురణకర్తను అనుసరించండి",
        body:
          "పసుపు, అరటి మరియు సహజ వ్యవసాయంపై Sasyasyamalam, Raitu Nestham మరియు That Weekend Farmer ప్రచురించిన సంబంధిత వీడియోలను ఈ profileలో చేర్చాం. ఇవి third-party coverage links; రైతు స్వంత social profilesగా చూపించలేదు.",
        claimKeys: ["farmer_identity_and_location"],
      },
      {
        kind: "lessons" as const,
        heading: "నేల ఆరోగ్యం మరియు బహుళ పంటల పాఠం",
        body:
          "ఈ కథలోని పాఠం పంటను మాత్రమే కాకుండా నేలను కూడా గమనించడం, పచ్చిరొట్టను ఉపయోగించడం మరియు బహుళ పంటల ద్వారా వ్యవసాయాన్ని రూపకల్పన చేయడం. సేంద్రియ certification, దిగుబడి మరియు ఆదాయ వాదనలను కొనుగోలు లేదా అనుసరణకు ముందు స్వతంత్రంగా పరిశీలించాలి.",
        claimKeys: ["farmer_identity_and_location", "pesticide_free_turmeric_claim"],
      },
    ],
  },
} satisfies FeaturedFarmerPublication;
