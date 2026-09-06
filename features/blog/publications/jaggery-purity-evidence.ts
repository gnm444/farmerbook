import type { BlogPublication } from "../contracts";

export const JAGGERY_PURITY_EVIDENCE_SLUG = "jaggery-gur-purity-adulteration-evidence";

export const jaggeryPurityEvidencePublication: BlogPublication = {
  slug: JAGGERY_PURITY_EVIDENCE_SLUG,
  category: "food_safety",
  author: "FarmerBook Editorial",
  publishedAt: "2026-09-02T09:00:00.000Z",
  updatedAt: "2026-09-02T09:00:00.000Z",
  readingMinutes: 7,
  editorialNote:
    "This article was edited as a food-safety explainer after checking the supplied claims against FSSAI, NIN, WHO and AYUSH sources. The viral ‘90% chemical’ and ‘poison’ wording is not presented as fact: the 90% figure in the Indian standard refers to minimum total sugars, while the FSSAI survey reports a defined sample of jaggery products and overlapping quality categories. AI-generated images are illustrative and do not certify any product.",
  sources: [
    { title: "Jaggery Survey 2022", publisher: "Food Safety and Standards Authority of India", url: "https://www.fssai.gov.in/upload/uploadfiles/files/Approved_Survey.pdf" },
    { title: "Food Safety and Standards Regulations — jaggery standard", publisher: "Food Safety and Standards Authority of India", url: "https://www.fssai.gov.in/upload/uploadfiles/files/Compendium_Food_Additives_Regulations_04_01_2022.pdf" },
    { title: "Check Adulteration at Home (DART)", publisher: "Food Safety and Standards Authority of India", url: "https://fssai.gov.in/citizen/about-check-adulteration?csrt=630764165870820631" },
    { title: "Dietary Guidelines for Indians, 2024", publisher: "National Institute of Nutrition, ICMR", url: "https://www.nin.res.in/dietaryguidelines/pdfjs/locale/DGI07052024P.pdf" },
    { title: "Guideline: Sugars intake for adults and children", publisher: "World Health Organization", url: "https://www.who.int/publications/i/item/9789241549028" },
    { title: "Principles of Ayurveda", publisher: "Ministry of Ayush, Government of India", url: "https://ayusoft.ayush.gov.in/principles-of-ayurveda/" },
  ],
  heroImage: {
    src: "/images/blog/jaggery-farm-processing.png",
    alt: "Jaggery blocks and sugarcane in a rural processing setting",
    width: 1536,
    height: 1024,
    caption: "Illustrative AI-generated image: sugarcane and jaggery at a small processing unit. It is not evidence of the quality of any product.",
    provenance: "ai_generated",
  },
  supportingImage: {
    src: "/images/blog/jaggery-kitchen-still-life.png",
    alt: "Deep golden-brown jaggery pieces with sugarcane on a kitchen counter",
    width: 1254,
    height: 1254,
    caption: "Illustrative AI-generated still life. Colour, texture and appearance alone cannot prove that jaggery is pure.",
    provenance: "ai_generated",
  },
  infographic: {
    src: "/images/blog/jaggery-fssai-survey-infographic.svg",
    alt: "Infographic showing the FSSAI 2022 jaggery survey sample size and overlapping quality findings",
    width: 1200,
    height: 760,
    caption: "The FSSAI survey categories overlap; the results should not be converted into a claim that 90% of jaggery contains chemicals.",
  },
  english: {
    title: "Jaggery (Gur): Tradition, Purity and What the Evidence Says",
    excerpt: "Jaggery can be a meaningful traditional sweetener, but a viral ‘90% chemical’ claim turns a real food-safety question into misinformation. Here is what the standards and survey data actually show.",
    dek: "Alongside rice, pulses and other staples, jaggery has a familiar place in Indian kitchens. The right conversation is not whether every jaggery block is medicine or poison; it is how the product is made, labelled, tested and eaten in moderation.",
    sections: [
      {
        heading: "A traditional sweetener, not a miracle cure",
        paragraphs: [
          "Jaggery, or gur, is made by concentrating sugarcane juice or palm sap. Because it is less refined than white sugar, it may retain molasses, colour and small amounts of minerals. That does not make it a free food: the National Institute of Nutrition lists jaggery among added sugars, and the World Health Organization recommends limiting free-sugar intake.",
          "Traditional systems use their own vocabulary for food and digestion. Ayurveda discusses ideas such as Agni and Ama, but those concepts should not be turned into modern promises that jaggery detoxifies the blood, treats respiratory disease or replaces medical care. Enjoying a small amount is different from calling it a medicine.",
        ],
        bullets: [],
      },
      {
        heading: "The ‘90% chemical’ claim needs a correction",
        paragraphs: [
          "The number 90% appears in the FSSAI standard for cane jaggery as a minimum total-sugars requirement. It does not mean that 90% of jaggery is made of chemicals. In a separate 2022 survey, FSSAI tested 3,060 jaggery samples collected from 35 States and Union Territories.",
          "That survey found 34.5% of samples substandard for specified chemical quality parameters, 5.5% misbranded and 1.8% in both groups. These are overlapping categories from a defined survey sample, not a nationwide claim that 90% of all jaggery is contaminated. The survey reported no non-compliant sample for heavy metals among the samples tested.",
        ],
        bullets: ["The data does support careful quality control and honest labelling.", "The data does not support calling all outside jaggery ‘poison’."] ,
      },
      {
        heading: "What adulteration and poor quality can involve",
        paragraphs: [
          "Food safety concerns can include non-compliance with moisture, sugar, ash, sulphite, added-colour or other specified parameters. Under the jaggery standard, added colour is not permitted. Sodium bicarbonate may be used for clarification only when it is food grade and used within the applicable requirements. A process aid or a quality failure should not be casually described as proof that every producer is adding industrial chemicals.",
          "Very bright colour, a uniform block or a low price may be reasons to ask questions, but appearance alone cannot identify every adulterant. The safest conclusion is simple: buy from a traceable seller, read the label and use proper testing when a serious concern exists.",
        ],
        bullets: [],
      },
      {
        heading: "A practical buying and storage checklist",
        paragraphs: [
          "Consumers deserve the same clarity that farmers and processors need: where the cane or palm sap came from, how it was clarified, which batch was packed and who is responsible for the product. Packaged jaggery should have readable manufacturer, batch, date and licensing details. A local producer can offer the same confidence through a clean process and a documented batch record.",
          "Do not rely on a single home trick to certify purity. FSSAI’s DART material is an awareness resource, and its household observations cannot detect every chemical, microbial or heavy-metal risk. Do not taste a suspicious sample or handle an unknown chemical. Keep the packet, photograph the label and contact the relevant food-safety authority or an accredited laboratory if the concern is material.",
        ],
        bullets: ["Choose a sealed, traceable pack with a clear batch or lot number.", "Prefer a producer who can explain the source and processing method.", "Store jaggery dry and protected from insects and moisture.", "Treat colour and texture as clues—not laboratory results."],
      },
      {
        heading: "Farm-to-table trust is the real solution",
        paragraphs: [
          "The extra money paid for genuinely cleaner processing should return as better health confidence, a fairer price and a stronger livelihood—not as a vague fear campaign. Farmers and small processors can build that trust with clean water, food-grade equipment, batch records, hygienic packing and transparent testing. Buyers can reward those practices without demanding unsupported ‘chemical-free’ or medicinal claims.",
          "For FarmerBook, the useful message is therefore balanced: jaggery is a traditional sweetener with cultural value, adulteration deserves attention, and evidence matters more than a forwarded percentage. Good food safety protects both the household eating the product and the farmer making it.",
        ],
        bullets: [],
      },
    ],
    conclusion: "Pure jaggery is worth paying for when purity is demonstrated through a clean process, traceability and appropriate testing. But it remains a sugar-rich food, not a detox medicine. Let us replace the unsupported ‘90% poison’ claim with a better standard: truthful labels, responsible processing and moderation at the table.",
    safetyNote: "This is general food-safety information, not medical advice or a laboratory certification. People managing diabetes or another health condition should discuss sugar intake with a qualified clinician. If you suspect adulteration, preserve the product and packaging and seek official or accredited testing.",
  },
  telugu: {
    title: "బెల్లం గురించి నిజం: సంప్రదాయం, స్వచ్ఛత, కల్తీపై ఆధారాలు",
    excerpt: "బెల్లం మన ఆహార సంప్రదాయంలో ముఖ్యమైనది. కానీ ‘90 శాతం రసాయనాలు’ లేదా ‘విషం’ అనే మాటలకు దేశవ్యాప్త ఆధారం లేదు. అందుబాటులో ఉన్న ప్రమాణాలు, సర్వే ఫలితాలు ఏమి చెబుతున్నాయో చూద్దాం.",
    dek: "బియ్యం, పప్పులు వంటి నిత్యావసరాలతో పాటు బెల్లం కూడా మన వంటింట్లో ఉంటుంది. బెల్లం ఔషధమా, విషమా అనే అతిశయోక్తికి బదులుగా—దాని తయారీ, లేబులింగ్, పరీక్షలు, పరిమిత వినియోగం గురించి నిజాయితీగా మాట్లాడాలి.",
    sections: [
      {
        heading: "సంప్రదాయ తీపి పదార్థం—అద్భుత ఔషధం కాదు",
        paragraphs: ["చెరకు రసం లేదా తాటి వంటి పామ్ సాప్‌ను మరిగించి గాఢం చేయడం ద్వారా బెల్లం తయారవుతుంది. తెల్ల చక్కెర కంటే తక్కువ శుద్ధి చేయబడినందున కొంత మోలాసిస్, రంగు, స్వల్ప ఖనిజాలు మిగిలి ఉండవచ్చు. అయినా బెల్లం చక్కెరే; ICMR–NIN మార్గదర్శకాలు జాగరీని చేర్చిన చక్కెరల్లో లెక్కిస్తాయి.", "ఆయుర్వేదంలోని అగ్ని, ఆమ వంటి పదాలు ఆ సంప్రదాయానికి చెందిన భావనలు. వాటిని ఆధునిక వైద్య చికిత్స, రక్త శుద్ధి లేదా డిటాక్స్‌కు నిర్ధారణగా చెప్పకూడదు."],
        bullets: [],
      },
      {
        heading: "‘90 శాతం రసాయనాలు’ అనే మాట ఎందుకు తప్పుదారి పట్టిస్తుంది",
        paragraphs: ["FSSAI ప్రమాణంలో 90 శాతం అనే సంఖ్య చెరకు బెల్లంలో ఉండాల్సిన కనీస మొత్తం చక్కెరలను సూచిస్తుంది; 90 శాతం రసాయనాలు ఉన్నాయని కాదు. 2022లో FSSAI 35 రాష్ట్రాలు, కేంద్రపాలిత ప్రాంతాల నుంచి 3,060 నమూనాలను పరీక్షించింది.", "ఆ సర్వేలో 34.5 శాతం నమూనాలు కొన్ని నాణ్యత ప్రమాణాల్లో substandard, 5.5 శాతం misbranded, 1.8 శాతం రెండు వర్గాల్లోనూ ఉన్నాయి. ఇవి ఒక నిర్దిష్ట నమూనా సర్వేలోని పరస్పరం మిళితమయ్యే వర్గాలు; దేశంలోని మొత్తం బెల్లం 90 శాతం కలుషితమని చెప్పడానికి ఇవి ఆధారం కావు."],
        bullets: ["నాణ్యత నియంత్రణ, నిజాయితీ లేబులింగ్ అవసరమని ఈ సమాచారం చెబుతుంది.", "బయట దొరికే ప్రతి బెల్లాన్ని ‘విషం’ అని పిలవడానికి ఇది ఆధారం కాదు."],
      },
      {
        heading: "కొనేటప్పుడు గుర్తుంచుకోవాల్సినవి",
        paragraphs: ["సీల్ చేసిన, తయారీదారు, బ్యాచ్ లేదా లాట్ నంబర్, తేదీ వంటి వివరాలు ఉన్న ప్యాక్‌ను ఎంచుకోండి. రంగు, వాసన, గట్టితనం మాత్రమే చూసి స్వచ్ఛతను నిర్ణయించకండి. ఇంటి పరీక్షలు అవగాహన కోసం మాత్రమే; అవి అన్ని రకాల కల్తీని గుర్తించవు.", "సందేహాస్పదమైన నమూనాను రుచి చూడకండి. ప్యాక్, లేబుల్, బిల్‌ను భద్రపరచి, అవసరమైతే సంబంధిత ఆహార భద్రత అధికారులను లేదా గుర్తింపు పొందిన ప్రయోగశాలను సంప్రదించండి."],
        bullets: [],
      },
    ],
    conclusion: "నిజమైన స్వచ్ఛతకు ఆధారం శుభ్రమైన తయారీ, బ్యాచ్‌ గుర్తింపు, సరైన పరీక్షలు, నిజాయితీ ధర. బెల్లాన్ని పరిమితంగా ఆస్వాదిద్దాం; ఆధారం లేని ‘90 శాతం విషం’ మాటకు బదులుగా రైతు, తయారీదారు, వినియోగదారుడిని కాపాడే ఆహార భద్రత ప్రమాణాలను కోరుదాం.",
    safetyNote: "ఇది సాధారణ ఆహార భద్రత సమాచారం మాత్రమే; వైద్య సలహా లేదా ప్రయోగశాల ధృవీకరణ కాదు. మధుమేహం లేదా ఇతర ఆరోగ్య సమస్యలు ఉన్నవారు చక్కెర వినియోగంపై వైద్య నిపుణుడిని సంప్రదించాలి.",
  },
};
