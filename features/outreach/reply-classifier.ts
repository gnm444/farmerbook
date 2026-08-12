export const outreachQuestionCodes = [
  "what_is_farmerbook",
  "how_to_join",
  "who_can_join",
  "cost",
  "privacy",
  "languages",
] as const;

export type OutreachQuestionCode = (typeof outreachQuestionCodes)[number];

const stopPhrases = new Set([
  "stop",
  "unsubscribe",
  "opt out",
  "do not contact",
  "don't contact",
  "not interested",
  "बंद करें",
  "संपर्क न करें",
  "थांबवा",
  "संपर्क करू नका",
  "বন্ধ করুন",
  "બંધ કરો",
  "ನಿಲ್ಲಿಸಿ",
  "നിർത്തുക",
  "நிறுத்து",
  "ఆపండి",
  "ਬੰਦ ਕਰੋ",
  "بند کریں",
  "ବନ୍ଦ କରନ୍ତୁ",
  "বন্ধ কৰক",
  "बंध करात",
  "बन्द गर्नुहोस्",
  "بند ڪريو",
  "بند کریو",
]);

function normalizedReply(value: string) {
  return value
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase("en-IN")
    .replace(/[.!?।]+$/u, "")
    .replace(/\s+/g, " ");
}

function includesAny(value: string, terms: readonly string[]) {
  return terms.some((term) => value.includes(term));
}

export type OutreachReplyClassification =
  | { intent: "stop"; questionCode: null; responseRequested: false }
  | {
      intent: "onboarding_question";
      questionCode: OutreachQuestionCode;
      responseRequested: true;
    }
  | { intent: "interested" | "other"; questionCode: null; responseRequested: false };

export function classifyOutreachReply(
  replyText: string,
): OutreachReplyClassification {
  const reply = normalizedReply(replyText.slice(0, 1_000));
  if (!reply || stopPhrases.has(reply)) {
    return reply
      ? { intent: "stop", questionCode: null, responseRequested: false }
      : { intent: "other", questionCode: null, responseRequested: false };
  }

  const questionMatchers: Array<[
    OutreachQuestionCode,
    readonly string[],
  ]> = [
    ["privacy", ["privacy", "data", "गोपनीयता", "डेटा"]],
    ["cost", ["cost", "fee", "fees", "price", "free", "शुल्क", "कीमत"]],
    ["languages", ["language", "languages", "भाषा", "भाषाएँ"]],
    ["who_can_join", ["who can", "eligible", "eligibility", "कौन जुड़"]],
    ["how_to_join", ["how", "join", "register", "sign up", "account", "कैसे", "जुड़"]],
    ["what_is_farmerbook", ["what is", "farmerbook", "क्या है"]],
  ];
  for (const [questionCode, terms] of questionMatchers) {
    if (includesAny(reply, terms)) {
      return {
        intent: "onboarding_question",
        questionCode,
        responseRequested: true,
      };
    }
  }
  if (includesAny(reply, ["yes", "interested", "tell me", "हाँ", "हो"])) {
    return { intent: "interested", questionCode: null, responseRequested: false };
  }
  return { intent: "other", questionCode: null, responseRequested: false };
}
