import type { Messages } from "../messages";
import englishMessages from "./en-IN";

const messages = {
  ecoSuppliers: englishMessages.ecoSuppliers,
  offers: englishMessages.offers,
  profilePreview: englishMessages.profilePreview,
  incSourcing: englishMessages.incSourcing,
  farmVisits: englishMessages.farmVisits,
  navigation: englishMessages.navigation,
  home: englishMessages.home,
  publicProfile: englishMessages.publicProfile,
  settings: englishMessages.settings,
  feed: englishMessages.feed,
  outreach: englishMessages.outreach,
  agricultureCategories: englishMessages.agricultureCategories,
  common: { demoBanner: englishMessages.common.demoBanner,  brand: "फार्मरबुक", continue: "अग्गें चलो", back: "पिच्छें", save: "सहेजो", saving: "सहेजेआ जा करदा…", cancel: "रद्द करो", skip: "हून छोड़ी देओ", finish: "पूरा करो", language: "भाशा", selectLanguage: "भाशा चुनो", beta: "बीटा", optional: "वैकल्पिक", other: "होर" },
  auth: { ...englishMessages.auth,  signIn: "साइन इन करो", signUp: "खाता बनाओ", email: "ईमेल पता", password: "पासवर्ड", google: "Google कन्नै अग्गें चलो", facebook: "Facebook कन्नै अग्गें चलो", forgotPassword: "पासवर्ड भुल्ली गे?", checkEmail: "खाते दी तस्दीक आस्तै ईमेल दिक्खो।" },
  onboarding: { ...englishMessages.onboarding, title: "अपनी प्रोफाइल पूरी करो", intro: "दस्सो फार्मरबुक तुंदी मदद कि'यां करी सकदा ऐ।", progress: "कदम {current} / {total}", roleQuestion: "तुस फार्मरबुक दा इस्तेमाल कि'यां करगे?", farmer: "कसान", customer: "गाहक", wholesaler: "थोक बपारी", company: "खेतीबाड़ी कंपनी", identity: "तुंदी पंछान", location: "थाह् ते सेवा इलाका", categories: "खेतीबाड़ी श्रेणियां", review: "जांचो ते पूरा करो", customCategory: "अपनी श्रेणी दस्सो", resume: "तुंदी सहेजी प्रगति जारी रखने आस्तै तैयार ऐ।", autosaved: "प्रगति सहेजी गेई" },
  profile: { ...englishMessages.profile, title: "प्रोफाइल ते भाशा", fullName: "पूरा नां", handle: "सार्वजनिक हैंडल", district: "जिला", state: "राज्य", bio: "छोटी जान-पंछान", experience: "तजुर्बे दे साल", farmingMethod: "खेती दा तरीका" },
  market: { ...englishMessages.market,  title: "मंडी", produce: "खेती उपज", equipment: "मशीनां ते औजार", inputs: "खेती सामग्री", services: "सेवां", offers: "पेशकशां", search: "मंडी च खोजो", noResults: "मेल खांदी कोई सूची नेईं लब्भी।", seller: "बेचने आह्ला", price: "कीमत" },
  companies: { ...englishMessages.companies, title: "खेतीबाड़ी कंपनियां", organizationName: "संगठन दा नां", companyType: "कंपनी दी किस्म", serviceArea: "सेवा इलाका", productsServices: "उत्पाद ते सेवां", tractor: "ट्रैक्टर ते खेती मशीनरी", tools: "औजार ते उपकरण", irrigation: "सिंचाई ते पानी प्रणालियां", livestock: "पशुधन ते मुर्गीपालन मदद", aquaculture: "जल-खेती ते समुद्री भोजन मदद" },
  errors: { ...englishMessages.errors, generic: "किश गलत होई गेआ। फ्ही कोशश करो।", invalidLocale: "समर्थित भाशा चुनो।", required: "एह् खाना जरूरी ऐ।", invalidEmail: "स्हेई ईमेल पता भरो।", invalidHandle: "सिर्फ छोटे अंग्रेजी अक्खर, अंक ते अंडरस्कोर बरतो।", network: "अपना कनेक्शन जांचो ते फ्ही कोशश करो।", profileSave: "भाशा इत्थें बदली गेई, पर प्रोफाइल च सहेजी नेईं गेई।", unauthorized: "एह् पसंद प्रोफाइल च सहेजने आस्तै साइन इन करो।", categoryRequired: "घट्टो-घट्ट इक श्रेणी चुनो।" },
  legal: { ...englishMessages.legal, terms: "शर्तां", privacy: "निजता सूचना", communityRules: "समुदाय दे नियम", consent: "में शर्तां, निजता सूचना ते समुदाय दे नियम मंजूर करदा आं।" },
} satisfies Messages;

export default messages;
