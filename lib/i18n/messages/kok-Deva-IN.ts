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
  common: { demoBanner: englishMessages.common.demoBanner,  brand: "फार्मरबुक", continue: "फुडें वचात", back: "फाटीं", save: "जतनाय", saving: "जतनायता…", cancel: "रद्द करात", skip: "आतां सोडात", finish: "पुराय करात", language: "भास", selectLanguage: "भास निवडात", beta: "बीटा", optional: "पर्यायी", other: "हेर" },
  auth: { ...englishMessages.auth,  signIn: "साइन इन करात", signUp: "खातें तयार करात", email: "ईमेल नामो", password: "पासवर्ड", google: "Google वरवीं फुडें वचात", facebook: "Facebook वरवीं फुडें वचात", forgotPassword: "पासवर्ड विसरले?", checkEmail: "खातें तपासपाक तुमचो ईमेल पळयात." },
  onboarding: { ...englishMessages.onboarding, title: "तुमचें प्रोफायल पुराय करात", intro: "फार्मरबुक तुमकां कशी मदत करूंक शकता तें सांगात.", progress: "पांवडो {current} / {total}", roleQuestion: "तुमी फार्मरबुक कसें वापरतले?", farmer: "शेतकार", customer: "गिरायक", wholesaler: "घाऊक वेपारी", company: "शेती कंपनी", identity: "तुमची वळख", location: "सुवात आनी सेवा वाठार", categories: "शेती वर्ग", review: "तपासून पुराय करात", customCategory: "तुमचो स्वताचो वर्ग सांगात", resume: "तुमची जतनायिल्ली प्रगती फुडें व्हरपाक तयार आसा.", autosaved: "प्रगती जतनायली" },
  profile: { ...englishMessages.profile, title: "प्रोफायल आनी भास", fullName: "पुराय नांव", handle: "भौशीक हँडल", district: "जिल्लो", state: "राज्य", bio: "ल्हान वळख", experience: "अणभवाचीं वर्सां", farmingMethod: "शेती पद्धत" },
  market: { ...englishMessages.market,  title: "बाजार", produce: "शेती उत्पादन", equipment: "यंत्रां आनी आयदनां", inputs: "शेती सामुग्री", services: "सेवा", offers: "ऑफर", search: "बाजारांत सोदात", noResults: "जुळपी यादी मेळूंक ना.", seller: "विक्रेता", price: "मोल" },
  companies: { ...englishMessages.companies, title: "शेती कंपन्यो", organizationName: "संस्थेचें नांव", companyType: "कंपनीचो प्रकार", serviceArea: "सेवा वाठार", productsServices: "उत्पादनां आनी सेवा", tractor: "ट्रॅक्टर आनी शेती यंत्रां", tools: "आयदनां आनी अवजारां", irrigation: "शिंपणावळ आनी उदक व्यवस्था", livestock: "जनावरां आनी कुक्कुट मदत", aquaculture: "जलशेती आनी दर्यावेल्या अन्नाची मदत" },
  errors: { ...englishMessages.errors, generic: "कितें तरी चुकलें. परतून यत्न करात.", invalidLocale: "आदारित भास निवडात.", required: "ही म्हायती गरजेची आसा.", invalidEmail: "योग्य ईमेल नामो भरात.", invalidHandle: "फकत ल्हान इंग्लीश अक्षरां, अंक आनी अंडरस्कोर वापरात.", network: "जोडणी तपासून परतून यत्न करात.", profileSave: "भास हांगा बदलली, पूण प्रोफायलांत जतनाय ना.", unauthorized: "ही पसंत प्रोफायलांत जतनावपाक साइन इन करात.", categoryRequired: "उण्यांत उणो एक वर्ग निवडात." },
  legal: { ...englishMessages.legal, terms: "अटी", privacy: "गुप्तताय सुचोवणी", communityRules: "समाज नेम", consent: "हांव अटी, गुप्तताय सुचोवणी आनी समाज नेम मान्य करतां." },
} satisfies Messages;

export default messages;
