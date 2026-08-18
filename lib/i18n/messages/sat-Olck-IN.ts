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
  common: { demoBanner: englishMessages.common.demoBanner,  brand: "ᱯᱷᱟᱨᱢᱟᱨᱵᱩᱠ", continue: "ᱞᱟᱦᱟ ᱥᱮᱫ ᱪᱟᱞᱟᱜ", back: "ᱛᱟᱭᱚᱢ", save: "ᱥᱟᱧᱪᱟᱣ", saving: "ᱥᱟᱧᱪᱟᱣᱚᱜ ᱠᱟᱱᱟ…", cancel: "ᱵᱟᱹᱰᱨᱟᱹ", skip: "ᱱᱤᱛ ᱵᱟᱹᱜᱤ", finish: "ᱯᱩᱨᱟᱹᱣ", language: "ᱯᱟᱹᱨᱥᱤ", selectLanguage: "ᱯᱟᱹᱨᱥᱤ ᱵᱟᱪᱷᱟᱣ", beta: "ᱵᱤᱴᱟ", optional: "ᱠᱷᱩᱥᱤ", other: "ᱮᱴᱟᱜ" },
  auth: { ...englishMessages.auth,  signIn: "ᱥᱟᱭᱤᱱ ᱤᱱ", signUp: "ᱠᱷᱟᱛᱟ ᱛᱮᱭᱟᱨ", email: "ᱤᱢᱮᱞ ᱴᱷᱤᱠᱬᱟᱹ", password: "ᱯᱟᱥᱣᱟᱨᱰ", google: "Google ᱥᱟᱶ ᱞᱟᱦᱟ ᱪᱟᱞᱟᱜ", facebook: "Facebook ᱥᱟᱶ ᱞᱟᱦᱟ ᱪᱟᱞᱟᱜ", forgotPassword: "ᱯᱟᱥᱣᱟᱨᱰ ᱦᱤᱲᱤᱧ ᱮᱱᱟ?", checkEmail: "ᱠᱷᱟᱛᱟ ᱧᱮᱞ ᱢᱤᱞᱟᱹᱣ ᱞᱟᱹᱜᱤᱫ ᱤᱢᱮᱞ ᱧᱮᱞᱢᱮ᱾" },
  onboarding: { ...englishMessages.onboarding, title: "ᱟᱢᱟᱜ ᱯᱨᱚᱯᱷᱟᱭᱤᱞ ᱯᱩᱨᱟᱹᱣ ᱢᱮ", intro: "ᱯᱷᱟᱨᱢᱟᱨᱵᱩᱠ ᱟᱢ ᱪᱮᱫ ᱞᱮᱠᱟ ᱜᱚᱲᱚ ᱮᱢᱟᱢᱟ ᱢᱮᱱᱢᱮ᱾", progress: "ᱫᱷᱟᱯ {current} / {total}", roleQuestion: "ᱟᱢ ᱯᱷᱟᱨᱢᱟᱨᱵᱩᱠ ᱪᱮᱫ ᱞᱮᱠᱟᱢ ᱵᱮᱵᱚᱦᱟᱨᱟ?", farmer: "ᱪᱟᱹᱥᱤ", customer: "ᱠᱤᱨᱤᱧᱤᱡ", wholesaler: "ᱯᱟᱭᱠᱟᱨ", company: "ᱪᱟᱹᱥ ᱠᱚᱢᱯᱟᱱᱤ", identity: "ᱟᱢᱟᱜ ᱪᱤᱱᱦᱟᱹᱯ", location: "ᱡᱟᱭᱜᱟ ᱟᱨ ᱥᱮᱣᱟ ᱴᱚᱴᱷᱟ", categories: "ᱪᱟᱹᱥ ᱦᱟᱹᱴᱤᱧ", review: "ᱧᱮᱞ ᱫᱚᱦᱲᱟ ᱠᱟᱛᱮ ᱯᱩᱨᱟᱹᱣ", customCategory: "ᱟᱢᱟᱜ ᱦᱟᱹᱴᱤᱧ ᱚᱞ", resume: "ᱥᱟᱧᱪᱟᱣ ᱦᱚᱪᱚ ᱞᱟᱦᱟ ᱥᱮᱫ ᱪᱟᱞᱟᱜ ᱛᱮᱭᱟᱨ ᱢᱮᱱᱟᱜᱼᱟ᱾", autosaved: "ᱞᱟᱦᱟ ᱥᱮᱫ ᱥᱟᱧᱪᱟᱣ ᱮᱱᱟ" },
  profile: { ...englishMessages.profile, title: "ᱯᱨᱚᱯᱷᱟᱭᱤᱞ ᱟᱨ ᱯᱟᱹᱨᱥᱤ", fullName: "ᱯᱩᱨᱟᱹ ᱧᱩᱛᱩᱢ", handle: "ᱦᱚᱲ ᱦᱮᱱᱰᱮᱞ", district: "ᱡᱤᱞᱟᱹ", state: "ᱯᱚᱱᱚᱛ", bio: "ᱠᱷᱟᱴᱚ ᱩᱯᱨᱩᱢ", experience: "ᱧᱮᱞ ᱦᱮᱨᱮᱲ ᱵᱚᱪᱷᱚᱨ", farmingMethod: "ᱪᱟᱹᱥ ᱞᱮᱠᱟ" },
  market: { ...englishMessages.market,  title: "ᱦᱟᱴ", produce: "ᱪᱟᱹᱥ ᱡᱤᱱᱤᱥ", equipment: "ᱢᱮᱥᱤᱱ ᱟᱨ ᱚᱡᱟᱨ", inputs: "ᱪᱟᱹᱥ ᱥᱟᱢᱟᱱ", services: "ᱥᱮᱣᱟ", offers: "ᱚᱯᱷᱟᱨ", search: "ᱦᱟᱴ ᱨᱮ ᱯᱟᱱᱛᱮ", noResults: "ᱢᱮᱞ ᱞᱤᱥᱴᱤ ᱵᱟᱝ ᱧᱟᱢ ᱮᱱᱟ᱾", seller: "ᱟᱠᱷᱨᱤᱧᱤᱡ", price: "ᱜᱚᱱᱚᱝ" },
  companies: { ...englishMessages.companies, title: "ᱪᱟᱹᱥ ᱠᱚᱢᱯᱟᱱᱤ", organizationName: "ᱜᱟᱶᱛᱟ ᱧᱩᱛᱩᱢ", companyType: "ᱠᱚᱢᱯᱟᱱᱤ ᱞᱮᱠᱟ", serviceArea: "ᱥᱮᱣᱟ ᱴᱚᱴᱷᱟ", productsServices: "ᱡᱤᱱᱤᱥ ᱟᱨ ᱥᱮᱣᱟ", tractor: "ᱴᱨᱮᱠᱴᱚᱨ ᱟᱨ ᱪᱟᱹᱥ ᱢᱮᱥᱤᱱ", tools: "ᱚᱡᱟᱨ ᱟᱨ ᱩᱯᱚᱠᱚᱨᱚᱱ", irrigation: "ᱫᱟᱜ ᱮᱢ ᱟᱨ ᱫᱟᱜ ᱵᱮᱵᱚᱥᱛᱟ", livestock: "ᱰᱟᱝᱨᱟ ᱟᱨ ᱥᱤᱢ ᱜᱚᱲᱚ", aquaculture: "ᱫᱟᱜ ᱪᱟᱹᱥ ᱟᱨ ᱫᱚᱨᱭᱟ ᱡᱚᱢᱟᱜ ᱜᱚᱲᱚ" },
  errors: { ...englishMessages.errors, generic: "ᱪᱮᱫ ᱦᱩᱰᱟᱹᱜ ᱮᱱᱟ᱾ ᱫᱚᱦᱲᱟ ᱠᱩᱨᱩᱢᱩᱴᱩᱭ ᱢᱮ᱾", invalidLocale: "ᱜᱚᱲᱚ ᱯᱟᱹᱨᱥᱤ ᱵᱟᱪᱷᱟᱣ ᱢᱮ᱾", required: "ᱱᱚᱣᱟ ᱞᱟᱹᱠᱛᱤᱜᱼᱟ᱾", invalidEmail: "ᱴᱷᱤᱠ ᱤᱢᱮᱞ ᱴᱷᱤᱠᱬᱟᱹ ᱚᱞ ᱢᱮ᱾", invalidHandle: "ᱠᱮᱣᱞ ᱦᱩᱰᱤᱧ ᱤᱝᱨᱟᱹᱡᱤ ᱚᱠᱷᱚᱨ, ᱮᱞ ᱟᱨ ᱟᱱᱰᱟᱨᱥᱠᱚᱨ ᱵᱮᱵᱚᱦᱟᱨ ᱢᱮ᱾", network: "ᱡᱩᱲᱟᱹᱣ ᱧᱮᱞ ᱠᱟᱛᱮ ᱫᱚᱦᱲᱟ ᱠᱩᱨᱩᱢᱩᱴᱩᱭ ᱢᱮ᱾", profileSave: "ᱯᱟᱹᱨᱥᱤ ᱱᱚᱸᱰᱮ ᱵᱚᱫᱚᱞ ᱮᱱᱟ, ᱢᱮᱱᱠᱷᱟᱱ ᱯᱨᱚᱯᱷᱟᱭᱤᱞ ᱨᱮ ᱥᱟᱧᱪᱟᱣ ᱵᱟᱝ ᱦᱩᱭ ᱮᱱᱟ᱾", unauthorized: "ᱱᱚᱣᱟ ᱠᱩᱥᱤ ᱯᱨᱚᱯᱷᱟᱭᱤᱞ ᱨᱮ ᱥᱟᱧᱪᱟᱣ ᱞᱟᱹᱜᱤᱫ ᱥᱟᱭᱤᱱ ᱤᱱ ᱢᱮ᱾", categoryRequired: "ᱠᱚᱢ ᱠᱷᱚᱱ ᱢᱤᱫ ᱦᱟᱹᱴᱤᱧ ᱵᱟᱪᱷᱟᱣ ᱢᱮ᱾" },
  legal: { ...englishMessages.legal, terms: "ᱥᱚᱨᱛᱚ", privacy: "ᱩᱠᱩ ᱥᱩᱪᱚᱱᱟ", communityRules: "ᱥᱟᱶᱛᱟ ᱱᱤᱭᱚᱢ", consent: "ᱤᱧ ᱥᱚᱨᱛᱚ, ᱩᱠᱩ ᱥᱩᱪᱚᱱᱟ ᱟᱨ ᱥᱟᱶᱛᱟ ᱱᱤᱭᱚᱢ ᱢᱟᱱᱟᱣ ᱮᱫᱟᱹᱧ᱾" },
} satisfies Messages;

export default messages;
