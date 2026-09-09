import type { FeaturedFarmerPublication } from "./queries";

const linkedinSource = {
  id: "5a000000-0000-4000-8000-000000000001",
  url: "https://www.linkedin.com/in/malyadri/",
  publisher: "LinkedIn",
  title: "Malyadri Beegala — public professional profile",
  publishedAt: null,
  sourceType: "public professional profile",
  quality: "owned_social_profile",
  association: "owned_social_profile",
};

const foodForestSource = {
  id: "5a000000-0000-4000-8000-000000000002",
  url: "https://www.youtube.com/watch?v=-kZ-9PHK3YU",
  publisher: "Raitu Nestham",
  title:
    "రైతు సంకల్పానికి సలాం | 5 Layer Food Forest | Malyadri — Five-layer food forest",
  publishedAt: null,
  sourceType: "third-party Telugu YouTube feature",
  quality: "third_party_coverage",
  association: "third_party_coverage",
};

const treeHouseSource = {
  id: "5a000000-0000-4000-8000-000000000003",
  url: "https://www.youtube.com/watch?v=8-Be9DD75-8",
  publisher: "Raitu Nestham",
  title:
    "పిల్లలను CellPhone నుంచి దూరం చేసే ఐడియా — tree house for children",
  publishedAt: null,
  sourceType: "third-party Telugu YouTube Short",
  quality: "third_party_coverage",
  association: "third_party_coverage",
};

const kamanchiSource = {
  id: "5a000000-0000-4000-8000-000000000004",
  url: "https://www.youtube.com/watch?v=7TvqX67dnFM",
  publisher: "Raitu Nestham",
  title:
    "పిచ్చిమొక్కలా కనిపించే పవర్ ఫుల్ చెట్టు — kamanchi tree",
  publishedAt: null,
  sourceType: "third-party Telugu YouTube Short",
  quality: "third_party_coverage",
  association: "third_party_coverage",
};

const bananaSource = {
  id: "5a000000-0000-4000-8000-000000000005",
  url: "https://www.youtube.com/watch?v=Wgsqo9YwS44",
  publisher: "Raitu Nestham",
  title:
    "తాటి చెట్టంత అరటి.. Red Banana — banana varieties at the farm",
  publishedAt: null,
  sourceType: "third-party Telugu YouTube Short",
  quality: "third_party_coverage",
  association: "third_party_coverage",
};

const medicinalPlantsSource = {
  id: "5a000000-0000-4000-8000-000000000006",
  url: "https://www.youtube.com/watch?v=9RFj7GH6CeQ",
  publisher: "Raitu Nestham",
  title:
    "ఆరోగ్యానికి ఔషధ మొక్కలు.. ఇవి ఉండాలి — medicinal and food plants",
  publishedAt: null,
  sourceType: "third-party Telugu YouTube Short",
  quality: "third_party_coverage",
  association: "third_party_coverage",
};

const passionFruitSource = {
  id: "5a000000-0000-4000-8000-000000000007",
  url: "https://www.youtube.com/watch?v=fJia6aCRhWo",
  publisher: "Raitu Nestham",
  title:
    "ఇవి తింటే సన్నగా ఉన్న వారు లావు అవుతారు — trees and passion fruit",
  publishedAt: null,
  sourceType: "third-party Telugu YouTube Short",
  quality: "third_party_coverage",
  association: "third_party_coverage",
};

const leafyVegetablesSource = {
  id: "5a000000-0000-4000-8000-000000000008",
  url: "https://www.youtube.com/watch?v=ogcaiRrkqjE",
  publisher: "Raitu Nestham",
  title:
    "అలాంటి ఆకు కూరలతో జాగ్రత్త — leafy vegetables and weed management",
  publishedAt: null,
  sourceType: "third-party Telugu YouTube Short",
  quality: "third_party_coverage",
  association: "third_party_coverage",
};

