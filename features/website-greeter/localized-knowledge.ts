import {
  FARMERBOOK_CONTACT_EMAIL,
  FARMERBOOK_CONTACT_PHONE,
  FARMERBOOK_CONTACT_PHONE_DISPLAY,
} from "@/lib/contact";
import type { WebsiteGreeterAction } from "./contracts";
import type { WebsiteGreeterReleaseLocale } from "./locales";

type LocalizedLocale = Exclude<WebsiteGreeterReleaseLocale, "en-IN">;
type LocalizedAnswer = { text: string; actions: WebsiteGreeterAction[] };

const copy = {
  "te-IN": {
    contact: `FarmerBook‌ను ${FARMERBOOK_CONTACT_EMAIL} లేదా ${FARMERBOOK_CONTACT_PHONE_DISPLAY} ద్వారా సంప్రదించవచ్చు.`,
    organic: "సేంద్రీయ ధృవీకరణ పత్రాలు అప్‌లోడ్ చేసి ధృవీకరించిన తర్వాత మాత్రమే FarmerBook ‘Certified organic’ అని చూపిస్తుంది. అప్పటివరకు ప్రొఫైల్ ‘Non-certified organic farmer (paperwork not yet completed to prove certification)’ అని చూపిస్తుంది.",
    fees: "ప్రత్యక్ష మార్కెట్ విచారణలపై FarmerBook ప్లాట్‌ఫారమ్ కమిషన్ వసూలు చేయదు. వేరే చెల్లింపు సేవ ఉంటే, మీరు ఎంచుకునే ముందు స్పష్టంగా తెలియజేస్తాము.",
    sell: "రైతులు వృత్తిపరమైన ప్రొఫైల్ సృష్టించి, ప్రస్తుత పంట లాట్లను ప్రచురించి, కొనుగోలుదారుల నుండి నేరుగా విచారణలు పొందవచ్చు. Farmer ఖాతా సృష్టించడం ద్వారా ప్రారంభించండి.",
    buy: "వినియోగదారులు ప్రస్తుత ఉత్పత్తులను చూడవచ్చు, రైతు అందించిన ప్రొఫైల్‌ను పరిశీలించవచ్చు, లిస్టింగ్ నుండి నేరుగా ప్రైవేట్ విచారణ ప్రారంభించవచ్చు.",
    join: "చేరేటప్పుడు Farmer, Customer, Wholesaler లేదా agricultural business ఎంచుకోండి. మీరు పండించే, కొనుగోలు చేసే లేదా సరఫరా చేసే విధానానికి తగిన ఖాతా సాధనాలు లభిస్తాయి.",
    verify: "FarmerBook తనిఖీ చేసిన విషయాలనే ధృవీకరించబడినవిగా చూపిస్తుంది. ధృవీకరించబడిన సభ్యుడి బ్యాడ్జ్ సేంద్రీయ ధృవీకరణ పత్రం, హామీ లేదా ప్రభుత్వ గుర్తింపు పత్రం కాదు.",
    business: "టోకు వ్యాపారులు భారీ లభ్యతను ప్రచురించవచ్చు; వ్యవసాయ వ్యాపారాలు FarmerBook ప్రొఫైల్ ద్వారా తమ సేవలు మరియు సోర్సింగ్ అవసరాలను చూపించవచ్చు.",
    hello: "నమస్తే! FarmerBook‌కు స్వాగతం. చేరడం, ఉత్పత్తులు కొనడం లేదా అమ్మడం, ధృవీకరణను అర్థం చేసుకోవడం, మా బృందాన్ని సంప్రదించడం వంటి విషయాల్లో సహాయం చేయగలను.",
    licence: "FarmerBook బలమైన AGPL-3.0 కాపీలెఫ్ట్ లైసెన్స్‌తో ఓపెన్ సోర్స్‌గా ఉంది. లైసెన్స్ నిబంధనలు పాటించినప్పుడే కాపీ చేయడం, మార్చడం, పంచడం అనుమతించబడతాయి; FarmerBook బ్రాండ్ పునర్వినియోగానికి అనుమతి లేదు.",
    labels: {
      email: "CEOకు ఇమెయిల్ చేయండి", call: "FarmerBook‌కు కాల్ చేయండి",
      profile: "నా ప్రొఫైల్ నిర్వహించండి", marketplace: "మార్కెట్‌ను చూడండి",
      createFarmer: "Farmer ప్రొఫైల్ సృష్టించండి", sample: "నమూనా ప్రొఫైల్ చూడండి",
      browse: "ఉత్పత్తులు చూడండి", join: "FarmerBook‌లో చేరండి", signIn: "సైన్ ఇన్ చేయండి",
      rules: "సమాజ నియమాలు", privacy: "గోప్యత", licence: "లైసెన్స్ చదవండి",
    },
    session: "ఈ చిన్న సంభాషణ పూర్తయింది.",
    budget: "సహాయకుడు ప్రస్తుతం తన సురక్షిత వినియోగ పరిమితిని చేరుకున్నాడు.",
    uncertain: "దీనికి సురక్షితంగా సమాధానం ఇవ్వగలనని నాకు తగిన నమ్మకం లేదు.",
    contactPrompt: `దయచేసి FarmerBook‌ను ${FARMERBOOK_CONTACT_EMAIL} లేదా ${FARMERBOOK_CONTACT_PHONE_DISPLAY} ద్వారా సంప్రదించండి.`,
  },
  "hi-IN": {
    contact: `FarmerBook से ${FARMERBOOK_CONTACT_EMAIL} या ${FARMERBOOK_CONTACT_PHONE_DISPLAY} पर संपर्क करें।`,
    organic: "FarmerBook ‘Certified organic’ तभी दिखाता है जब जैविक प्रमाणपत्र के दस्तावेज़ अपलोड होकर सत्यापित हो जाएँ। तब तक प्रोफ़ाइल पर ‘Non-certified organic farmer (paperwork not yet completed to prove certification)’ लिखा रहता है।",
    fees: "FarmerBook सीधे मार्केटप्लेस पूछताछ पर प्लेटफ़ॉर्म कमीशन नहीं लेता। कोई अलग सशुल्क सेवा हो तो आपके चुनने से पहले स्पष्ट रूप से बताया जाएगा।",
    sell: "किसान पेशेवर प्रोफ़ाइल बना सकते हैं, मौजूदा फ़सल लॉट प्रकाशित कर सकते हैं और खरीदारों से सीधे पूछताछ पा सकते हैं। Farmer खाता बनाकर शुरू करें।",
    buy: "ग्राहक मौजूदा उपज देख सकते हैं, किसान द्वारा दी गई प्रोफ़ाइल की समीक्षा कर सकते हैं और लिस्टिंग से सीधे निजी पूछताछ शुरू कर सकते हैं।",
    join: "जुड़ते समय Farmer, Customer, Wholesaler या agricultural business चुनें। खाते के साधन आपके उगाने, खरीदने या आपूर्ति करने के तरीके के अनुसार मिलेंगे।",
    verify: "FarmerBook केवल उन्हीं दावों को सत्यापित बताता है जिनकी उसने जाँच की है। सत्यापित सदस्य बैज जैविक प्रमाणपत्र, गारंटी या सरकारी पहचान पत्र नहीं है।",
    business: "थोक विक्रेता बड़ी मात्रा की उपलब्धता प्रकाशित कर सकते हैं, और कृषि व्यवसाय अपनी सेवाएँ तथा सोर्सिंग ज़रूरतें FarmerBook प्रोफ़ाइल के माध्यम से दिखा सकते हैं।",
    hello: "नमस्ते! FarmerBook में आपका स्वागत है। मैं जुड़ने, उपज खरीदने या बेचने, सत्यापन समझने और हमारी टीम से संपर्क करने में मदद कर सकता हूँ।",
    licence: "FarmerBook मजबूत AGPL-3.0 कॉपीलेफ्ट लाइसेंस के अंतर्गत ओपन सोर्स है। कॉपी, बदलाव और पुनर्वितरण तभी अनुमत हैं जब लाइसेंस की शर्तें पूरी हों; FarmerBook ब्रांड के पुनः उपयोग की अनुमति नहीं है।",
    labels: {
      email: "CEO को ईमेल करें", call: "FarmerBook को कॉल करें",
      profile: "मेरी प्रोफ़ाइल प्रबंधित करें", marketplace: "मार्केटप्लेस देखें",
      createFarmer: "Farmer प्रोफ़ाइल बनाएँ", sample: "नमूना प्रोफ़ाइल देखें",
      browse: "उपज देखें", join: "FarmerBook से जुड़ें", signIn: "साइन इन करें",
      rules: "समुदाय नियम", privacy: "गोपनीयता", licence: "लाइसेंस पढ़ें",
    },
    session: "यह छोटी बातचीत पूरी हो गई है।",
    budget: "सहायक अभी अपनी सुरक्षित उपयोग सीमा तक पहुँच गया है।",
    uncertain: "मुझे भरोसा नहीं है कि मैं इसका सुरक्षित उत्तर दे सकता हूँ।",
    contactPrompt: `कृपया FarmerBook से ${FARMERBOOK_CONTACT_EMAIL} या ${FARMERBOOK_CONTACT_PHONE_DISPLAY} पर संपर्क करें।`,
  },
} as const;

