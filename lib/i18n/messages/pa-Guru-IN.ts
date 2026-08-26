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
  common: { demoBanner: englishMessages.common.demoBanner,  brand: "ਫਾਰਮਰਬੁੱਕ", continue: "ਅੱਗੇ ਵਧੋ", back: "ਪਿੱਛੇ", save: "ਸੰਭਾਲੋ", saving: "ਸੰਭਾਲਿਆ ਜਾ ਰਿਹਾ ਹੈ…", cancel: "ਰੱਦ ਕਰੋ", skip: "ਹੁਣੇ ਛੱਡੋ", finish: "ਪੂਰਾ ਕਰੋ", language: "ਭਾਸ਼ਾ", selectLanguage: "ਭਾਸ਼ਾ ਚੁਣੋ", beta: "ਬੀਟਾ", optional: "ਵਿਕਲਪਿਕ", other: "ਹੋਰ" },
  auth: { ...englishMessages.auth,  signIn: "ਸਾਈਨ ਇਨ ਕਰੋ", signUp: "ਖਾਤਾ ਬਣਾਓ", email: "ਈਮੇਲ ਪਤਾ", password: "ਪਾਸਵਰਡ", google: "Google ਨਾਲ ਅੱਗੇ ਵਧੋ", facebook: "Facebook ਨਾਲ ਅੱਗੇ ਵਧੋ", forgotPassword: "ਪਾਸਵਰਡ ਭੁੱਲ ਗਏ?", checkEmail: "ਖਾਤਾ ਤਸਦੀਕ ਕਰਨ ਲਈ ਆਪਣੀ ਈਮੇਲ ਵੇਖੋ।" },
  onboarding: { ...englishMessages.onboarding, title: "ਆਪਣੀ ਪ੍ਰੋਫਾਈਲ ਪੂਰੀ ਕਰੋ", intro: "ਦੱਸੋ ਕਿ ਫਾਰਮਰਬੁੱਕ ਤੁਹਾਡੀ ਕਿਵੇਂ ਮਦਦ ਕਰ ਸਕਦੀ ਹੈ।", progress: "ਪੜਾਅ {current} / {total}", roleQuestion: "ਤੁਸੀਂ ਫਾਰਮਰਬੁੱਕ ਦੀ ਵਰਤੋਂ ਕਿਵੇਂ ਕਰੋਗੇ?", farmer: "ਕਿਸਾਨ", customer: "ਗਾਹਕ", wholesaler: "ਥੋਕ ਵਪਾਰੀ", company: "ਖੇਤੀਬਾੜੀ ਕੰਪਨੀ", identity: "ਤੁਹਾਡੀ ਪਛਾਣ", location: "ਟਿਕਾਣਾ ਅਤੇ ਸੇਵਾ ਖੇਤਰ", categories: "ਖੇਤੀਬਾੜੀ ਸ਼੍ਰੇਣੀਆਂ", review: "ਜਾਂਚ ਕੇ ਪੂਰਾ ਕਰੋ", customCategory: "ਆਪਣੀ ਸ਼੍ਰੇਣੀ ਲਿਖੋ", resume: "ਤੁਹਾਡੀ ਸੰਭਾਲੀ ਤਰੱਕੀ ਜਾਰੀ ਰੱਖਣ ਲਈ ਤਿਆਰ ਹੈ।", autosaved: "ਤਰੱਕੀ ਸੰਭਾਲੀ ਗਈ" },
  profile: { ...englishMessages.profile, title: "ਪ੍ਰੋਫਾਈਲ ਅਤੇ ਭਾਸ਼ਾ", fullName: "ਪੂਰਾ ਨਾਮ", handle: "ਜਨਤਕ ਹੈਂਡਲ", district: "ਜ਼ਿਲ੍ਹਾ", state: "ਰਾਜ", bio: "ਛੋਟੀ ਜਾਣ-ਪਛਾਣ", experience: "ਤਜਰਬੇ ਦੇ ਸਾਲ", farmingMethod: "ਖੇਤੀ ਦਾ ਤਰੀਕਾ" },
  market: { ...englishMessages.market,  title: "ਮੰਡੀ", produce: "ਖੇਤੀ ਉਪਜ", equipment: "ਮਸ਼ੀਨਾਂ ਅਤੇ ਸੰਦ", inputs: "ਖੇਤੀ ਸਮੱਗਰੀ", services: "ਸੇਵਾਵਾਂ", offers: "ਪੇਸ਼ਕਸ਼ਾਂ", search: "ਮੰਡੀ ਵਿੱਚ ਖੋਜੋ", noResults: "ਮੇਲ ਖਾਂਦੀ ਕੋਈ ਸੂਚੀ ਨਹੀਂ ਮਿਲੀ।", seller: "ਵਿਕਰੇਤਾ", price: "ਕੀਮਤ" },
  companies: { ...englishMessages.companies, title: "ਖੇਤੀਬਾੜੀ ਕੰਪਨੀਆਂ", organizationName: "ਸੰਸਥਾ ਦਾ ਨਾਮ", companyType: "ਕੰਪਨੀ ਦੀ ਕਿਸਮ", serviceArea: "ਸੇਵਾ ਖੇਤਰ", productsServices: "ਉਤਪਾਦ ਅਤੇ ਸੇਵਾਵਾਂ", tractor: "ਟਰੈਕਟਰ ਅਤੇ ਖੇਤੀ ਮਸ਼ੀਨਰੀ", tools: "ਸੰਦ ਅਤੇ ਉਪਕਰਨ", irrigation: "ਸਿੰਚਾਈ ਅਤੇ ਪਾਣੀ ਪ੍ਰਣਾਲੀਆਂ", livestock: "ਪਸ਼ੂਧਨ ਅਤੇ ਪੋਲਟਰੀ ਸਹਾਇਤਾ", aquaculture: "ਜਲ-ਖੇਤੀ ਅਤੇ ਸਮੁੰਦਰੀ ਭੋਜਨ ਸਹਾਇਤਾ" },
  errors: { ...englishMessages.errors, generic: "ਕੁਝ ਗਲਤ ਹੋਇਆ। ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।", invalidLocale: "ਸਮਰਥਿਤ ਭਾਸ਼ਾ ਚੁਣੋ।", required: "ਇਹ ਜਾਣਕਾਰੀ ਲਾਜ਼ਮੀ ਹੈ।", invalidEmail: "ਸਹੀ ਈਮੇਲ ਪਤਾ ਭਰੋ।", invalidHandle: "ਸਿਰਫ਼ ਛੋਟੇ ਅੰਗਰੇਜ਼ੀ ਅੱਖਰ, ਅੰਕ ਅਤੇ ਅੰਡਰਸਕੋਰ ਵਰਤੋ।", network: "ਆਪਣਾ ਕਨੈਕਸ਼ਨ ਜਾਂਚ ਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।", profileSave: "ਭਾਸ਼ਾ ਇੱਥੇ ਬਦਲੀ ਹੈ, ਪਰ ਪ੍ਰੋਫਾਈਲ ਵਿੱਚ ਸੰਭਾਲੀ ਨਹੀਂ ਜਾ ਸਕੀ।", unauthorized: "ਇਹ ਚੋਣ ਪ੍ਰੋਫਾਈਲ ਵਿੱਚ ਸੰਭਾਲਣ ਲਈ ਸਾਈਨ ਇਨ ਕਰੋ।", categoryRequired: "ਘੱਟੋ-ਘੱਟ ਇੱਕ ਸ਼੍ਰੇਣੀ ਚੁਣੋ।" },
  legal: { ...englishMessages.legal, terms: "ਸ਼ਰਤਾਂ", privacy: "ਪਰਦੇਦਾਰੀ ਸੂਚਨਾ", communityRules: "ਭਾਈਚਾਰੇ ਦੇ ਨਿਯਮ", consent: "ਮੈਂ ਸ਼ਰਤਾਂ, ਪਰਦੇਦਾਰੀ ਸੂਚਨਾ ਅਤੇ ਭਾਈਚਾਰੇ ਦੇ ਨਿਯਮਾਂ ਨਾਲ ਸਹਿਮਤ ਹਾਂ।" },
} satisfies Messages;

export default messages;
