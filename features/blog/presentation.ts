import type { SupportedLocale } from "@/lib/i18n/locales";
import type { BlogPublication, BlogTranslationResult } from "./contracts";
import type { BlogTopic } from "./discovery";

const teluguUi = {
  collectionEyebrow: "ఫార్మర్‌బుక్ వ్యవసాయ గ్రంథాలయం",
  collectionTitle: "ఫార్మర్‌బుక్ వ్యాసాలు మరియు అనుభవాలు",
  collectionLede:
    "వ్యవసాయం, ఆహారం, జీవితం, పని, ఆలోచనలపై వ్యాసాలు—రచయిత వివరాలు, అవసరమైన చోట మూలాలతో.",
  organicIntelligenceTitle: "ఆర్గానిక్ ఇంటెలిజెన్స్",
  organicIntelligenceLede:
    "రచయిత వ్యక్తిగతంగా భద్రపరచిన పోస్టుల ఆధారంగా AI సహాయంతో సంపాదకీయంగా రూపొందించిన వ్యాసాలు, ఇప్పటికే ప్రచురించిన ఒక వ్యాసంతో పాటు.",
  allArticles: "అన్ని వ్యాసాలు",
  allTopics: "అన్ని అంశాలు",
  topicNavigation: "వ్యాస అంశాలు",
  collectionNavigation: "వ్యాస సేకరణలు",
  previousPage: "మునుపటి పేజీ",
  nextPage: "తదుపరి పేజీ",
  page: "పేజీ",
  noMatches: "ఈ ఎంపికలో ఇంకా వ్యాసాలు లేవు.",
  readArticle: "వ్యాసం చదవండి",
  backToBlog: "అన్ని వ్యాసాలు",
  sources: "మూలాలు మరియు మరింత చదవడానికి",
  safety: "ముఖ్యమైన సూచన",
  editorial: "సంపాదకీయ గమనిక",
  reviewed: "సంపాదకీయంగా సమీక్షించిన భాష",
  aiAdaptation:
    "రచయిత వ్యక్తిగతంగా భద్రపరచిన పోస్టుల ఆధారంగా AI సహాయంతో సంపాదకీయంగా రూపొందించిన వ్యాసం.",
  aiTranslation:
    "AI సహాయంతో అనువదించబడింది; స్థానిక భాష నిపుణుడి సమీక్ష ఇంకా జరగలేదు. సందేహం ఉంటే అందుబాటులో ఉన్న తెలుగు లేదా Indian English సంచికను చూడండి.",
  fallback:
    "ఈ భాషలో అనువాదం ప్రస్తుతం అందుబాటులో లేదు; Indian English సంచికను చూపిస్తున్నాం.",
  minutes: "నిమిషాల పఠనం",
};

const englishUi = {
  collectionEyebrow: "FarmerBook field library",
  collectionTitle: "FarmerBook articles and field notes",
  collectionLede:
    "Ideas about farming, food, life and work, with author context and sources where relevant.",
  organicIntelligenceTitle: "Organic Intelligence",
  organicIntelligenceLede:
    "AI-assisted editorial adaptations of privately archived author posts, alongside one previously published essay.",
  allArticles: "All articles",
  allTopics: "All topics",
  topicNavigation: "Article topics",
  collectionNavigation: "Article collections",
  previousPage: "Previous page",
  nextPage: "Next page",
  page: "Page",
  noMatches: "No articles are published in this selection yet.",
  readArticle: "Read article",
  backToBlog: "All articles",
  sources: "Sources and further reading",
  safety: "Important guidance",
  editorial: "Editorial note",
  reviewed: "Editorially reviewed language",
  aiAdaptation:
    "AI-assisted editorial adaptation of privately archived author posts.",
  aiTranslation:
    "AI-assisted translation; native-speaker review is still pending. Refer to the available Telugu or Indian English version if anything is unclear.",
  fallback:
    "Translation is temporarily unavailable in this language; the Indian English version is shown.",
  minutes: "minute read",
};

