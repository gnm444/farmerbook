import type { FeaturedFarmerPublication } from "./queries";

const source = {
  id: "4a000000-0000-4000-8000-000000000001",
  url: "https://www.youtube.com/watch?v=uIEnc1yXKTU",
  publisher: "Raitu Nestham",
  title:
    "రైతు తయారు చేసిన సేంద్రియ బెల్లం.. అమెరికా వెళుతోంది | K. Satyanarayana",
  publishedAt: null,
  sourceType: "third-party Telugu YouTube feature",
  quality: "third_party_coverage",
  association: "third_party_coverage",
};

const sourcePreview = {
  assetUrl: "https://i.ytimg.com/vi/uIEnc1yXKTU/maxresdefault.jpg",
  sourceUrl: source.url,
  altText:
    "కంభంపాటి సత్యనారాయణ గారి సేంద్రియ చెరకు మరియు బెల్లం తయారీపై Raitu Nestham వీడియో",
  credit: "Raitu Nestham, via YouTube",
  creditUrl: "https://www.youtube.com/@Raitunestham",
  provider: "youtube_oembed" as const,
  focalPoint: "center" as const,
};

const relatedVideoSources = [
  {
    id: "4a000000-0000-4000-8000-000000000002",
    url: "https://www.youtube.com/watch?v=BNB1w8UJfmg",
    publisher: "Paadi Pantalu Channel",
    title:
      "చెరుకులో అంతర పంటల సాగు మరియు బెల్లం తయారీ లో సూచనలు || శ్రీ కంభంపాటి సత్యనారాయణ",
    publishedAt: null,
    sourceType: "third-party Telugu YouTube feature",
    quality: "third_party_coverage",
    association: "third_party_coverage",
  },
  {
    id: "4a000000-0000-4000-8000-000000000003",
    url: "https://www.youtube.com/watch?v=fgwInrsj6pY",
    publisher: "Paadi Pantalu Channel",
    title:
      "వరిలో వినూత్న సస్యరక్షణ విధానాలు || శ్రీ కంభంపాటి సత్యనారాయణ, పల్లెర్లమూడి, నూజివీడు, ఏలూరు జిల్లా",
    publishedAt: null,
    sourceType: "third-party Telugu YouTube feature",
    quality: "third_party_coverage",
    association: "third_party_coverage",
  },
  {
    id: "4a000000-0000-4000-8000-000000000004",
    url: "https://www.youtube.com/watch?v=Q6oVeD_I-4M",
    publisher: "C NEWS VIJAYAWADA",
    title:
      "రైతు కంభంపాటి సత్యనారాయణ చేస్తున్న బెల్లం తయారీ విధానం",
    publishedAt: null,
    sourceType: "third-party Telugu YouTube feature",
    quality: "third_party_coverage",
    association: "third_party_coverage",
  },
  {
    id: "4a000000-0000-4000-8000-000000000005",
    url: "https://www.youtube.com/watch?v=z8TD--mzoxM",
    publisher: "Andhra Pradesh Community Managed Natural Farming",
    title:
      "E434 | ప్రకృతి సాగులో తీపిని పంచుతున్న చెరకు సాగు | సత్యనారాయణ | ఏలూరు జిల్లా",
    publishedAt: null,
    sourceType: "third-party Telugu YouTube feature",
    quality: "third_party_coverage",
    association: "third_party_coverage",
  },
];

const allVideoSources = [source, ...relatedVideoSources];

const videoCoverage = allVideoSources.map((video) => {
  const videoId = new URL(video.url).searchParams.get("v");
  return {
    url: video.url,
    publisher: video.publisher,
    title: video.title,
    sourceType: "Telugu YouTube feature · FarmerBook editorial link",
    thumbnail: videoId
      ? {
          assetUrl: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
          altText: `${video.title} — YouTube thumbnail`,
          provider: "youtube_oembed" as const,
        }
      : undefined,
  };
});

