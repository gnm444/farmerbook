import type { Messages } from "../messages";
import englishMessages from "./en-IN";

const messages = {
  ecoSuppliers: englishMessages.ecoSuppliers,
  offers: englishMessages.offers,
  profilePreview: englishMessages.profilePreview,
  incSourcing: englishMessages.incSourcing,
  navigation: englishMessages.navigation,
  home: englishMessages.home,
  publicProfile: englishMessages.publicProfile,
  settings: englishMessages.settings,
  feed: englishMessages.feed,
  outreach: englishMessages.outreach,
  agricultureCategories: englishMessages.agricultureCategories,
  common: { demoBanner: englishMessages.common.demoBanner,  brand: "फार्मरबुक", continue: "आगाँ बढ़ू", back: "पाछाँ", save: "सहेजू", saving: "सहेजल जा रहल अछि…", cancel: "रद्द करू", skip: "एखन छोड़ू", finish: "पूरा करू", language: "भाषा", selectLanguage: "भाषा चुनू", beta: "बीटा", optional: "वैकल्पिक", other: "आन" },
  auth: { ...englishMessages.auth,  signIn: "साइन इन करू", signUp: "खाता बनाउ", email: "ईमेल पता", password: "पासवर्ड", google: "Google सँ आगाँ बढ़ू", facebook: "Facebook सँ आगाँ बढ़ू", forgotPassword: "पासवर्ड बिसरि गेलहुँ?", checkEmail: "खाता सत्यापित करबाक लेल ईमेल देखू।" },
  onboarding: { ...englishMessages.onboarding, title: "अपन प्रोफाइल पूरा करू", intro: "कहू जे फार्मरबुक अहाँक कोना सहायता कऽ सकैत अछि।", progress: "चरण {current} / {total}", roleQuestion: "अहाँ फार्मरबुकक उपयोग कोना करब?", farmer: "किसान", customer: "ग्राहक", wholesaler: "थोक व्यापारी", company: "कृषि कंपनी", identity: "अहाँक परिचय", location: "स्थान आ सेवा क्षेत्र", categories: "खेतीक श्रेणी", review: "समीक्षा कऽ पूरा करू", customCategory: "अपन श्रेणी लिखू", resume: "अहाँक सहेजल प्रगति जारी रखबाक लेल तैयार अछि।", autosaved: "प्रगति सहेजल गेल" },
  profile: { ...englishMessages.profile, title: "प्रोफाइल आ भाषा", fullName: "पूरा नाम", handle: "सार्वजनिक हैंडल", district: "जिला", state: "राज्य", bio: "संक्षिप्त परिचय", experience: "अनुभवक वर्ष", farmingMethod: "खेतीक विधि" },
  market: { ...englishMessages.market,  title: "बजार", produce: "कृषि उपज", equipment: "उपकरण आ औजार", inputs: "कृषि सामग्री", services: "सेवा", offers: "प्रस्ताव", search: "बजारमे खोजू", noResults: "मेल खाइत कोनो सूची नहि भेटल।", seller: "विक्रेता", price: "दाम" },
  companies: { ...englishMessages.companies, title: "कृषि कंपनी", organizationName: "संस्थाक नाम", companyType: "कंपनीक प्रकार", serviceArea: "सेवा क्षेत्र", productsServices: "उत्पाद आ सेवा", tractor: "ट्रैक्टर आ कृषि मशीन", tools: "औजार आ उपकरण", irrigation: "सिंचाइ आ जल व्यवस्था", livestock: "पशुधन आ कुक्कुट सहायता", aquaculture: "जलीय कृषि आ समुद्री खाद्य सहायता" },
  errors: { ...englishMessages.errors, generic: "किछु गलत भेल। फेर प्रयास करू।", invalidLocale: "समर्थित भाषा चुनू।", required: "ई जानकारी आवश्यक अछि।", invalidEmail: "मान्य ईमेल पता लिखू।", invalidHandle: "केवल छोट अंग्रेजी अक्षर, अंक आ अंडरस्कोर उपयोग करू।", network: "अपन कनेक्शन जाँचि फेर प्रयास करू।", profileSave: "भाषा एतय बदलल, मुदा प्रोफाइलमे सहेजल नहि जा सकल।", unauthorized: "ई विकल्प प्रोफाइलमे सहेजबाक लेल साइन इन करू।", categoryRequired: "कम सँ कम एक श्रेणी चुनू।" },
  legal: { ...englishMessages.legal, terms: "शर्त", privacy: "गोपनीयता सूचना", communityRules: "समुदायक नियम", consent: "हम शर्त, गोपनीयता सूचना आ समुदायक नियम सँ सहमत छी।" },
} satisfies Messages;

export default messages;
