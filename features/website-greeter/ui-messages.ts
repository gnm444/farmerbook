import type { WebsiteGreeterReleaseLocale } from "./locales";

type GreeterUiMessages = {
  asideLabel: string;
  welcome: string;
  quickQuestions: readonly string[];
  title: string;
  status: string;
  close: string;
  languageLabel: string;
  canaryStatusTitle: string;
  canaryStatusBody: string;
  contextLabel: string;
  contextHelp: string;
  privacyWithContext: string;
  commonQuestions: string;
  thinking: string;
  inputLabel: string;
  inputPlaceholder: string;
  sessionComplete: string;
  send: string;
  privacy: string;
  repliesLeft: (remaining: number) => string;
  followup: string;
  followupConsent: string;
  launcherTitle: string;
  launcherSubtitle: string;
  unavailable: (email: string, phone: string) => string;
  emailAction: string;
  callAction: string;
};

export const WEBSITE_GREETER_LOCALE_OPTIONS = [
  { value: "en-IN", label: "English" },
  { value: "te-IN", label: "తెలుగు" },
  { value: "hi-IN", label: "हिन्दी" },
] as const satisfies ReadonlyArray<{
  value: WebsiteGreeterReleaseLocale;
  label: string;
}>;

const messages = {
  "en-IN": {
    asideLabel: "FarmerBook customer greeting agent",
    welcome: "Namaste! Welcome to FarmerBook. I can help you join, buy produce, sell a harvest, understand verification or reach our team. If you want a follow-up, you can choose to share your contact details through our secure form.",
    quickQuestions: [
      "I want to sell produce",
      "I want to buy produce",
      "How do I join?",
      "Organic certification",
    ],
    title: "FarmerBook greeter",
    status: "AI agent · 24/7 · budget protected",
    close: "Close greeting agent",
    languageLabel: "Chat language",
    canaryStatusTitle: "Protected Google canary",
    canaryStatusBody: "This page uses Google Agent Engine only when the server-only canary gate and workload identity are ready. Otherwise it automatically keeps FarmerBook’s approved answers, Cloudflare fallback, and safe contact handoff.",
    contextLabel: "Use earlier messages in this chat",
    contextHelp: "Off by default. If enabled, redacted context is kept for up to 24 hours for this anonymous session. Turn it off to request deletion.",
    privacyWithContext: "Redacted context is kept for up to 24 hours for this anonymous session.",
    commonQuestions: "Common questions",
    thinking: "Thinking…",
    inputLabel: "Ask FarmerBook",
    inputPlaceholder: "Ask about FarmerBook…",
    sessionComplete: "Session complete",
    send: "Send question",
    privacy: "No personal details or message text are stored here.",
    repliesLeft: (remaining) => `${remaining} replies left`,
    followup: "Want us to contact you? Request a follow-up →",
    followupConsent: "You choose what to share and whether FarmerBook may follow up.",
    launcherTitle: "Namaste!",
    launcherSubtitle: "Ask FarmerBook · 24/7",
    unavailable: (email, phone) =>
      `I’m temporarily unavailable. Please email ${email} or call ${phone}.`,
    emailAction: "Email the CEO",
    callAction: "Call FarmerBook",
  },
  "te-IN": {
    asideLabel: "FarmerBook వినియోగదారు సహాయకుడు",
    welcome: "నమస్తే! FarmerBook‌కు స్వాగతం. చేరడం, పంట ఉత్పత్తులు కొనడం లేదా అమ్మడం, ధృవీకరణను అర్థం చేసుకోవడం, మా బృందాన్ని సంప్రదించడం వంటి విషయాల్లో నేను సహాయం చేయగలను. మీరు తిరిగి సంప్రదించాలని కోరుకుంటే, మా సురక్షిత ఫారమ్‌లో మీ వివరాలను పంచుకోవచ్చు.",
    quickQuestions: [
      "నేను పంట ఉత్పత్తులు అమ్మాలనుకుంటున్నాను",
      "నేను పంట ఉత్పత్తులు కొనాలనుకుంటున్నాను",
      "ఎలా చేరాలి?",
      "సేంద్రీయ ధృవీకరణ",
    ],
    title: "FarmerBook సహాయకుడు",
    status: "AI సహాయకుడు · 24/7 · ఖర్చు పరిమితితో",
    close: "సహాయకుడిని మూసివేయండి",
    languageLabel: "చాట్ భాష",
    canaryStatusTitle: "రక్షిత Google కానరీ",
    canaryStatusBody: "సర్వర్‌లో మాత్రమే ఉండే కానరీ గేట్ మరియు వర్క్‌లోడ్ గుర్తింపు సిద్ధంగా ఉన్నప్పుడు మాత్రమే ఈ పేజీ Google Agent Engine‌ను ఉపయోగిస్తుంది. లేకపోతే FarmerBook ఆమోదించిన సమాధానాలు, Cloudflare ప్రత్యామ్నాయం లేదా సురక్షిత సంప్రదింపు మార్గాన్ని స్వయంచాలకంగా కొనసాగిస్తుంది.",
    contextLabel: "ఈ చాట్‌లోని మునుపటి సందేశాలను ఉపయోగించండి",
    contextHelp: "ఇది డిఫాల్ట్‌గా ఆఫ్‌లో ఉంటుంది. ఆన్ చేస్తే, వ్యక్తిగత వివరాలు తొలగించిన సందర్భం ఈ అజ్ఞాత సెషన్ కోసం గరిష్ఠంగా 24 గంటలు ఉంచబడుతుంది. తొలగించమని అభ్యర్థించడానికి దీన్ని ఆఫ్ చేయండి.",
    privacyWithContext: "తొలగించాల్సిన వివరాలు తీసివేసిన చాట్ సందర్భం ఈ అజ్ఞాత సెషన్ కోసం గరిష్ఠంగా 24 గంటలు ఉంచబడుతుంది.",
    commonQuestions: "సాధారణ ప్రశ్నలు",
    thinking: "ఆలోచిస్తోంది…",
    inputLabel: "FarmerBook‌ను అడగండి",
    inputPlaceholder: "FarmerBook గురించి అడగండి…",
    sessionComplete: "సంభాషణ పూర్తయింది",
    send: "ప్రశ్న పంపండి",
    privacy: "వ్యక్తిగత వివరాలు లేదా సందేశ పాఠం ఇక్కడ నిల్వ చేయబడవు.",
    repliesLeft: (remaining) => `మిగిలిన సమాధానాలు: ${remaining}`,
    followup: "మేము మిమ్మల్ని సంప్రదించాలా? అభ్యర్థన పంపండి →",
    followupConsent: "ఏ వివరాలు పంచుకోవాలో, FarmerBook మిమ్మల్ని సంప్రదించవచ్చో మీరు నిర్ణయిస్తారు.",
    launcherTitle: "నమస్తే!",
    launcherSubtitle: "FarmerBook‌ను అడగండి · 24/7",
    unavailable: (email, phone) =>
      `ప్రస్తుతం నేను అందుబాటులో లేను. ${email}కు ఇమెయిల్ చేయండి లేదా ${phone}కు కాల్ చేయండి.`,
    emailAction: "CEOకు ఇమెయిల్ చేయండి",
    callAction: "FarmerBook‌కు కాల్ చేయండి",
  },
  "hi-IN": {
    asideLabel: "FarmerBook ग्राहक सहायक",
    welcome: "नमस्ते! FarmerBook में आपका स्वागत है। मैं जुड़ने, उपज खरीदने या बेचने, सत्यापन समझने और हमारी टीम से संपर्क करने में मदद कर सकता हूँ। यदि आप चाहते हैं कि हम आपसे संपर्क करें, तो आप हमारे सुरक्षित फ़ॉर्म में अपनी जानकारी साझा कर सकते हैं।",
    quickQuestions: [
      "मैं उपज बेचना चाहता हूँ",
      "मैं उपज खरीदना चाहता हूँ",
      "मैं कैसे जुड़ूँ?",
      "जैविक प्रमाणन",
    ],
    title: "FarmerBook सहायक",
    status: "AI सहायक · 24/7 · खर्च सुरक्षित",
    close: "सहायक बंद करें",
    languageLabel: "चैट की भाषा",
    canaryStatusTitle: "सुरक्षित Google कैनरी",
    canaryStatusBody: "यह पेज Google Agent Engine का उपयोग केवल तब करता है जब सर्वर-केवल कैनरी गेट और वर्कलोड पहचान तैयार हों। अन्यथा FarmerBook के स्वीकृत उत्तर, Cloudflare फ़ॉलबैक और सुरक्षित संपर्क विकल्प अपने आप बने रहते हैं।",
    contextLabel: "इस चैट के पिछले संदेशों का उपयोग करें",
    contextHelp: "यह डिफ़ॉल्ट रूप से बंद है। चालू करने पर निजी विवरण हटाकर संदर्भ इस गुमनाम सत्र के लिए अधिकतम 24 घंटे रखा जाता है। हटाने का अनुरोध करने के लिए इसे बंद करें।",
    privacyWithContext: "निजी विवरण हटाकर चैट संदर्भ इस गुमनाम सत्र के लिए अधिकतम 24 घंटे रखा जाता है।",
    commonQuestions: "सामान्य प्रश्न",
    thinking: "सोच रहा है…",
    inputLabel: "FarmerBook से पूछें",
    inputPlaceholder: "FarmerBook के बारे में पूछें…",
    sessionComplete: "बातचीत पूरी हुई",
    send: "प्रश्न भेजें",
    privacy: "व्यक्तिगत जानकारी या संदेश का पाठ यहाँ संग्रहीत नहीं होता।",
    repliesLeft: (remaining) => `${remaining} उत्तर शेष`,
    followup: "क्या हम आपसे संपर्क करें? अनुरोध भेजें →",
    followupConsent: "क्या साझा करना है और FarmerBook आपसे संपर्क कर सकता है या नहीं, यह आप तय करते हैं।",
    launcherTitle: "नमस्ते!",
    launcherSubtitle: "FarmerBook से पूछें · 24/7",
    unavailable: (email, phone) =>
      `मैं अभी उपलब्ध नहीं हूँ। ${email} पर ईमेल करें या ${phone} पर कॉल करें।`,
    emailAction: "CEO को ईमेल करें",
    callAction: "FarmerBook को कॉल करें",
  },
} as const satisfies Record<WebsiteGreeterReleaseLocale, GreeterUiMessages>;

export function websiteGreeterUiMessages(locale: WebsiteGreeterReleaseLocale) {
  return messages[locale];
}
