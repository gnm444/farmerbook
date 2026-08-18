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
  common: { demoBanner: englishMessages.common.demoBanner,  brand: "फार्मरबुक", continue: "अगाडि बढ्नुहोस्", back: "पछाडि", save: "सुरक्षित गर्नुहोस्", saving: "सुरक्षित हुँदैछ…", cancel: "रद्द गर्नुहोस्", skip: "अहिले छोड्नुहोस्", finish: "पूरा गर्नुहोस्", language: "भाषा", selectLanguage: "भाषा छान्नुहोस्", beta: "बिटा", optional: "वैकल्पिक", other: "अन्य" },
  auth: { ...englishMessages.auth,  signIn: "साइन इन गर्नुहोस्", signUp: "खाता बनाउनुहोस्", email: "इमेल ठेगाना", password: "पासवर्ड", google: "Google मार्फत अगाडि बढ्नुहोस्", facebook: "Facebook मार्फत अगाडि बढ्नुहोस्", forgotPassword: "पासवर्ड बिर्सनुभयो?", checkEmail: "खाता प्रमाणित गर्न आफ्नो इमेल हेर्नुहोस्।" },
  onboarding: { ...englishMessages.onboarding, title: "आफ्नो प्रोफाइल पूरा गर्नुहोस्", intro: "फार्मरबुकले तपाईंलाई कसरी मद्दत गर्न सक्छ भन्नुहोस्।", progress: "चरण {current} / {total}", roleQuestion: "तपाईं फार्मरबुक कसरी प्रयोग गर्नुहुन्छ?", farmer: "किसान", customer: "ग्राहक", wholesaler: "थोक व्यापारी", company: "कृषि कम्पनी", identity: "तपाईंको परिचय", location: "स्थान र सेवा क्षेत्र", categories: "खेतीका वर्ग", review: "समीक्षा गरी पूरा गर्नुहोस्", customCategory: "आफ्नो वर्ग लेख्नुहोस्", resume: "तपाईंको सुरक्षित प्रगति जारी राख्न तयार छ।", autosaved: "प्रगति सुरक्षित भयो" },
  profile: { ...englishMessages.profile, title: "प्रोफाइल र भाषा", fullName: "पूरा नाम", handle: "सार्वजनिक ह्यान्डल", district: "जिल्ला", state: "राज्य", bio: "छोटो परिचय", experience: "अनुभवका वर्ष", farmingMethod: "खेती विधि" },
  market: { ...englishMessages.market,  title: "बजार", produce: "कृषि उपज", equipment: "उपकरण र औजार", inputs: "कृषि सामग्री", services: "सेवा", offers: "अफर", search: "बजारमा खोज्नुहोस्", noResults: "मिल्ने कुनै सूची भेटिएन।", seller: "विक्रेता", price: "मूल्य" },
  companies: { ...englishMessages.companies, title: "कृषि कम्पनीहरू", organizationName: "संस्थाको नाम", companyType: "कम्पनीको प्रकार", serviceArea: "सेवा क्षेत्र", productsServices: "उत्पादन र सेवा", tractor: "ट्र्याक्टर र कृषि मेसिन", tools: "औजार र उपकरण", irrigation: "सिँचाइ र पानी प्रणाली", livestock: "पशुधन र कुखुरा सहायता", aquaculture: "जलकृषि र समुद्री खाद्य सहायता" },
  errors: { ...englishMessages.errors, generic: "केही गलत भयो। फेरि प्रयास गर्नुहोस्।", invalidLocale: "समर्थित भाषा छान्नुहोस्।", required: "यो जानकारी आवश्यक छ।", invalidEmail: "मान्य इमेल ठेगाना लेख्नुहोस्।", invalidHandle: "साना अंग्रेजी अक्षर, अंक र अन्डरस्कोर मात्र प्रयोग गर्नुहोस्।", network: "जडान जाँचेर फेरि प्रयास गर्नुहोस्।", profileSave: "भाषा यहाँ बदलियो, तर प्रोफाइलमा सुरक्षित हुन सकेन।", unauthorized: "यो रोजाइ प्रोफाइलमा सुरक्षित गर्न साइन इन गर्नुहोस्।", categoryRequired: "कम्तीमा एउटा वर्ग छान्नुहोस्।" },
  legal: { ...englishMessages.legal, terms: "सर्तहरू", privacy: "गोपनीयता सूचना", communityRules: "समुदायका नियम", consent: "म सर्तहरू, गोपनीयता सूचना र समुदायका नियममा सहमत छु।" },
} satisfies Messages;

export default messages;