export const kambhampatiSatyanarayanaPublication: FeaturedFarmerPublication = {
  publication_id: "4a000000-0000-4000-8000-000000000012",
  slug: "kambhampati-satyanarayana-organic-jaggery",
  publication_revision: 1,
  publication_status: "published",
  fact_checked_at: "2026-09-24T00:00:00.000Z",
  published_at: "2026-09-24T00:00:00.000Z",
  snapshot: {
    fullName: "కంభంపాటి సత్యనారాయణ",
    contactPhone: "6302529160",
    district: "Eluru",
    state: "Andhra Pradesh",
    locale: "te-IN",
    headline: "ప్రకృతి వ్యవసాయం నుంచి సహజ బెల్లం వరకు",
    deck:
      "ఏలూరు జిల్లా నూజివీడు మండలం పల్లెర్లమూడి గ్రామానికి చెందిన కంభంపాటి సత్యనారాయణ గారు చెరకు సాగు చేస్తూ, స్వంత క్రషర్ ద్వారా బెల్లం తయారు చేసి నేరుగా వినియోగదారులకు అందిస్తున్నారు.",
    whyFeatured:
      "ఈ కథ రైతు పంటను పండించడమే కాకుండా, దానికి విలువను జోడించి, ప్రాసెస్ చేసి, సోషల్ మీడియా ద్వారా నేరుగా వినియోగదారులను చేరుకునే విధానాన్ని చూపిస్తుంది. కథనంలోని వివరాలు రైతు ఇంటర్వ్యూ మరియు YouTube auto-generated Telugu transcript ఆధారంగా మాత్రమే ప్రచురించబడుతున్నాయి.",
    categorySlugs: ["sugarcane", "jaggery", "integrated-farming"],
    limitations: [
      "ఇది రైతు ఇంటర్వ్యూలోని వివరాల ఆధారంగా రూపొందించిన FarmerBook editorial profile; FarmerBook సభ్యత్వం, గుర్తింపు ధృవీకరణ లేదా మార్కెట్ listing కాదు.",
      "సేంద్రియ సాగు, సహజ తయారీ, దిగుబడి, ధర, ఆదాయం మరియు విదేశాలకు పంపిణీకి సంబంధించిన వివరాలను FarmerBook స్వతంత్రంగా ధృవీకరించలేదు.",
      "వీడియో Telugu auto-generated transcript ఆధారంగా అనువదించి, సంక్షిప్తంగా రూపొందించబడింది; ఇది పూర్తి verbatim transcript కాదు.",
      "మధుమేహం లేదా ఇతర ఆరోగ్య పరిస్థితులు ఉన్నవారు బెల్లం వినియోగంపై వైద్యుల సలహా తీసుకోవాలి.",
    ],
    editorialDisclosure:
      "FarmerBook editorial profile based on a Telugu YouTube feature and its auto-generated transcript; source-attributed and not certification, endorsement, marketplace listing or medical advice.",
    personMetadata: {
      alternateNames: ["కంభంపాటి సత్యనారాయణ", "K. Satyanarayana"],
      jobTitles: ["రైతు", "ప్రకృతి వ్యవసాయ సాధకుడు", "బెల్లం తయారీదారు"],
      homeLocation: "Pallerlamudi, Nuzividu, Eluru, Andhra Pradesh, India",
      knowsAbout: [
        "చెరకు సాగు",
        "ప్రకృతి వ్యవసాయం",
        "సహజ బెల్లం తయారీ",
        "జీవామృతం",
        "అంతర పంటలు",
        "రైతు నుంచి వినియోగదారుడికి మార్కెటింగ్",
      ],
    },
    media: null,
    sourceHostedPreview: sourcePreview,
    socialLinks: [
      {
        platform: "youtube",
        url: "https://www.youtube.com/@Raitunestham",
      },
    ],
    sources: allVideoSources,
    coverage: videoCoverage,
    reportedProducts: [
      {
        name: "సేంద్రియ బెల్లం",
        categorySlug: "jaggery",
        status: "reported",
        sourceUrls: [source.url],
        price: "సుమారు ₹120/kg — రైతు ఇంటర్వ్యూ ప్రకారం",
      },
      {
        name: "యాలకులు లేదా మిరియాలు కలిపిన బెల్లం",
        categorySlug: "jaggery",
        status: "reported",
        sourceUrls: [source.url],
        price: "సుమారు ₹150/kg — రైతు ఇంటర్వ్యూ ప్రకారం",
      },
    ],
    seo: {
      title: "కంభంపాటి సత్యనారాయణ | సహజ బెల్లం | FarmerBook",
      description:
        "ఏలూరు జిల్లా నూజివీడులో ప్రకృతి పద్ధతిలో చెరకు సాగు చేస్తూ, సహజ బెల్లం తయారు చేస్తున్న రైతు కంభంపాటి సత్యనారాయణ గారి కథ.",
      keywords: [
        "కంభంపాటి సత్యనారాయణ",
        "నూజివీడు రైతు",
        "సహజ బెల్లం",
        "సేంద్రియ చెరకు",
        "ఏలూరు జిల్లా వ్యవసాయం",
        "natural farming Andhra Pradesh",
      ],
    },
    claims: [
      {
        id: "4a000000-0000-4000-8000-000000000101",
        key: "farming_since_1986",
        type: "significance",
        statement:
          "వీడియోలో కంభంపాటి సత్యనారాయణ గారు 1986 నుంచి వ్యవసాయం చేస్తున్నట్లు తెలిపారు.",
        displayLabel: "వ్యవసాయ అనుభవం",
        displayValue: "1986 నుంచి",
        displayContext: "రైతు ఇంటర్వ్యూ ప్రకారం",
        sources: [source],
      },
      {
        id: "4a000000-0000-4000-8000-000000000102",
        key: "seven_acres_sugarcane",
        type: "ecological_stewardship",
        statement:
          "రైతు ఇంటర్వ్యూ ప్రకారం, ప్రస్తుతం సుమారు ఏడు ఎకరాల్లో ప్రకృతి పద్ధతిలో చెరకు సాగు చేస్తున్నారు.",
        displayLabel: "చెరకు సాగు",
        displayValue: "సుమారు 7 ఎకరాలు",
        displayContext: "రైతు ఇంటర్వ్యూ ప్రకారం",
        sources: [source],
      },
      {
        id: "4a000000-0000-4000-8000-000000000103",
        key: "coimbatore_419_sugarcane",
        type: "innovation",
        statement:
          "తక్కువ నీటితో సాగు చేయగలదని రైతు వివరించిన Coimbatore 419 రకం చెరకును ఆయన కొనసాగిస్తున్నారు.",
        displayLabel: "చెరకు రకం",
        displayValue: "Coimbatore 419",
        displayContext: "రైతు వివరించిన రకం",
        sources: [source],
      },
      {
        id: "4a000000-0000-4000-8000-000000000104",
        key: "direct_social_marketing",
        type: "knowledge_sharing",
        statement:
          "WhatsApp మరియు ఇతర సోషల్ మీడియా మార్గాల ద్వారా వినియోగదారులతో నేరుగా సంబంధం కలిగి ఉన్నట్లు రైతు తెలిపారు.",
        displayLabel: "మార్కెటింగ్ విధానం",
        displayValue: "Direct + WhatsApp",
        displayContext: "రైతు ఇంటర్వ్యూ ప్రకారం",
        sources: [source],
      },
      {
        id: "4a000000-0000-4000-8000-000000000105",
        key: "natural_jaggery_value_addition",
        type: "innovation",
        statement:
          "స్వంత క్రషర్ ద్వారా చెరకు రసాన్ని బెల్లంగా మార్చి, ఉత్పత్తికి విలువను జోడిస్తున్నట్లు ఇంటర్వ్యూలో వివరించారు.",
        displayLabel: "విలువ ఆధారిత ఉత్పత్తి",
        displayValue: "సహజ బెల్లం",
        displayContext: "రైతు ఇంటర్వ్యూ ప్రకారం",
        sources: [source],
      },
    ],
    sections: [
      {
        kind: "origin",
        heading: "వ్యవసాయ కుటుంబం నుంచి ప్రకృతి వ్యవసాయం వరకు",
        body:
          "పల్లెర్లమూడి గ్రామానికి చెందిన కంభంపాటి సత్యనారాయణ గారు వ్యవసాయ కుటుంబ నేపథ్యం నుంచి వచ్చారు. 1986 నుంచి వ్యవసాయం చేస్తున్నానని, 2007–08 ప్రాంతంలో ప్రకృతి వ్యవసాయం గురించి తెలుసుకున్న తర్వాత 2009 నుంచి ఆ పద్ధతిని మరింత క్రమబద్ధంగా అనుసరించానని ఆయన తెలిపారు. ఈ కథనం రైతు ఇంటర్వ్యూలో చెప్పిన వివరాలను మాత్రమే source-attributedగా అందిస్తుంది.",
        claimKeys: ["farming_since_1986"],
      },
      {
        kind: "work",
        heading: "చెరకు సాగులో స్థానిక జ్ఞానం మరియు సహజ ఇన్‌పుట్లు",
        body:
          "రైతు ప్రస్తుతం సుమారు ఏడు ఎకరాల్లో Coimbatore 419 రకం చెరకును సాగు చేస్తున్నట్లు వివరించారు. ఘన జీవామృతం, ద్రవ జీవామృతం, ఆవుపేడ, ఆవుమూత్రం, నవధాన్యాల పిండి మరియు బెల్లంతో సహజ ఇన్‌పుట్లను తయారు చేస్తున్నట్లు చెప్పారు. వరుసల మధ్య దూరం పాటించడం, విత్తన శుద్ధి చేయడం మరియు చెరకు మధ్యలో కూరగాయల అంతర పంటలు వేయడం ఆయన పద్ధతుల్లో భాగంగా కనిపిస్తుంది.",
        claimKeys: ["seven_acres_sugarcane", "coimbatore_419_sugarcane"],
      },
      {
        kind: "impact",
        heading: "చెరకు నుంచి బెల్లానికి విలువ జోడింపు",
        body:
          "చెరకును కేవలం ఫ్యాక్టరీకి పంపకుండా, స్వంత క్రషర్ ద్వారా బెల్లంగా తయారు చేస్తున్నట్లు సత్యనారాయణ గారు తెలిపారు. పరిపక్వమైన చెరకుతో బెల్లం తయారు చేయడం, మట్టి కుండల్లో నిల్వ చేయడం మరియు వినియోగదారులకు నేరుగా అందించడం ద్వారా ఉత్పత్తికి విలువ జోడించే ప్రయత్నం చేస్తున్నారు. యాలకులు లేదా మిరియాలు కలిపిన ప్రత్యేక బెల్లం కూడా అందిస్తున్నట్లు ఇంటర్వ్యూలో పేర్కొన్నారు.",
        claimKeys: ["natural_jaggery_value_addition"],
      },
      {
        kind: "community",
        heading: "WhatsApp ద్వారా రైతు నుంచి వినియోగదారుడికి",
        body:
          "“ఖమ్మంపాటి వారి సేంద్రియ బెల్లం” పేరుతో ఉన్న WhatsApp గ్రూపులో సుమారు 200–300 మంది ఉన్నారని రైతు తెలిపారు. విజయవాడ, ఏలూరు మరియు పరిసర ప్రాంతాల నుంచి కొంతమంది వినియోగదారులు నేరుగా గ్రామానికి వచ్చి బెల్లం తీసుకెళ్తున్నారని చెప్పారు. విదేశాల్లో ఉన్న పరిచయస్తులు అమెరికా, ఆస్ట్రేలియా వంటి దేశాలకు బెల్లాన్ని తీసుకెళ్లిన సందర్భాలను కూడా ఆయన ప్రస్తావించారు.",
        claimKeys: ["direct_social_marketing"],
      },
      {
        kind: "lessons",
        heading: "రైతు కథలోని వ్యాపార పాఠం",
        body:
          "ఈ కథలోని ముఖ్యమైన పాఠం పంటను పండించడం మాత్రమే కాదు—దానిని ప్రాసెస్ చేయడం, ఉత్పత్తికి విలువను జోడించడం, స్వంత బ్రాండ్‌గా పరిచయం చేయడం మరియు వినియోగదారులను నేరుగా చేరుకోవడం కూడా రైతు వ్యాపారంలో భాగమే. అయితే సేంద్రియ ధృవీకరణ, నాణ్యత, ధర, దిగుబడి మరియు ఎగుమతి సంబంధిత వాదనలను కొనుగోలు లేదా భాగస్వామ్యానికి ముందు స్వతంత్రంగా నిర్ధారించాలి.",
        claimKeys: ["natural_jaggery_value_addition", "direct_social_marketing"],
      },
    ],
  },
};
