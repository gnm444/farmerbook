import type { Messages } from "../messages";
import englishMessages from "./en-IN";

const messages = {
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
  common: { demoBanner: englishMessages.common.demoBanner,  brand: "फार्मारबुक", continue: "दावगालां", back: "उनाव", save: "थिना दोन", saving: "थिना दोनाय…", cancel: "बाद हो", skip: "दानि नागार", finish: "फोजोब", language: "राव", selectLanguage: "राव सायख", beta: "बिटा", optional: "गोना नङा", other: "गुबुन" },
  auth: { ...englishMessages.auth,  signIn: "साइन इन खालाम", signUp: "एकाउन्ट सोरजि", email: "इमेल थं", password: "पासवार्ड", google: "Google जों दावगा", facebook: "Facebook जों दावगा", forgotPassword: "पासवार्ड बावनाय?", checkEmail: "एकाउन्ट थारबिजिरनो इमेल नाय।" },
  onboarding: { ...englishMessages.onboarding, title: "नोंथांनि प्रोफाइल आबुं खालाम", intro: "फार्मारबुका नोंथांखौ माबोरै मदद होनो हायो बुं।", progress: "खोन्दो {current} / {total}", roleQuestion: "नोंथाङा फार्मारबुकखौ माबोरै बाहायगोन?", farmer: "आबादारि", customer: "ग्राहक", wholesaler: "गासै बायग्रा", company: "आबाद कम्पानि", identity: "नोंथांनि सिनायथि", location: "जायगा आरो सेवा ओनसोल", categories: "आबाद थाखो", review: "नायफिन आरो फोजोब", customCategory: "गावनि थाखो लिर", resume: "थिना दोनाय दावगानायखौ दावगाहोनो हायो।", autosaved: "दावगानाय थिना दोनबाय" },
  profile: { ...englishMessages.profile, title: "प्रोफाइल आरो राव", fullName: "आबुं मुं", handle: "राइजो हेन्डेल", district: "जिल्ला", state: "राज्यो", bio: "सुस्रां सिनायथि", experience: "राङारि बोसोर", farmingMethod: "आबाद राहा" },
  market: { ...englishMessages.market,  title: "बाजार", produce: "आबाद दिहुनथाइ", equipment: "जोंथा आरो आयजें", inputs: "आबाद मुवा", services: "सेवा", offers: "अफार", search: "बाजाराव नागिर", noResults: "गोरोबनाय लिस्ट मोनाखै।", seller: "फानग्रा", price: "बेसेन" },
  companies: { ...englishMessages.companies, title: "आबाद कम्पानि", organizationName: "फसंथाननि मुं", companyType: "कम्पानि रोखोम", serviceArea: "सेवा ओनसोल", productsServices: "मुवा आरो सेवा", tractor: "ट्रेक्टर आरो आबाद जोंथा", tools: "आयजें आरो जोंथा", irrigation: "दै होनाय आरो दै खान्थि", livestock: "जुनार आरो दाउ मदद", aquaculture: "दै आबाद आरो समुन्द्र मुवा मदद" },
  errors: { ...englishMessages.errors, generic: "गोरोन्थि जाबाय। फिन नाजा।", invalidLocale: "मदद होनाय राव सायख।", required: "बेनि गोनांथि दं।", invalidEmail: "थिक इमेल थं लिर।", invalidHandle: "सोरां अंग्रेजि हांखो, अनजिमा आरो आन्डारस्कर बाहाय।", network: "जथायनाय नाय आरो फिन नाजा।", profileSave: "रावा बेयाव सोलायबाय, नाथाय प्रोफाइलाव थिना दोननो हायाखै।", unauthorized: "बे पसन्दखौ प्रोफाइलाव दोननो साइन इन खालाम।", categoryRequired: "खमसे थाखो सायख।" },
  legal: { ...englishMessages.legal, terms: "रादाइ", privacy: "गुमुरथि मिथिसार", communityRules: "समाज नेम", consent: "आं रादाइ, गुमुरथि मिथिसार आरो समाज नेमखौ आजावो।" },
} satisfies Messages;

export default messages;