function contactActions(locale: LocalizedLocale): WebsiteGreeterAction[] {
  return [
    { label: copy[locale].labels.email, href: `mailto:${FARMERBOOK_CONTACT_EMAIL}` },
    { label: copy[locale].labels.call, href: `tel:${FARMERBOOK_CONTACT_PHONE}` },
  ];
}

function matches(value: string, expressions: RegExp[]) {
  return expressions.some((expression) => expression.test(value));
}

export function localizedApprovedGreeterAnswer(
  message: string,
  locale: LocalizedLocale,
): LocalizedAnswer | null {
  const value = message.trim().toLowerCase();
  const localeCopy = copy[locale];

  if (matches(value, [/\b(contact|email|phone|call|support)\b/, /संपर्क|फ़ोन|ईमेल|फोन/, /సంప్రదించ|ఫోన్|ఇమెయిల్|సహాయం/])) {
    return { text: localeCopy.contact, actions: contactActions(locale) };
  }
  if (matches(value, [/\b(organic|certificate|certification)\b/, /जैविक|प्रमाणन|प्रमाणपत्र/, /సేంద్రీయ|సర్టిఫికేట్|ప్రమాణపత్రం/])) {
    return { text: localeCopy.organic, actions: [{ label: localeCopy.labels.profile, href: "/settings/profile" }] };
  }
  if (matches(value, [/\b(commission|fees?|cost|pricing)\b/, /कमीशन|शुल्क|खर्च|कीमत/, /కమిషన్|రుసుము|ఖర్చు|ధర/])) {
    return { text: localeCopy.fees, actions: [{ label: localeCopy.labels.marketplace, href: "/marketplace" }] };
  }
  if (matches(value, [/\b(sell|seller|harvest|listing)\b/, /बेच|फ़सल|किसान प्रोफ़ाइल/, /అమ్మ|రైతు ప్రొఫైల్/])) {
    return { text: localeCopy.sell, actions: [
      { label: localeCopy.labels.createFarmer, href: "/signup" },
      { label: localeCopy.labels.sample, href: "/profile/example" },
    ] };
  }
  if (matches(value, [/\b(buy|buyer|customer|purchase|marketplace)\b/, /खरीद|खरीदार|ग्राहक/, /కొన|కొనుగోలుదారు|వినియోగదారు/])) {
    return { text: localeCopy.buy, actions: [{ label: localeCopy.labels.browse, href: "/marketplace" }] };
  }
  if (matches(value, [/\b(join|sign ?up|register|account|login)\b/, /जुड़|पंजीकरण|खाता|लॉगिन/, /చేర|నమోదు|ఖాతా|లాగిన్/])) {
    return { text: localeCopy.join, actions: [
      { label: localeCopy.labels.join, href: "/signup" },
      { label: localeCopy.labels.signIn, href: "/login" },
    ] };
  }
  if (matches(value, [/\b(verify|verified|trust|safe|identity)\b/, /सत्यापन|सत्यापित|भरोसा|सुरक्षित|पहचान/, /ధృవీకరణ|నమ్మకం|సురక్షిత|గుర్తింపు/])) {
    return { text: localeCopy.verify, actions: [
      { label: localeCopy.labels.rules, href: "/community-rules" },
      { label: localeCopy.labels.privacy, href: "/privacy" },
    ] };
  }
  if (matches(value, [/\b(wholesale|business|company|export|supplier)\b/, /थोक|व्यवसाय|कंपनी|निर्यात|आपूर्तिकर्ता/, /టోకు|వ్యాపారం|కంపెనీ|ఎగుమతి|సరఫరాదారు/])) {
    return { text: localeCopy.business, actions: [{ label: localeCopy.labels.join, href: "/signup" }] };
  }
  if (matches(value, [/\b(licen[cs]e|open[ -]?source|copyright|agpl)\b/, /लाइसेंस|ओपन[ -]?सोर्स|कॉपीराइट/, /లైసెన్స్|ఓపెన్[ -]?సోర్స్|కాపీరైట్/])) {
    return { text: localeCopy.licence, actions: [{ label: localeCopy.labels.licence, href: "/license" }] };
  }
  if (matches(value, [/\b(hello|hi|namaste|namaskar)\b/, /नमस्ते|नमस्कार/, /నమస్తే|నమస్కారం/])) {
    return { text: localeCopy.hello, actions: [
      { label: localeCopy.labels.browse, href: "/marketplace" },
      { label: localeCopy.labels.join, href: "/signup" },
    ] };
  }
  return null;
}

export function localizedSafeHandoffAnswer(
  reason: "budget" | "session" | undefined,
  locale: LocalizedLocale,
): LocalizedAnswer {
  const localeCopy = copy[locale];
  const prefix = reason === "budget"
    ? localeCopy.budget
    : reason === "session"
      ? localeCopy.session
      : localeCopy.uncertain;
  return {
    text: `${prefix} ${localeCopy.contactPrompt}`,
    actions: contactActions(locale),
  };
}
