import {
  AGRICULTURE_ACTOR_TYPES,
  type AgricultureActorCounts,
  type AgricultureActorType,
  type AgricultureContentAnalysis,
  type AgricultureTopicSlug,
} from "./types";

type TopicDefinition = {
  slug: AgricultureTopicSlug;
  pattern: RegExp;
};

const topicDefinitions: readonly TopicDefinition[] = [
  { slug: "paddy", pattern: /\b(?:paddy|rice cultivation)\b|వరి|धान|चावल/iu },
  { slug: "tomato", pattern: /\btomato(?:es)?\b|టమాట|टमाटर/iu },
  { slug: "papaya", pattern: /\bpapaya\b|బొప్పాయి|पपीता/iu },
  { slug: "maize", pattern: /\b(?:maize|corn)\b|మొక్క\s*జొన్న|मक्का/iu },
  { slug: "cotton", pattern: /\bcotton\b|పత్తి|कपास/iu },
  { slug: "oil-palm", pattern: /\b(?:oil\s*palm|palm\s*oil)\b|పామాయిల్/iu },
  { slug: "arecanut", pattern: /\b(?:arecanut|betel\s*nut)\b|వక్క/iu },
  { slug: "vegetables", pattern: /\bvegetable(?:s)?\b|కూరగాయ|सब्ज/iu },
  { slug: "brinjal", pattern: /\b(?:brinjal|eggplant|aubergine)\b|వంకాయ|बैंगन/iu },
  { slug: "mango", pattern: /\bmango(?:es)?\b|మామిడి|आम(?:\s|$)/iu },
  { slug: "guava", pattern: /\bguava\b|జామ|अमरूद/iu },
  { slug: "sandalwood", pattern: /\bsandalwood\b|శ్రీగంధం|चंदन/iu },
  { slug: "fodder", pattern: /\b(?:fodder|forage|grass seed)\b|గడ్డి\s*విత్తన|चारा/iu },
  { slug: "seed-production", pattern: /\bseed(?:s| production)?\b|విత్తన|बीज/iu },
  { slug: "sheep", pattern: /\b(?:sheep|ram|rams)\b|గొర్రె|పొట్టేళ|भेड़/iu },
  { slug: "goats", pattern: /\bgoat(?:s)?\b|మేక|बकरी/iu },
  { slug: "poultry", pattern: /\b(?:poultry|chicken|hen|native birds?)\b|కోళ|मुर्ग/iu },
  { slug: "dairy", pattern: /\b(?:dairy|milk|cattle|cow|buffalo)\b|పాడి|ఆవు|గేదె|डेयरी/iu },
  { slug: "aquaculture", pattern: /\b(?:aquaculture|fish farming|fishery|fisheries)\b|చేపల\s*పెంపకం|मत्स्य/iu },
  { slug: "beekeeping", pattern: /\b(?:beekeep|apiary|honey bee)\w*\b|తేనెటీగ|मधुमक्ख/iu },
  { slug: "sericulture", pattern: /\bsericulture\b|పట్టు\s*పురుగ|रेशम/iu },
  { slug: "intercropping", pattern: /\bintercropp?ing\b|అంతరపంట|अंतरवर्तीय/iu },
  { slug: "organic-farming", pattern: /\borganic farming\b|సేంద్రియ\s*వ్యవసాయం|जैविक\s*खेती/iu },
  { slug: "natural-farming", pattern: /\bnatural farming\b|ప్రకృతి\s*వ్యవసాయం|प्राकृतिक\s*खेती/iu },
  { slug: "drip-irrigation", pattern: /\bdrip(?: irrigation| fertilizer)?\b|డ్రిప్|टपक\s*सिंचाई/iu },
  { slug: "drone-spraying", pattern: /\b(?:agricultur\w+\s+)?drone(?: sprayer| spraying)?s?\b|డ్రోన్\s*స్ప్రేయ/iu },
  { slug: "nursery", pattern: /\b(?:plant )?nurser(?:y|ies)\b|నర్సరీ|पौधशाला/iu },
  { slug: "integrated-pest-management", pattern: /\b(?:integrated pest management|pheromone trap|fruit fly trap|sticky trap)\b|ఫెరోమోన్|కీటక|समेकित कीट/iu },
  { slug: "protected-cultivation", pattern: /\b(?:polyhouse|greenhouse|protected cultivation)\b|పాలీహౌస్|संरक्षित खेती/iu },
  { slug: "farm-mechanization", pattern: /\b(?:farm machinery|harvester|agri tools?|farm equipment)\b|హార్వెస్టర్|వ్యవసాయ\s*పరికర|कृषि यंत्र/iu },
] as const;

const generalAgriculturePattern = /\b(?:agriculture|agricultural|farmer|farming|farm|crop|cultivation|horticulture|livestock|orchard|harvest|yield)\b|రైతు|వ్యవసాయం|సాగు|పంట|కృషి|किसान|खेती|कृषि|फसल/iu;

const actorPatterns: Record<AgricultureActorType, RegExp> = {
  farmer: /\b(?:farmer|farmers|grower|growers|cultivator|cultivators)\b|రైతు(?:లు)?|किसान(?:ों)?/giu,
  organization: /\b(?:company|companies|organization|organisation|cooperative|producer company|fpo|nursery)\b|సంస్థ|కంపెనీ|संगठन|कंपनी/giu,
  official: /\b(?:official|officer|department representative|government representative)\b|అధికారి|अधिकारी/giu,
  scientist: /\b(?:scientist|agronomist|researcher|horticulturist)\b|శాస్త్రవేత్త|वैज्ञानिक/giu,
  trader: /\b(?:trader|traders|dealer|dealers|merchant|merchants)\b|వ్యాపారి|व्यापारी/giu,
};

function occurrenceCount(text: string, pattern: RegExp) {
  return Math.min(25, Array.from(text.matchAll(pattern)).length);
}

export function analyzeAgricultureContent(input: {
  title: string;
  description: string;
}): AgricultureContentAnalysis {
  const text = `${input.title.normalize("NFKC")}\n${input.description.normalize("NFKC")}`;
  const topicSlugs = topicDefinitions
    .filter((definition) => definition.pattern.test(text))
    .map((definition) => definition.slug);
  const actorCounts = Object.fromEntries(
    AGRICULTURE_ACTOR_TYPES.map((actorType) => [
      actorType,
      occurrenceCount(text, actorPatterns[actorType]),
    ]),
  ) as AgricultureActorCounts;
  const agricultureRelated =
    topicSlugs.length > 0 || generalAgriculturePattern.test(text);
  if (agricultureRelated && topicSlugs.length === 0) {
    topicSlugs.push("general-agriculture");
  }
  return { agricultureRelated, topicSlugs, actorCounts };
}
