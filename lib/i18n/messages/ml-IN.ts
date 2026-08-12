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
  common: { demoBanner: englishMessages.common.demoBanner,  brand: "ഫാർമർബുക്ക്", continue: "തുടരുക", back: "പിന്നിലേക്ക്", save: "സംരക്ഷിക്കുക", saving: "സംരക്ഷിക്കുന്നു…", cancel: "റദ്ദാക്കുക", skip: "ഇപ്പോൾ ഒഴിവാക്കുക", finish: "പൂർത്തിയാക്കുക", language: "ഭാഷ", selectLanguage: "ഭാഷ തിരഞ്ഞെടുക്കുക", beta: "ബീറ്റ", optional: "ഐച്ഛികം", other: "മറ്റുള്ളവ" },
  auth: { ...englishMessages.auth,  signIn: "സൈൻ ഇൻ ചെയ്യുക", signUp: "അക്കൗണ്ട് സൃഷ്ടിക്കുക", email: "ഇമെയിൽ വിലാസം", password: "പാസ്‌വേഡ്", google: "Google ഉപയോഗിച്ച് തുടരുക", facebook: "Facebook ഉപയോഗിച്ച് തുടരുക", forgotPassword: "പാസ്‌വേഡ് മറന്നോ?", checkEmail: "അക്കൗണ്ട് സ്ഥിരീകരിക്കാൻ ഇമെയിൽ പരിശോധിക്കുക." },
  onboarding: { ...englishMessages.onboarding, title: "നിങ്ങളുടെ പ്രൊഫൈൽ പൂർത്തിയാക്കുക", intro: "ഫാർമർബുക്ക് നിങ്ങളെ എങ്ങനെ സഹായിക്കാമെന്ന് പറയുക.", progress: "ഘട്ടം {current} / {total}", roleQuestion: "ഫാർമർബുക്ക് നിങ്ങൾ എങ്ങനെ ഉപയോഗിക്കും?", farmer: "കർഷകൻ", customer: "ഉപഭോക്താവ്", wholesaler: "മൊത്തവ്യാപാരി", company: "കാർഷിക കമ്പനി", identity: "നിങ്ങളുടെ തിരിച്ചറിയൽ", location: "സ്ഥലവും സേവന മേഖലയും", categories: "കൃഷി വിഭാഗങ്ങൾ", review: "പരിശോധിച്ച് പൂർത്തിയാക്കുക", customCategory: "സ്വന്തം വിഭാഗം രേഖപ്പെടുത്തുക", resume: "സംരക്ഷിച്ച പുരോഗതി തുടരാൻ തയ്യാറാണ്.", autosaved: "പുരോഗതി സംരക്ഷിച്ചു" },
  profile: { ...englishMessages.profile, title: "പ്രൊഫൈലും ഭാഷയും", fullName: "പൂർണ്ണ പേര്", handle: "പൊതു ഹാൻഡിൽ", district: "ജില്ല", state: "സംസ്ഥാനം", bio: "ഹ്രസ്വ പരിചയം", experience: "അനുഭവ വർഷങ്ങൾ", farmingMethod: "കൃഷി രീതി" },
  market: { ...englishMessages.market,  title: "വിപണി", produce: "കാർഷിക വിളവ്", equipment: "ഉപകരണങ്ങളും യന്ത്രങ്ങളും", inputs: "കാർഷിക സാമഗ്രികൾ", services: "സേവനങ്ങൾ", offers: "ഓഫറുകൾ", search: "വിപണിയിൽ തിരയുക", noResults: "പൊരുത്തപ്പെടുന്ന പട്ടികകളൊന്നും കണ്ടെത്തിയില്ല.", seller: "വിൽപ്പനക്കാരൻ", price: "വില" },
  companies: { ...englishMessages.companies, title: "കാർഷിക കമ്പനികൾ", organizationName: "സ്ഥാപനത്തിന്റെ പേര്", companyType: "കമ്പനിയുടെ തരം", serviceArea: "സേവന മേഖല", productsServices: "ഉൽപ്പന്നങ്ങളും സേവനങ്ങളും", tractor: "ട്രാക്ടറുകളും കാർഷിക യന്ത്രങ്ങളും", tools: "ഉപകരണങ്ങളും കാർഷിക സാമഗ്രികളും", irrigation: "ജലസേചനവും ജല സംവിധാനങ്ങളും", livestock: "മൃഗസംരക്ഷണ-കോഴിവളർത്തൽ സഹായം", aquaculture: "ജലകൃഷി-സമുദ്രവിഭവ സഹായം" },
  errors: { ...englishMessages.errors, generic: "എന്തോ പിഴവ് സംഭവിച്ചു. വീണ്ടും ശ്രമിക്കുക.", invalidLocale: "പിന്തുണയുള്ള ഭാഷ തിരഞ്ഞെടുക്കുക.", required: "ഈ വിവരം ആവശ്യമാണ്.", invalidEmail: "സാധുവായ ഇമെയിൽ വിലാസം നൽകുക.", invalidHandle: "ചെറിയ ഇംഗ്ലീഷ് അക്ഷരങ്ങൾ, അക്കങ്ങൾ, അണ്ടർസ്കോർ എന്നിവ മാത്രം ഉപയോഗിക്കുക.", network: "കണക്ഷൻ പരിശോധിച്ച് വീണ്ടും ശ്രമിക്കുക.", profileSave: "ഭാഷ ഇവിടെ മാറ്റി, പക്ഷേ പ്രൊഫൈലിൽ സംരക്ഷിക്കാനായില്ല.", unauthorized: "ഈ തിരഞ്ഞെടുപ്പ് പ്രൊഫൈലിൽ സംരക്ഷിക്കാൻ സൈൻ ഇൻ ചെയ്യുക.", categoryRequired: "കുറഞ്ഞത് ഒരു വിഭാഗമെങ്കിലും തിരഞ്ഞെടുക്കുക." },
  legal: { ...englishMessages.legal, terms: "നിബന്ധനകൾ", privacy: "സ്വകാര്യത അറിയിപ്പ്", communityRules: "സമൂഹ നിയമങ്ങൾ", consent: "നിബന്ധനകളും സ്വകാര്യത അറിയിപ്പും സമൂഹ നിയമങ്ങളും ഞാൻ അംഗീകരിക്കുന്നു." },
} satisfies Messages;

export default messages;
