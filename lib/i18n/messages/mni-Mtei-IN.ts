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
  common: { demoBanner: englishMessages.common.demoBanner,  brand: "ꯐꯥꯔꯃꯔꯕꯨꯛ", continue: "ꯃꯈꯥ ꯆꯠꯂꯨ", back: "ꯍꯟꯖꯤꯜꯂꯨ", save: "ꯁꯦꯚ ꯇꯧ", saving: "ꯁꯦꯚ ꯇꯧꯔꯤ…", cancel: "ꯀꯛꯊꯠꯂꯨ", skip: "ꯍꯧꯖꯤꯛ ꯊꯥꯗꯣꯛꯂꯨ", finish: "ꯂꯣꯏꯁꯤꯜꯂꯨ", language: "ꯂꯣꯟ", selectLanguage: "ꯂꯣꯟ ꯈꯟꯕꯤꯌꯨ", beta: "ꯕꯤꯇꯥ", optional: "ꯑꯄꯥꯝꯕ", other: "ꯑꯇꯣꯞꯄ" },
  auth: { ...englishMessages.auth,  signIn: "ꯁꯥꯏꯟ ꯏꯟ ꯇꯧ", signUp: "ꯑꯦꯀꯥꯎꯟ ꯁꯦꯝꯂꯨ", email: "ꯏꯃꯦꯜ ꯑꯦꯗ꯭ꯔꯦꯁ", password: "ꯄꯥꯁꯋꯥꯔꯗ", google: "Google ꯒꯥ ꯂꯣꯏꯅꯅ ꯃꯈꯥ ꯆꯠꯂꯨ", facebook: "Facebook ꯒꯥ ꯂꯣꯏꯅꯅ ꯃꯈꯥ ꯆꯠꯂꯨ", forgotPassword: "ꯄꯥꯁꯋꯥꯔꯗ ꯀꯥꯎꯔꯦ?", checkEmail: "ꯑꯦꯀꯥꯎꯟ ꯌꯦꯡꯁꯤꯅꯕ ꯏꯃꯦꯜ ꯌꯦꯡꯕꯤꯌꯨ꯫" },
  onboarding: { ...englishMessages.onboarding, title: "ꯅꯍꯥꯛꯀꯤ ꯄ꯭ꯔꯣꯐꯥꯏꯜ ꯂꯣꯏꯁꯤꯜꯂꯨ", intro: "ꯐꯥꯔꯃꯔꯕꯨꯛꯅ ꯅꯍꯥꯛꯄꯨ ꯀꯔꯝꯅ ꯃꯇꯦꯡ ꯄꯥꯡꯒꯅꯤ ꯍꯥꯏꯕ ꯇꯥꯛꯄꯤꯌꯨ꯫", progress: "ꯈꯣꯡꯊꯥꯡ {current} / {total}", roleQuestion: "ꯅꯍꯥꯛꯅ ꯐꯥꯔꯃꯔꯕꯨꯛ ꯀꯔꯝꯅ ꯁꯤꯖꯤꯟꯅꯒꯅꯤ?", farmer: "ꯂꯧꯃꯤ", customer: "ꯄꯣꯠ ꯂꯩꯕ", wholesaler: "ꯌꯥꯝꯅ ꯌꯣꯟꯕ", company: "ꯂꯧꯎꯁꯤꯡ ꯀꯝꯄꯦꯅꯤ", identity: "ꯅꯍꯥꯛꯀꯤ ꯁꯛꯇꯥꯛ", location: "ꯃꯐꯝ ꯑꯃꯁꯨꯡ ꯁꯥꯔꯚꯤꯁ ꯑꯦꯔꯤꯌꯥ", categories: "ꯂꯧꯎꯁꯤꯡꯒꯤ ꯀꯥꯡꯂꯨꯞ", review: "ꯌꯦꯡꯁꯤꯟꯗꯨꯅ ꯂꯣꯏꯁꯤꯜꯂꯨ", customCategory: "ꯅꯍꯥꯛꯀꯤ ꯀꯥꯡꯂꯨꯞ ꯏꯕꯤꯌꯨ", resume: "ꯁꯦꯚ ꯇꯧꯔꯕ ꯃꯈꯥ ꯆꯠꯄ ꯑꯃꯨꯛ ꯍꯧꯅꯕ ꯁꯦꯝ ꯁꯥꯔꯦ꯫", autosaved: "ꯃꯈꯥ ꯆꯠꯄ ꯁꯦꯚ ꯇꯧꯔꯦ" },
  profile: { ...englishMessages.profile, title: "ꯄ꯭ꯔꯣꯐꯥꯏꯜ ꯑꯃꯁꯨꯡ ꯂꯣꯟ", fullName: "ꯃꯄꯨꯡ ꯐꯥꯕ ꯃꯤꯡ", handle: "ꯃꯤꯌꯥꯝꯒꯤ ꯍꯦꯟꯗꯜ", district: "ꯖꯤꯂꯥ", state: "ꯂꯩꯉꯥꯛ", bio: "ꯑꯇꯦꯟꯕ ꯃꯁꯥꯛ ꯇꯥꯛꯄ", experience: "ꯊꯕꯛ ꯇꯧꯔꯕ ꯆꯍꯤ", farmingMethod: "ꯂꯧꯎꯁꯤꯡ ꯇꯧꯕꯒꯤ ꯃꯑꯣꯡ" },
  market: { ...englishMessages.market,  title: "ꯀꯩꯊꯦꯜ", produce: "ꯂꯧꯎꯁꯤꯡ ꯄꯣꯠ", equipment: "ꯃꯦꯁꯤꯟ ꯑꯃꯁꯨꯡ ꯈꯨꯠꯂꯥꯏ", inputs: "ꯂꯧꯎꯁꯤꯡ ꯃꯆꯥꯛ", services: "ꯁꯥꯔꯚꯤꯁ", offers: "ꯑꯣꯐꯔ", search: "ꯀꯩꯊꯦꯜꯗ ꯊꯤꯕꯤꯌꯨ", noResults: "ꯆꯥꯟꯅꯕ ꯂꯤꯁ꯭ꯇ ꯐꯪꯗꯦ꯫", seller: "ꯌꯣꯟꯕ", price: "ꯃꯃꯜ" },
  companies: { ...englishMessages.companies, title: "ꯂꯧꯎꯁꯤꯡ ꯀꯝꯄꯦꯅꯤ", organizationName: "ꯂꯨꯞꯀꯤ ꯃꯤꯡ", companyType: "ꯀꯝꯄꯦꯅꯤꯒꯤ ꯃꯈꯜ", serviceArea: "ꯁꯥꯔꯚꯤꯁ ꯑꯦꯔꯤꯌꯥ", productsServices: "ꯄꯣꯠ ꯑꯃꯁꯨꯡ ꯁꯥꯔꯚꯤꯁ", tractor: "ꯇ꯭ꯔꯦꯛꯇꯔ ꯑꯃꯁꯨꯡ ꯂꯧꯎꯁꯤꯡ ꯃꯦꯁꯤꯟ", tools: "ꯈꯨꯠꯂꯥꯏ ꯑꯃꯁꯨꯡ ꯃꯦꯁꯤꯟ", irrigation: "ꯏꯁꯤꯡ ꯄꯤꯕꯒꯤ ꯁꯤꯁ꯭ꯇꯦꯝ", livestock: "ꯁꯥ ꯑꯃꯁꯨꯡ ꯌꯦꯟ ꯃꯇꯦꯡ", aquaculture: "ꯏꯁꯤꯡ ꯂꯧꯎꯁꯤꯡ ꯑꯃꯁꯨꯡ ꯏꯁꯤꯡꯒꯤ ꯆꯥꯅꯕ ꯃꯇꯦꯡ" },
  errors: { ...englishMessages.errors, generic: "ꯑꯁꯣꯏꯕ ꯑꯃ ꯊꯣꯛꯂꯦ꯫ ꯑꯃꯨꯛ ꯍꯣꯠꯅꯕꯤꯌꯨ꯫", invalidLocale: "ꯌꯥꯕ ꯂꯣꯟ ꯈꯟꯕꯤꯌꯨ꯫", required: "ꯃꯁꯤ ꯇꯪꯒꯥꯏ ꯐꯗꯦ꯫", invalidEmail: "ꯑꯆꯨꯝꯕ ꯏꯃꯦꯜ ꯑꯦꯗ꯭ꯔꯦꯁ ꯏꯕꯤꯌꯨ꯫", invalidHandle: "ꯏꯪꯂꯤꯁꯀꯤ ꯁ꯭ꯃꯣꯜ ꯂꯦꯇꯔ, ꯅꯝꯕꯔ ꯑꯃꯁꯨꯡ ꯑꯟꯗꯔꯁ꯭ꯀꯣꯔ ꯈꯛꯇꯃꯛ ꯁꯤꯖꯤꯟꯅꯧ꯫", network: "ꯀꯅꯦꯛꯁꯟ ꯌꯦꯡꯁꯤꯟꯗꯨꯅ ꯑꯃꯨꯛ ꯍꯣꯠꯅꯕꯤꯌꯨ꯫", profileSave: "ꯂꯣꯟ ꯃꯐꯝ ꯑꯁꯤꯗ ꯍꯣꯡꯂꯦ, ꯑꯗꯨꯕꯨ ꯄ꯭ꯔꯣꯐꯥꯏꯜꯗ ꯁꯦꯚ ꯇꯧꯕ ꯉꯝꯗꯦ꯫", unauthorized: "ꯄꯁꯟꯗ ꯑꯁꯤ ꯄ꯭ꯔꯣꯐꯥꯏꯜꯗ ꯁꯦꯚ ꯇꯧꯅꯕ ꯁꯥꯏꯟ ꯏꯟ ꯇꯧꯕꯤꯌꯨ꯫", categoryRequired: "ꯈꯔ ꯊꯥꯕ ꯀꯥꯡꯂꯨꯞ ꯑꯃ ꯈꯟꯕꯤꯌꯨ꯫" },
  legal: { ...englishMessages.legal, terms: "ꯌꯥꯅꯕꯒꯤ ꯋꯥꯐꯝ", privacy: "ꯑꯔꯣꯟꯕ ꯄꯥꯎ", communityRules: "ꯈꯨꯟꯅꯥꯏꯒꯤ ꯅꯤꯌꯝ", consent: "ꯑꯩꯅ ꯌꯥꯅꯕꯒꯤ ꯋꯥꯐꯝ, ꯑꯔꯣꯟꯕ ꯄꯥꯎ ꯑꯃꯁꯨꯡ ꯈꯨꯟꯅꯥꯏꯒꯤ ꯅꯤꯌꯝ ꯌꯥꯔꯦ꯫" },
} satisfies Messages;

export default messages;
