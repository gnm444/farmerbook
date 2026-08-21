import type { BlogPublication } from "./contracts";
import {
  FOOD_TRACEABILITY_SLUG,
  foodTraceabilityPublication,
} from "./publications/food-traceability";
import {
  GHEE_TRUST_SLUG,
  gheeTrustPublication,
} from "./publications/ghee-trust";
import {
  MONEY_CHARACTER_SLUG,
  moneyCharacterPublication,
} from "./publications/money-character";

export { FOOD_TRACEABILITY_SLUG, GHEE_TRUST_SLUG, MONEY_CHARACTER_SLUG };

export const CALCULATED_TRANSITION_SLUG =
  "calculated-transition-to-natural-farming";

export const foundingBlogPublication: BlogPublication = {
  slug: CALCULATED_TRANSITION_SLUG,
  category: "natural_farming",
  author: "FarmerBook Editorial",
  publishedAt: "2026-08-18T12:30:00.000Z",
  updatedAt: "2026-08-18T12:30:00.000Z",
  readingMinutes: 8,
  editorialNote:
    "Adapted from a Telugu draft supplied by FarmerBook's founder. FarmerBook edited unsupported percentages, fixed timelines, income guarantees and oversimplified soil claims before publication. The Telugu and Indian English versions are editorially reviewed; other language versions are clearly labelled AI-assisted translations.",
  sources: [
    {
      title: "Natural Farming",
      publisher: "NITI Aayog — Natural Farming Initiative",
      url: "https://naturalfarming.niti.gov.in/natural-farming/",
    },
    {
      title: "Soil Health Card scheme — farmer FAQ",
      publisher: "Department of Agriculture & Farmers Welfare, Government of India",
      url: "https://soilhealth.dac.gov.in/files/FAQ_Final_English.pdf",
    },
    {
      title: "Natural Farming and scientific interpretation of Soil Health Card reports",
      publisher: "Indian Council of Agricultural Research",
      url: "https://icar.gov.in/index.php/hi/node/25263",
    },
    {
      title: "PGS-India Certification System — revised guidelines and standards",
      publisher: "National Centre for Organic & Natural Farming",
      url: "https://pgsindia-ncof.gov.in/Default/assets/front/PDF/Revised_PGS_India_Guidlines.pdf",
    },
  ],
  english: {
    title: "The ‘safe’ habit can carry the biggest risk: change farming through a measured field trial",
    excerpt:
      "Natural farming is not a blind leap and chemical-input farming is not a syllabus to follow automatically. A safer transition starts with soil evidence, a small comparison plot and honest records.",
    dek:
      "The useful part of the ‘Elon Musk of agriculture’ analogy is not hero worship. It is the discipline of questioning assumptions, testing on a limited scale and learning from evidence before committing the whole farm.",
    sections: [
      {
        heading: "The risk hidden inside a familiar routine",
        paragraphs: [
          "A familiar practice can feel safe simply because it is familiar. Buying the same input, following the same schedule and expecting the same result may reduce uncertainty in the short term, but it can also hide rising input costs, changing pest pressure, soil constraints and market risk.",
          "That does not mean every conventional practice is wrong, or that every natural-farming practice will work in every field. The practical question is simpler: which approach produces the best result for this crop, this soil, this season and this household after cost, labour and risk are counted?",
        ],
        bullets: [],
      },
      {
        heading: "First principles begin with the soil, not a slogan",
        paragraphs: [
          "Healthy soil is more complex than any single ingredient. Organic carbon and beneficial microbial activity matter, but crops also depend on the soil's physical condition, water, pH and available macro- and micronutrients. A Soil Health Card assesses twelve parameters and gives holding-specific nutrient and amendment guidance.",
          "Natural-farming programmes promote on-farm biomass recycling, mulching and formulations such as Beejamrit and Jeevamrit. Locally available materials can reduce dependence on purchased inputs in some situations, but no fixed cost reduction should be promised. Availability, preparation, labour, crop and local conditions all change the result.",
        ],
        bullets: [],
      },
      {
        heading: "Use a small field trial as your laboratory",
        paragraphs: [
          "Do not change an entire holding overnight because of an article or a viral video. Choose a manageable trial area and keep a comparable area under the current practice. Twenty per cent can be an example, not a universal rule; the right size depends on land, irrigation, crop, household cash flow and access to advice.",
          "Before sowing, write down what will remain the same and what will change. Use the same variety and similar planting dates where possible. Seek crop- and district-specific guidance from a Krishi Vigyan Kendra, State Agriculture Department or another qualified local professional.",
        ],
        bullets: [
          "Record every purchased input and every on-farm preparation.",
          "Record family and hired labour separately.",
          "Measure marketable yield and rejected produce, not only gross harvest.",
          "Note irrigation, soil moisture, pest and disease observations.",
          "Record the actual sale price; do not assume a premium.",
        ],
      },
      {
        heading: "Treat the transition as learning, not a countdown",
        paragraphs: [
          "There is no responsible promise that every farm will lose yield for exactly one or two years and become fully restored in year three. Soil, climate, previous management, crop choice and farmer skill differ. Certification conversion periods are also administrative standards, not a guarantee of when a field will reach a particular biological condition.",
          "Review the comparison after each crop. Keep what worked, investigate what did not, and change one important variable at a time. A trial that prevents a costly whole-farm mistake is useful even when its first result is disappointing.",
        ],
        bullets: [],
      },
      {
        heading: "Certification and price must be proved separately",
        paragraphs: [
          "Practising natural methods, saying ‘chemical-free’ and holding an organic certificate are not the same claim. PGS-India guidance distinguishes certified organic produce from produce that is still under conversion. Buyers should be shown accurate evidence, and farmers should not be pushed to make claims their paperwork cannot support.",
          "FarmerBook marks a Farmer as certified organic only after certification paperwork is uploaded and reviewed. Until then the profile says: ‘Non-certified organic farmer (paperwork not yet completed to prove certification).’ Direct discovery and conversation can help a farmer reach buyers, but FarmerBook does not guarantee a 30–50% premium—or any premium.",
        ],
        bullets: [],
      },
      {
        heading: "What calculated risk looks like on a farm",
        paragraphs: [
          "The strongest version of the space-startup analogy is method, not personality: break a large decision into testable questions, protect the household from one irreversible bet, measure the result and improve the next attempt. A farmer does not need to imitate a celebrity entrepreneur to practise that discipline.",
        ],
        bullets: [
          "Start with a question that can be measured.",
          "Protect essential household income and working capital.",
          "Use local evidence and qualified advice.",
          "Expand only after repeated results make the next step reasonable.",
        ],
      },
    ],
    conclusion:
      "The goal is not to replace one rigid ‘safe syllabus’ with another. It is to build a farming system that you understand: one where soil evidence, input costs, labour, yield, resilience and market demand are visible. A small, measured transition can turn uncertainty into knowledge—and knowledge is the part of risk a farmer can manage.",
    safetyNote:
      "This article is general education, not crop-specific agronomic, pesticide, financial or certification advice. Check current product labels and consult your local KVK, State Agriculture Department, soil-testing service or another qualified professional before making high-impact changes.",
  },
  telugu: {
    title: "‘సేఫ్’ అనిపించే అలవాటులోనే పెద్ద రిస్క్ ఉండొచ్చు: చిన్న పొలం ప్రయోగంతో మార్పు మొదలుపెట్టండి",
    excerpt:
      "ప్రకృతి వ్యవసాయం వైపు మారడం గుడ్డి సాహసం కావాల్సిన అవసరం లేదు. మట్టి ఆధారాలు, చిన్న పోలిక ప్లాట్‌, నిజాయితీ ఖర్చు–దిగుబడి రికార్డులతో జాగ్రత్తగా పరీక్షించవచ్చు.",
    dek:
      "‘వ్యవసాయంలో ఎలాన్ మస్క్‌లా ఆలోచించండి’ అన్న పోలికలో ఉపయోగకరమైన విషయం వ్యక్తి పూజ కాదు—అంచనాలను ప్రశ్నించడం, పరిమిత స్థాయిలో పరీక్షించడం, ఆధారాలు చూసి తర్వాతే మొత్తం పొలంపై నిర్ణయం తీసుకోవడం.",
    sections: [
      {
        heading: "అలవాటైన మార్గంలో దాగి ఉండే రిస్క్",
        paragraphs: [
          "ఎప్పటినుంచో చేస్తున్న పద్ధతి కాబట్టి అది సురక్షితమే అనిపించవచ్చు. అదే ఇన్‌పుట్ కొనడం, అదే షెడ్యూల్ అనుసరించడం తాత్కాలికంగా అనిశ్చితిని తగ్గించవచ్చు. కానీ పెరుగుతున్న పెట్టుబడి ఖర్చు, మారుతున్న పురుగు ఒత్తిడి, మట్టి సమస్యలు, మార్కెట్ రిస్క్ కనిపించకుండా పోవచ్చు.",
          "అందుకే ప్రతి సంప్రదాయ లేదా రసాయన పద్ధతి తప్పు అని కాదు; ప్రతి ప్రకృతి వ్యవసాయ పద్ధతి ప్రతి పొలంలో తప్పకుండా పనిచేస్తుందని కూడా కాదు. అసలు ప్రశ్న: ఈ పంటకు, ఈ మట్టికి, ఈ సీజన్‌కు, ఈ కుటుంబ పరిస్థితికి—ఖర్చు, శ్రమ, రిస్క్ అన్నీ లెక్కించిన తర్వాత—ఏ పద్ధతి మెరుగైన ఫలితం ఇస్తుంది?",
        ],
        bullets: [],
      },
      {
        heading: "ఫస్ట్ ప్రిన్సిపుల్స్ అంటే నినాదం కాదు—మట్టితో మొదలు",
        paragraphs: [
          "ఆరోగ్యకరమైన మట్టి ఒక్క పదార్థంతో నిర్ణయించబడదు. ఆర్గానిక్ కార్బన్‌, మేలు చేసే సూక్ష్మజీవులు ముఖ్యమే; అలాగే మట్టి నిర్మాణం, నీరు, pH, అందుబాటులో ఉన్న స్థూల–సూక్ష్మ పోషకాలు కూడా పంటకు అవసరం. Soil Health Card పన్నెండు పరామితులను పరీక్షించి, ఆ పొలానికి తగిన పోషకాలు మరియు మట్టి సవరణలపై సూచనలు ఇస్తుంది.",
          "ప్రకృతి వ్యవసాయ కార్యక్రమాలు పొలంలో లభించే బయోమాస్‌ను తిరిగి వినియోగించడం, మల్చింగ్‌, బీజామృతం, జీవామృతం వంటి తయారీలను ప్రోత్సహిస్తాయి. స్థానిక వనరులు కొన్ని పరిస్థితుల్లో బయటి ఇన్‌పుట్లపై ఆధారాన్ని తగ్గించవచ్చు. కానీ 80% ఖర్చు తగ్గుతుంది లేదా పెట్టుబడి సున్నా అవుతుంది అని అందరికీ హామీ ఇవ్వలేం; వనరుల లభ్యత, తయారీ, శ్రమ, పంట, ప్రాంతం ఫలితాన్ని మార్చుతాయి.",
        ],
        bullets: [],
      },
      {
        heading: "మీ చిన్న పోలిక ప్లాట్‌ను ప్రయోగశాలగా మార్చండి",
        paragraphs: [
          "ఒక వ్యాసం లేదా వైరల్ వీడియో చూసి మొత్తం పొలాన్ని ఒకే రాత్రిలో మార్చవద్దు. నిర్వహించగల చిన్న భాగాన్ని ప్రయోగానికి ఎంచుకుని, దానికి సమానమైన మరో భాగంలో ప్రస్తుత పద్ధతిని కొనసాగించండి. 20% అనేది ఒక ఉదాహరణ మాత్రమే—ప్రతి రైతుకు సరిపోయే నియమం కాదు. సరైన పరిమాణం భూమి, నీరు, పంట, కుటుంబ నగదు ప్రవాహం, స్థానిక సలహాపై ఆధారపడి ఉంటుంది.",
          "విత్తే ముందు ఏ అంశాలు ఒకేలా ఉంటాయో, ఏది మారుతుందో రాసుకోండి. వీలైతే ఒకే విత్తన రకం, దగ్గర తేదీలు ఉపయోగించండి. మీ జిల్లా పంట పరిస్థితులకు కృషి విజ్ఞాన కేంద్రం (KVK), రాష్ట్ర వ్యవసాయ శాఖ లేదా అర్హత కలిగిన స్థానిక నిపుణుడి సలహా తీసుకోండి.",
        ],
        bullets: [
          "కొన్న ప్రతి ఇన్‌పుట్‌, పొలంలో తయారు చేసిన ప్రతి ద్రావణం ఖర్చు నమోదు చేయండి.",
          "కుటుంబ శ్రమ, కూలీల శ్రమను విడిగా రాయండి.",
          "మొత్తం కోత మాత్రమే కాకుండా అమ్మదగిన దిగుబడి, తిరస్కరించిన ఉత్పత్తిని కొలవండి.",
          "నీటిపారుదల, మట్టి తేమ, పురుగులు, వ్యాధుల పరిశీలనలు నమోదు చేయండి.",
          "నిజంగా వచ్చిన అమ్మక ధరనే నమోదు చేయండి; ప్రీమియం వస్తుందని ముందే ఊహించవద్దు.",
        ],
      },
      {
        heading: "మార్పును నేర్చుకునే ప్రక్రియగా చూడండి—కౌంట్‌డౌన్‌గా కాదు",
        paragraphs: [
          "ప్రతి పొలంలో మొదటి ఒకటి లేదా రెండు సంవత్సరాలు దిగుబడి తగ్గి, మూడో సంవత్సరంలో మట్టి పూర్తిగా పునరుద్ధరించబడుతుందని బాధ్యతగా హామీ ఇవ్వలేం. మట్టి, వాతావరణం, గత నిర్వహణ, పంట ఎంపిక, రైతు నైపుణ్యం వేర్వేరు. సర్టిఫికేషన్ మార్పు కాలం పరిపాలనా ప్రమాణం; ఒక పొలం ఏ తేదీన నిర్దిష్ట జీవస్థితికి చేరుతుందనే హామీ కాదు.",
          "ప్రతి పంట తర్వాత పోలికను సమీక్షించండి. పనిచేసినది కొనసాగించండి; పనిచేయనిదానికి కారణం వెతకండి; ఒకసారి ఒక ముఖ్యమైన మార్పే చేయండి. మొదటి ఫలితం నిరాశ కలిగించినా, మొత్తం పొలంలో పెద్ద ఖర్చు తప్పించగలిగిన ప్రయోగం కూడా విలువైనదే.",
        ],
        bullets: [],
      },
      {
        heading: "సర్టిఫికేషన్‌, ధర—రెండింటినీ విడిగా నిరూపించాలి",
        paragraphs: [
          "ప్రకృతి పద్ధతులు పాటించడం, ‘కెమికల్-ఫ్రీ’ అని చెప్పడం, ఆర్గానిక్ సర్టిఫికేట్ కలిగి ఉండడం—మూడు ఒకటే కాదు. PGS-India మార్గదర్శకాలు సర్టిఫైడ్ ఆర్గానిక్ ఉత్పత్తి మరియు ఇంకా మార్పు దశలో ఉన్న ఉత్పత్తిని వేరు చేస్తాయి. కొనుగోలుదారునికి సరైన ఆధారం చూపాలి; పేపర్‌వర్క్ నిరూపించలేని హామీలు రైతు ఇవ్వకూడదు.",
          "FarmerBook‌లో ఆర్గానిక్ సర్టిఫికేషన్ పత్రాలు అప్లోడ్ చేసి సమీక్ష పూర్తైన తర్వాత మాత్రమే రైతుకు ‘certified organic’ లేబుల్ వస్తుంది. అప్పటివరకు ‘Non-certified organic farmer (paperwork not yet completed to prove certification)’ అని కనిపిస్తుంది. నేరుగా కొనుగోలుదారులతో పరిచయం ఉపయోగపడవచ్చు; కానీ FarmerBook 30–50% లేదా మరే ప్రీమియం ధరనూ హామీ ఇవ్వదు.",
        ],
        bullets: [],
      },
      {
        heading: "పొలంలో క్యాలిక్యులేటెడ్ రిస్క్ అంటే ఇదే",
        paragraphs: [
          "అంతరిక్ష స్టార్టప్ పోలికలో తీసుకోవాల్సింది వ్యక్తి కాదు—పద్ధతి. పెద్ద నిర్ణయాన్ని కొలవగల చిన్న ప్రశ్నలుగా విభజించండి; తిరిగి సరిచేయలేని ఒక్క పందెం నుంచి కుటుంబాన్ని కాపాడండి; ఫలితాన్ని కొలిచి తదుపరి ప్రయత్నాన్ని మెరుగుపరచండి. ఈ క్రమశిక్షణ కోసం రైతు ఏ ప్రముఖ వ్యాపారవేత్తనూ అనుకరించాల్సిన అవసరం లేదు.",
        ],
        bullets: [
          "కొలవగల ప్రశ్నతో ప్రారంభించండి.",
          "కుటుంబానికి అవసరమైన ఆదాయం, వర్కింగ్ క్యాపిటల్‌ను రక్షించండి.",
          "స్థానిక ఆధారాలు, అర్హత కలిగిన సలహా ఉపయోగించండి.",
          "పునరావృత ఫలితాలు తదుపరి అడుగు సమంజసం అని చూపిన తర్వాతే విస్తరించండి.",
        ],
      },
    ],
    conclusion:
      "ఒక గట్టి ‘సేఫ్ సిలబస్’ స్థానంలో ఇంకొక గట్టి సిలబస్ పెట్టడం లక్ష్యం కాదు. మట్టి ఆధారాలు, ఇన్‌పుట్ ఖర్చు, శ్రమ, దిగుబడి, తట్టుకునే శక్తి, మార్కెట్ డిమాండ్—అన్నీ మీకు కనిపించేలా, మీరు అర్థం చేసుకున్న వ్యవసాయ వ్యవస్థను నిర్మించడం లక్ష్యం. చిన్నగా, కొలుస్తూ చేసిన మార్పు అనిశ్చితిని జ్ఞానంగా మార్చుతుంది; రైతు నిర్వహించగల రిస్క్‌లో జ్ఞానమే ముఖ్యమైన భాగం.",
    safetyNote:
      "ఈ వ్యాసం సాధారణ అవగాహన కోసం మాత్రమే. ఇది పంట-ప్రత్యేక వ్యవసాయ, పురుగుమందు, ఆర్థిక లేదా సర్టిఫికేషన్ సలహా కాదు. పెద్ద మార్పు ముందు తాజా ఉత్పత్తి లేబుల్ సూచనలు చూడండి; స్థానిక KVK, రాష్ట్ర వ్యవసాయ శాఖ, మట్టి పరీక్ష సేవ లేదా అర్హత కలిగిన నిపుణుడిని సంప్రదించండి.",
  },
};

export const STATIC_BLOG_PUBLICATIONS = [
  moneyCharacterPublication,
  foodTraceabilityPublication,
  gheeTrustPublication,
  foundingBlogPublication,
] as const;

export function staticBlogPublication(slug: string) {
  return STATIC_BLOG_PUBLICATIONS.find((article) => article.slug === slug) ?? null;
}
