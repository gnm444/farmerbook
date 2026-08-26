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
  common: { demoBanner: englishMessages.common.demoBanner,  brand: "फार्मरबुक", continue: "अग्रे गच्छतु", back: "पृष्ठतः", save: "रक्षतु", saving: "रक्ष्यते…", cancel: "निरस्यतु", skip: "इदानीं त्यजतु", finish: "समापयतु", language: "भाषा", selectLanguage: "भाषां चिनोतु", beta: "परीक्षणम्", optional: "वैकल्पिकम्", other: "अन्यत्" },
  auth: { ...englishMessages.auth,  signIn: "प्रविशतु", signUp: "लेखां रचयतु", email: "ईपत्रसङ्केतः", password: "गुप्तशब्दः", google: "Google द्वारा अग्रे गच्छतु", facebook: "Facebook द्वारा अग्रे गच्छतु", forgotPassword: "गुप्तशब्दं विस्मृतवान्?", checkEmail: "लेखां सत्यापयितुं स्वस्य ईपत्रं पश्यतु।" },
  onboarding: { ...englishMessages.onboarding, title: "स्वपरिचयपत्रं पूरयतु", intro: "फार्मरबुक भवतः कथं साहाय्यं कुर्यात् इति वदतु।", progress: "सोपानम् {current} / {total}", roleQuestion: "भवान् फार्मरबुक कथं प्रयोजयिष्यति?", farmer: "कृषकः", customer: "ग्राहकः", wholesaler: "स्थूलविक्रेता", company: "कृषिसंस्था", identity: "भवतः परिचयः", location: "स्थानं सेवाक्षेत्रं च", categories: "कृषिवर्गाः", review: "समीक्ष्य समापयतु", customCategory: "स्ववर्गं लिखतु", resume: "भवतः रक्षिता प्रगतिः अनुवर्तितुं सज्जा अस्ति।", autosaved: "प्रगतिः रक्षिता" },
  profile: { ...englishMessages.profile, title: "परिचयपत्रं भाषा च", fullName: "पूर्णं नाम", handle: "सार्वजनिकं नामचिह्नम्", district: "जनपदः", state: "राज्यम्", bio: "संक्षिप्तपरिचयः", experience: "अनुभववर्षाणि", farmingMethod: "कृषिविधिः" },
  market: { ...englishMessages.market,  title: "विपणिः", produce: "कृष्युत्पादः", equipment: "यन्त्राणि उपकरणानि च", inputs: "कृषिसामग्री", services: "सेवाः", offers: "प्रस्तावाः", search: "विपण्यां अन्विष्यतु", noResults: "अनुरूपा सूची न लब्धा।", seller: "विक्रेता", price: "मूल्यम्" },
  companies: { ...englishMessages.companies, title: "कृषिसंस्थाः", organizationName: "संस्थायाः नाम", companyType: "संस्थायाः प्रकारः", serviceArea: "सेवाक्षेत्रम्", productsServices: "उत्पादाः सेवाश्च", tractor: "कर्षणयन्त्राणि कृषियन्त्राणि च", tools: "उपकरणानि आयुधानि च", irrigation: "सेचनं जलप्रणाली च", livestock: "पशुपालन-कुक्कुटसाहाय्यम्", aquaculture: "जलचरकृषि-समुद्राहारसाहाय्यम्" },
  errors: { ...englishMessages.errors, generic: "किञ्चित् दोषः अभवत्। पुनः प्रयतताम्।", invalidLocale: "समर्थितां भाषां चिनोतु।", required: "एषा सूचना आवश्यकी।", invalidEmail: "मान्यं ईपत्रसङ्केतं लिखतु।", invalidHandle: "लघूनि आङ्ग्लाक्षराणि, अङ्कान् अधोरेखां च एव प्रयोजयतु।", network: "सम्पर्कं परीक्ष्य पुनः प्रयतताम्।", profileSave: "भाषा अत्र परिवर्तिता, किन्तु परिचयपत्रे रक्षितुं न शकिता।", unauthorized: "एतां रुचिं परिचयपत्रे रक्षितुं प्रविशतु।", categoryRequired: "न्यूनातिन्यूनम् एकं वर्गं चिनोतु।" },
  legal: { ...englishMessages.legal, terms: "नियमाः", privacy: "गोपनीयतासूचना", communityRules: "समुदायनियमाः", consent: "अहं नियमान्, गोपनीयतासूचनां समुदायनियमांश्च स्वीकरोमि।" },
} satisfies Messages;

export default messages;
