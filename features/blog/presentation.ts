import type { SupportedLocale } from "@/lib/i18n/locales";
import type { BlogPublication, BlogTranslationResult } from "./contracts";

const teluguUi = {
  collectionEyebrow: "ఫార్మర్‌బుక్ వ్యవసాయ గ్రంథాలయం",
  collectionTitle: "పొలానికి ఉపయోగపడే ఆధారపూర్వక కథనాలు",
  collectionLede:
    "ప్రకృతి వ్యవసాయం, సురక్షిత ఆహారం, రైతు నుంచి వినియోగదారుని వరకు నమ్మకంపై ప్రాయోగిక వ్యాసాలు—మూలాలు, పరిమితులు, తనిఖీ చేయగల ప్రశ్నలతో.",
  readArticle: "వ్యాసం చదవండి",
  backToBlog: "అన్ని వ్యాసాలు",
  sources: "మూలాలు మరియు మరింత చదవడానికి",
  safety: "ముఖ్యమైన సూచన",
  editorial: "సంపాదకీయ గమనిక",
  reviewed: "సంపాదకీయంగా సమీక్షించిన భాష",
  aiTranslation:
    "AI సహాయంతో అనువదించబడింది; స్థానిక భాష నిపుణుడి సమీక్ష ఇంకా జరగలేదు. సందేహం ఉంటే తెలుగు లేదా Indian English అసలును చూడండి.",
  fallback:
    "ఈ భాషలో అనువాదం ప్రస్తుతం అందుబాటులో లేదు; సమీక్షించిన Indian English అసలు చూపిస్తున్నాం.",
  minutes: "నిమిషాల పఠనం",
};

const englishUi = {
  collectionEyebrow: "FarmerBook field library",
  collectionTitle: "Evidence-aware ideas for the field",
  collectionLede:
    "Practical articles about natural farming, safe food and farmer-to-consumer trust—with sources, limitations and questions that can be checked.",
  readArticle: "Read article",
  backToBlog: "All articles",
  sources: "Sources and further reading",
  safety: "Important guidance",
  editorial: "Editorial note",
  reviewed: "Editorially reviewed language",
  aiTranslation:
    "AI-assisted translation; native-speaker review is still pending. Refer to the Telugu or Indian English original if anything is unclear.",
  fallback:
    "Translation is temporarily unavailable in this language; the reviewed Indian English original is shown.",
  minutes: "minute read",
};

export function blogUi(locale: SupportedLocale) {
  return locale === "te-IN" ? teluguUi : englishUi;
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
) {
  const ui = blogUi(locale);
  if (source === "reviewed_original") return ui.reviewed;
  if (source === "ai_assisted_translation") return ui.aiTranslation;
  return ui.fallback;
}