const hindiUi = {
  ...englishUi,
  collectionTitle: "FarmerBook लेख और अनुभव",
  collectionLede:
    "खेती, भोजन, जीवन, काम और विचारों पर लेख—लेखक की जानकारी और जहाँ ज़रूरी हो, स्रोतों के साथ।",
  organicIntelligenceTitle: "ऑर्गेनिक इंटेलिजेंस",
  organicIntelligenceLede:
    "लेखक की निजी तौर पर सुरक्षित पोस्टों से AI की सहायता से तैयार संपादकीय लेख, साथ में पहले प्रकाशित एक लेख।",
  allArticles: "सभी लेख",
  allTopics: "सभी विषय",
  topicNavigation: "लेख के विषय",
  collectionNavigation: "लेख संग्रह",
  previousPage: "पिछला पृष्ठ",
  nextPage: "अगला पृष्ठ",
  page: "पृष्ठ",
  noMatches: "इस चयन में अभी कोई लेख प्रकाशित नहीं है।",
  aiAdaptation:
    "लेखक की निजी तौर पर सुरक्षित पोस्टों से AI की सहायता से तैयार संपादकीय लेख।",
};

export function blogUi(locale: SupportedLocale) {
  if (locale === "te-IN") return teluguUi;
  if (locale === "hi-IN") return hindiUi;
  return englishUi;
}

export function blogTopicLabel(topic: BlogTopic, locale: SupportedLocale) {
  const labels = locale === "te-IN"
    ? {
        farming: "వ్యవసాయం",
        food: "ఆహారం",
        life: "జీవితం",
        philosophy: "తత్వం",
        work: "పని",
      }
    : locale === "hi-IN"
      ? {
          farming: "खेती",
          food: "भोजन",
          life: "जीवन",
          philosophy: "विचार",
          work: "काम",
        }
    : {
        farming: "Farming",
        food: "Food",
        life: "Life",
        philosophy: "Philosophy",
        work: "Work",
      };
  return labels[topic];
}

export function blogCategoryLabel(
  category: BlogPublication["category"],
  locale: SupportedLocale,
) {
  const labels = locale === "te-IN"
    ? {
        natural_farming: "ప్రకృతి వ్యవసాయం",
        food_safety: "ఆహార భద్రత",
        farm_to_table: "పొలం నుంచి పళ్లెం వరకు",
        regular_farming: "సాధారణ వ్యవసాయం",
        farm_tools: "వ్యవసాయ పనిముట్లు",
      }
    : {
        natural_farming: "Natural farming",
        food_safety: "Food safety",
        farm_to_table: "Farm to table",
        regular_farming: "Regular farming",
        farm_tools: "Farm tools",
      };
  return labels[category];
}

export function translationNotice(
  source: BlogTranslationResult["source"],
  locale: SupportedLocale,
  provenance?: BlogPublication["sourceProvenance"],
) {
  const ui = blogUi(locale);
  if (source === "ai_assisted_editorial_adaptation") return ui.aiAdaptation;
  const languageNotice = source === "reviewed_original"
    ? ui.reviewed
    : source === "ai_assisted_translation"
      ? ui.aiTranslation
      : ui.fallback;
  return provenance === "private_author_post"
    ? `${ui.aiAdaptation} ${languageNotice}`
    : languageNotice;
}

export function blogEditorialNote(
  publication: BlogPublication,
  locale: SupportedLocale,
) {
  if (publication.sourceProvenance !== "private_author_post") {
    return publication.editorialNote;
  }
  if (locale === "te-IN") {
    return "ఆర్గానిక్ ఇంటెలిజెన్స్ WhatsApp ఆర్కైవ్‌లో 20 సెప్టెంబర్–9 నవంబర్ 2026 మధ్య Narasimha Gonapa పోస్టుల ఆధారంగా AI సహాయంతో రూపొందించిన ఇంగ్లీష్, తెలుగు సంపాదకీయ అనుసరణ.";
  }
  if (locale === "hi-IN") {
    return "ऑर्गेनिक इंटेलिजेंस WhatsApp संग्रह में 20 सितंबर–9 नवंबर 2026 की Narasimha Gonapa की पोस्टों से AI की सहायता से तैयार अंग्रेज़ी और तेलुगु संपादकीय रूपांतरण।";
  }
  return publication.editorialNote;
}