const wildFigSource = {
  id: "5a000000-0000-4000-8000-000000000009",
  url: "https://www.youtube.com/watch?v=sk8SCQU-Z4A",
  publisher: "Raitu Nestham",
  title: "అడవి అంజీర — wild fig in the food forest",
  publishedAt: null,
  sourceType: "third-party Telugu YouTube Short",
  quality: "third_party_coverage",
  association: "third_party_coverage",
};

const natureHouseSource = {
  id: "5a000000-0000-4000-8000-000000000010",
  url: "https://www.youtube.com/watch?v=kEt7ItXiIU0",
  publisher: "Raitu Nestham",
  title: "ఇదే నిజమైన భూతల స్వర్గం | Nature House | Malyadri",
  publishedAt: null,
  sourceType: "third-party Telugu YouTube feature",
  quality: "third_party_coverage",
  association: "third_party_coverage",
};

const videoSources = [
  foodForestSource,
  treeHouseSource,
  kamanchiSource,
  bananaSource,
  medicinalPlantsSource,
  passionFruitSource,
  leafyVegetablesSource,
  wildFigSource,
  natureHouseSource,
];

export const malyadriBeegalaPublication = {
  publication_id: "5a000000-0000-4000-8000-000000000100",
  slug: "malyadri-beegala-five-layer-food-forest",
  publication_revision: 1,
  publication_status: "published",
  fact_checked_at: "2026-09-09T00:00:00.000Z",
  published_at: "2026-09-09T00:00:00.000Z",
  snapshot: {
    fullName: "Malyadri Beegala",
    district: "Nellore",
    state: "Andhra Pradesh",
    locale: "te-IN",
    headline: "మూడు ఎకరాల్లో ఆహార అరణ్యాన్ని నిర్మిస్తున్న సహజ రైతు",
    deck:
      "ఆంధ్రప్రదేశ్‌లోని నెల్లూరు జిల్లా బుచ్చిరెడ్డిపాలెం సమీపంలో, మాల్యాద్రి తన తండ్రి మాలకొండయ్య నుంచి వచ్చిన సహజ వ్యవసాయ పునాదిపై ఐదు లేయర్ ఫుడ్ ఫారెస్ట్‌ను అభివృద్ధి చేస్తున్నారు.",
    whyFeatured:
      "మాల్యాద్రి కథ ఒకే పంటను పండించే పొలం కథ కాదు. తండ్రి ప్రారంభించిన సహజ వ్యవసాయాన్ని కొనసాగిస్తూ, సుమారు మూడు ఎకరాల పరిధిలోని భూమిని పండ్ల చెట్లు, అరటి, కూరగాయలు, దుంపలు, ఆకుకూరలు, ఔషధ మొక్కలు మరియు నీటి నిర్వహణ ప్రయోగాలతో కూడిన ఆహార అరణ్యంగా తీర్చిదిద్దుతున్నట్లు ఆయన రaitu Nestham వీడియోల్లో వివరిస్తారు. ముఖ్యంగా, సుమారు ఒకటిన్నర ఎకరాల్లో ఐదు లేయర్ విధానాన్ని ఉపయోగించి ఇంటి అవసరాలు, నేర్చుకోవడం మరియు భవిష్యత్ ఆదాయ అవకాశాలను కలిపి చూడాలనే ఆయన ప్రయత్నం ఈ కథకు ప్రత్యేకతను ఇస్తుంది. ఇవన్నీ వీడియోల్లోని స్వీయ వివరణలు; FarmerBook వాటిని ధృవీకరించిన దిగుబడి, ఆదాయం, సర్టిఫికేషన్ లేదా ఆరోగ్య హామీగా చూపదు.",
    categorySlugs: [
      "agroforestry",
      "fruit-orchards",
      "vegetables",
      "medicinal-aromatic-plants",
    ],
    limitations: [
      "ఇది FarmerBook సభ్యత్వ ఖాతా, గుర్తింపు ధృవీకరణ, సర్టిఫికేషన్, ఆమోదం లేదా మార్కెట్‌ప్లేస్ జాబితా కాదు.",
      "ఈ కథ మాల్యాద్రి గురించి అందించిన తెలుగు YouTube వీడియోలు, వాటి ఆటో-జెనరేటెడ్ తెలుగు క్యాప్షన్లు/ట్రాన్స్‌క్రిప్ట్‌లు మరియు అందించిన LinkedIn ప్రొఫైల్ ఆధారంగా రూపొందించిన మూలాధార-ఆధారిత సారాంశం.",
      "పంటల పేర్లు, స్థానిక మొక్కల పేర్లు, నేల-నీటి పద్ధతులు మరియు ప్రయోగాల ఫలితాలు వీడియోల్లో చెప్పిన లేదా చూపిన విషయాలుగా మాత్రమే ఇవ్వబడ్డాయి; FarmerBook వాటిని స్వతంత్రంగా పరిశీలించలేదు.",
      "వీడియోల్లో కనిపించే బరువు, మధుమేహం, ఔషధ లేదా కలుపుమందు-ఆరోగ్య వాదనలను ఈ పేజీ వైద్య సలహాగా ప్రచురించడం లేదు.",
      "ప్రస్తుత దిగుబడి, ధరలు, నిల్వ, డెలివరీ, ధృవీకరణ, ఆదాయం లేదా వాణిజ్య లభ్యతను FarmerBook నిర్ధారించలేదు.",
      "YouTube వీడియోలను ప్రచురించినది Raitu Nestham అనే మూడో పక్ష ఛానల్; ఆ ఛానల్ మాల్యాద్రి స్వంత ఛానల్ అని FarmerBook నిర్ధారించలేదు.",
    ],
    editorialDisclosure:
      "FarmerBook సంపాదకీయ ప్రొఫైల్: అందించిన తెలుగు ప్రజా YouTube వీడియోలను అనువదించి, సారాంశం చేసి రూపొందించబడింది; సభ్యత్వం, గుర్తింపు ధృవీకరణ, సర్టిఫికేషన్, ఆమోదం, మార్కెట్‌ప్లేస్ జాబితా లేదా వ్యవసాయ/వైద్య సలహా కాదు.",
    personMetadata: {
      alternateNames: ["మాల్యాద్రి", "Malyadri"],
      jobTitles: ["Farmer", "Natural-farming practitioner"],
      homeLocation: "Buchireddypalem area, Nellore District, Andhra Pradesh, India",
      knowsAbout: [
        "Natural farming",
        "Five-layer food forests",
        "Diversified fruit cultivation",
        "Water and soil management",
        "Banana variety selection",
        "Household food production",
        "Farm experimentation",
        "Farmer-to-farmer learning",
      ],
    },
    media: null,
    sourceHostedPreview: {
      assetUrl: "https://i.ytimg.com/vi/-kZ-9PHK3YU/maxresdefault.jpg",
      sourceUrl: foodForestSource.url,
      altText: "Malyadri explaining a five-layer food forest in a Telugu farm feature",
      credit: "Raitu Nestham, via YouTube",
      creditUrl: foodForestSource.url,
      provider: "youtube_oembed",
      focalPoint: "center",
    },
    sourceHostedBackground: {
      assetUrl: "https://i.ytimg.com/vi/kEt7ItXiIU0/maxresdefault.jpg",
      sourceUrl: natureHouseSource.url,
      altText: "Nature House and food-forest setting associated with Malyadri",
      credit: "Raitu Nestham, via YouTube",
      creditUrl: natureHouseSource.url,
      provider: "youtube_oembed",
      focalPoint: "center",
    },
    socialLinks: [
      {
        platform: "linkedin",
        url: linkedinSource.url,
      },
    ],
    sources: [linkedinSource, ...videoSources],
    claims: [
      {
        id: "5a000000-0000-4000-8000-000000000201",
        key: "identity_and_place",
        type: "significance",
        statement:
          "The supplied LinkedIn profile identifies the subject as Malyadri Beegala in Hyderabad, Telangana, while the supplied Telugu farming feature identifies the farmer interviewed as Malyadri and places the farm near Buchireddypalem in Nellore district, Andhra Pradesh.",
        displayLabel: "Public identity",
        displayValue: "Malyadri Beegala",
        displayContext: "LinkedIn profile and supplied Telugu farm feature",
        sources: [linkedinSource, foodForestSource],
      },
      {
        id: "5a000000-0000-4000-8000-000000000202",
        key: "family_natural_farming_origin",
        type: "ecological_stewardship",
        statement:
          "In the supplied Telugu feature, Malyadri says he is continuing natural-farming work started by his father, Malakondayya, and that a concern about chemically grown food helped motivate his own shift toward natural farming.",
        displayLabel: "Farm origin",
        displayValue: "A family natural-farming path",
        displayContext: "Malyadri's account in the supplied feature",
        sources: [foodForestSource],
      },
      {
        id: "5a000000-0000-4000-8000-000000000203",
        key: "five_layer_food_forest",
        type: "innovation",
        statement:
          "The feature describes a roughly three-acre natural-farming holding, including about one and a half acres where Malyadri is developing a five-layer model together with a food-forest concept.",
        displayLabel: "Farm design",
        displayValue: "Five-layer food forest",
        displayContext: "Reported in the supplied Telugu feature",
        sources: [foodForestSource, natureHouseSource],
      },
      {
        id: "5a000000-0000-4000-8000-000000000204",
        key: "diverse_crop_layers",
        type: "knowledge_sharing",
        statement:
          "The five-layer area is described with mango, guava, banana, papaya and moringa as principal plants, with jackfruit, aonla, curry leaf, vegetables, sugarcane, turmeric, sweet potato and other local crops added through experimentation.",
        displayLabel: "Crop diversity",
        displayValue: "Fruit, vegetables and roots",
        displayContext: "Crops described by Malyadri in the supplied feature",
        sources: [foodForestSource, bananaSource, passionFruitSource],
      },
      {
        id: "5a000000-0000-4000-8000-000000000205",
        key: "water_and_soil_management",
        type: "ecological_stewardship",
        statement:
          "Malyadri describes using field channels, drip irrigation and flood watering on sandy soil, while retaining dry leaves and cut vegetation as surface biomass and mulch.",
        displayLabel: "Water and soil",
        displayValue: "Drip, channels and surface biomass",
        displayContext: "Malyadri's stated farm practices",
        sources: [foodForestSource, leafyVegetablesSource],
      },
      {
        id: "5a000000-0000-4000-8000-000000000206",
        key: "plant_variety_experiments",
        type: "innovation",
        statement:
          "The supplied short videos show or discuss several plant varieties and experiments, including red and other bananas, kamanchi, wild fig, coffee, litchi, a native jackfruit type, passion fruit and plants described as medicinal.",
        displayLabel: "Working style",
        displayValue: "Observe, compare and experiment",
        displayContext: "Supplied Telugu farm shorts",
        sources: [
          kamanchiSource,
          bananaSource,
          medicinalPlantsSource,
          passionFruitSource,
          wildFigSource,
        ],
      },
      {
        id: "5a000000-0000-4000-8000-000000000207",
        key: "children_tree_house",
        type: "community",
        statement:
          "One supplied short shows a tree-house-like structure built around a mango tree so children can play safely, spend time outdoors and be drawn away from mobile-phone use.",
        displayLabel: "Farm as a learning space",
        displayValue: "A tree house for children",
        displayContext: "Idea described in the supplied short",
        sources: [treeHouseSource],
      },
      {
        id: "5a000000-0000-4000-8000-000000000208",
        key: "household_and_market_learning",
        type: "knowledge_sharing",
        statement:
          "Malyadri presents the food forest as a way to supply household food while testing which crops can also be sold; he identifies marketing and connecting with more consumers as continuing challenges.",
        displayLabel: "Long-term direction",
        displayValue: "Food, learning and possible income",
        displayContext: "Malyadri's stated goals in the supplied feature",
        sources: [foodForestSource],
      },
    ],
    sections: [
      {
        kind: "origin",
        heading: "తండ్రి బాటలో సహజ వ్యవసాయం",
        body:
          "రైతునేస్తం కోసం రూపొందించిన తెలుగు ఫీచర్‌లో, బుచ్చిరెడ్డిపాలెం సమీపంలోని తన పొలాన్ని మాల్యాద్రి పరిచయం చేస్తారు. ఈ క్షేత్రానికి పునాది తన తండ్రి మాలకొండయ్య వేసినప్పటికీ, దాన్ని కొనసాగిస్తూ అభివృద్ధి చేస్తున్నది తానేనని ఆయన చెబుతారు. రసాయన వ్యవసాయంలో పండిన ఆహారం గురించి కలిగిన ఆందోళన, ఇంట్లో ఇప్పటికే ఉన్న సహజ వ్యవసాయ అనుభవం తనను ఈ దిశగా నడిపించాయని ఆయన వివరిస్తారు. ఇది మాల్యాద్రి స్వయంగా చెప్పిన ప్రేరణ కథ; FarmerBook దాన్ని కారణ-ఫలిత నిరూపణగా చూపదు.",
        claimKeys: ["identity_and_place", "family_natural_farming_origin"],
      },
      {
        kind: "work",
        heading: "ఒకే పంట కాదు—ఐదు లేయర్ల ఆహార అరణ్యం",
        body:
          "వీడియో ప్రకారం, మొత్తం సుమారు మూడు ఎకరాల పరిధిలోని సహజ వ్యవసాయ క్షేత్రంలో సుమారు ఒకటిన్నర ఎకరాల్లో మాల్యాద్రి ఐదు లేయర్ విధానాన్ని, ఫుడ్ ఫారెస్ట్ ఆలోచనను కలిపి అభివృద్ధి చేస్తున్నారు. మామిడి, జామ, అరటి, బొప్పాయి, మునగ ప్రధాన పంటలుగా ఉండగా, పనస, ఉసిరి, కరివేపాకు, చెరకు, మిరప, రాగులు, పసుపు, ఆకుకూరలు, వంకాయలు, తీపి బంగాళాదుంప మరియు ఇతర దుంపలను కూడా ప్రయోగిస్తున్నారు. మొక్కల మధ్య దూరం, నీడ, పంటల నీటి అవసరం మరియు ఇంటి వినియోగం—ఇవన్నీ ఒకే డిజైన్‌లో ఎలా కలపాలో ఆయన పరిశీలిస్తున్నారు.",
        claimKeys: ["five_layer_food_forest", "diverse_crop_layers"],
      },
      {
        kind: "impact",
        heading: "నీరు, నేల మరియు పడిపోయే ఆకుల విలువ",
        body:
          "మాల్యాద్రి వివరణలో నీటి నిర్వహణకు ప్రత్యేక స్థానం ఉంది. ఇసుక నేలలో నీరు త్వరగా దిగిపోతుందని చెబుతూ, పొలంలోని కాలువలు లేదా బోదెలతో పాటు డ్రిప్, అవసరమైనప్పుడు ఫ్లడ్ వాటరింగ్‌ను ఉపయోగిస్తున్నట్లు వివరిస్తారు. ఎండిన ఆకులు, కోసిన గడ్డి మరియు మొక్కల అవశేషాలను నేలపై ఉంచడం ద్వారా మల్చింగ్‌లా పనిచేయించాలని ఆయన ప్రయత్నిస్తున్నారు. పురుగులు లేదా కలుపు కనిపించకుండా పూర్తిగా శుభ్రం చేయడం కన్నా, బ్రష్ కట్టర్‌తో నియంత్రించి సేంద్రియ పదార్థాన్ని పొలంలోనే ఉంచే విధానాన్ని వీడియో చూపిస్తుంది. ఈ పద్ధతుల ఫలితాలు ప్రదేశానుసారం మారవచ్చు; ఇది సాధారణ వ్యవసాయ సూచన కాదు.",
        claimKeys: ["water_and_soil_management"],
      },
      {
        kind: "community",
        heading: "పిల్లలకు పొలం ఒక బయట తరగతి గది",
        body:
          "ఒక చిన్న వీడియోలో మామిడి చెట్టును ఆనుకుని నిర్మించిన ట్రీ హౌస్‌ను మాల్యాద్రి చూపిస్తారు. పిల్లలు చెట్లెక్కేటప్పుడు భద్రత సమస్యలు ఉండకూడదనే ఉద్దేశంతో, వారు కూర్చొని బోర్డ్ గేమ్స్ ఆడుకునేలా ఈ నిర్మాణాన్ని ఏర్పాటు చేశామని చెబుతారు. మొబైల్ ఫోన్‌ల నుంచి పిల్లలను బయటకు తీసుకువచ్చి, చెట్లు, నేల మరియు ఆహారంతో సమయం గడిపేలా చేయాలనే ఆలోచన ఇందులో కనిపిస్తుంది. అందువల్ల ఈ క్షేత్రం పంటల ప్రదేశమే కాకుండా, కుటుంబం మరియు పిల్లల కోసం ఒక జీవన-అభ్యాస స్థలంగా కూడా ఊహించబడుతోంది.",
        claimKeys: ["children_tree_house"],
      },
      {
        kind: "lessons",
        heading: "ప్రయోగం, వినియోగం మరియు మార్కెట్ ప్రశ్న",
        body:
          "అరటిలో అనేక రకాలు, అడవి అంజీర, కాఫీ, లీచి, ప్యాషన్ ఫ్రూట్, స్థానికంగా పిలిచే కొన్ని మొక్కలు మరియు ఔషధ మొక్కలుగా పరిచయం చేసిన జాతులను మాల్యాద్రి చిన్న వీడియోల్లో వివరిస్తారు. ప్రధాన ఫుడ్ ఫారెస్ట్ వీడియోలో, ఇంటి అవసరాలకు ఆహారం అందించడంతో పాటు, అదనంగా వచ్చే పంటను ఎలా అమ్మాలి, ఎలా విలువ పెంచాలి, ఇతర రైతులు చూసి నేర్చుకునేలా ఎలా చేయాలి అనే ప్రశ్నలను ఆయన ప్రస్తావిస్తారు. అదే సమయంలో మార్కెటింగ్ ఇంకా పెద్ద సవాలేనని కూడా చెబుతారు. ఈ నిజాయితీ—విజయం మాత్రమే కాకుండా నేర్చుకునే దశను కూడా చూపించడం—మాల్యాద్రి కథలో ముఖ్యమైన భాగం.",
        claimKeys: ["plant_variety_experiments", "household_and_market_learning"],
      },
    ],
    coverage: videoSources.map((source) => ({
      url: source.url,
      publisher: source.publisher,
      title: source.title,
      sourceType: source.sourceType,
      ...(source.url === foodForestSource.url
        ? {
            thumbnail: {
              assetUrl: "https://i.ytimg.com/vi/-kZ-9PHK3YU/maxresdefault.jpg",
              altText: "Five-layer food forest feature thumbnail",
              provider: "youtube_oembed" as const,
            },
          }
        : {}),
    })),
    seo: {
      title: "మాల్యాద్రి | ఐదు లేయర్ ఫుడ్ ఫారెస్ట్ | FarmerBook",
      description:
        "నెల్లూరు జిల్లా బుచ్చిరెడ్డిపాలెం సమీపంలో మాల్యాద్రి అభివృద్ధి చేస్తున్న సహజ వ్యవసాయం, ఐదు లేయర్ ఫుడ్ ఫారెస్ట్ మరియు పంటల ప్రయోగాలపై మూలాధార-ఆధారిత తెలుగు కథనం.",
      keywords: [
        "మాల్యాద్రి",
        "Malyadri Beegala",
        "five layer food forest",
        "natural farming Nellore",
        "Buchireddypalem farmer",
        "Andhra Pradesh agriculture",
        "సహజ వ్యవసాయం",
        "ఆహార అరణ్యం",
      ],
    },
  },
} satisfies FeaturedFarmerPublication;
