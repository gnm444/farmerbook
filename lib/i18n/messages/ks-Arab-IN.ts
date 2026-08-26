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
  common: { demoBanner: englishMessages.common.demoBanner,  brand: "فارمر بُک", continue: "برونہہ پَکِو", back: "پَتھ کُن", save: "محفوظ کٔرِو", saving: "محفوظ گژھان…", cancel: "منسوخ کٔرِو", skip: "وِنہِ تراوِو", finish: "مُکمل کٔرِو", language: "زَبان", selectLanguage: "زَبان ژارِو", beta: "بیٹا", optional: "اختیاری", other: "باقی" },
  auth: { ...englishMessages.auth,  signIn: "سائن اِن کٔرِو", signUp: "کھاتہ بناوِو", email: "ای میل پتہ", password: "پاس ورڈ", google: "Google سۭتۍ برونہہ پَکِو", facebook: "Facebook سۭتۍ برونہہ پَکِو", forgotPassword: "پاس ورڈ مشروو؟", checkEmail: "کھاتہ تصدیق کرنہٕ خٲطرٕ پنُن ای میل وُچھِو۔" },
  onboarding: { ...englishMessages.onboarding, title: "پنُن پروفائل مُکمل کٔرِو", intro: "اَسہِ وَنِو زِ فارمر بُک کِتھ پٲٹھۍ مدد کٔرِ ہیکہِ۔", progress: "مرحلہٕ {current} / {total}", roleQuestion: "تُہۍ فارمر بُک کِتھ پٲٹھۍ استعمال کٔرِو؟", farmer: "زمیٖندار", customer: "گاہک", wholesaler: "تھوک بیوپارٕ", company: "زرعی کمپنی", identity: "تُہند پہچان", location: "جاے تہٕ خدمت علاقہ", categories: "زراعت قسمہٕ", review: "جائزہ نِتھ مُکمل کٔرِو", customCategory: "پنُن قسم لیکِھو", resume: "تُہند محفوظ پیش رفت جاری تھاونہٕ خٲطرٕ تیار چھِ۔", autosaved: "پیش رفت محفوظ گٔے" },
  profile: { ...englishMessages.profile, title: "پروفائل تہٕ زَبان", fullName: "پوٗرٕ ناو", handle: "عوامی ہینڈل", district: "ضلع", state: "ریاست", bio: "مختصر تعارف", experience: "تجربہٕ ہٕندۍ وُہُر", farmingMethod: "زراعت طریقہ" },
  market: { ...englishMessages.market,  title: "بازار", produce: "زرعی پیداوار", equipment: "سامان تہٕ اوزار", inputs: "زرعی سامان", services: "خدمات", offers: "پیشکشہٕ", search: "بازارَس منٛز ژھانٛڈِو", noResults: "کانٛہہ مِلٕنۍ فہرست آیہِ نہٕ اَتھہٕ۔", seller: "فروش کرن وول", price: "قیمت" },
  companies: { ...englishMessages.companies, title: "زرعی کمپنۍ", organizationName: "ادارٕک ناو", companyType: "کمپنی قسم", serviceArea: "خدمت علاقہ", productsServices: "مصنوعات تہٕ خدمات", tractor: "ٹریکٹر تہٕ زرعی مشینری", tools: "اوزار تہٕ آلات", irrigation: "آبپاشی تہٕ آب نظام", livestock: "مویشی تہٕ پولٹری مدد", aquaculture: "آبی زراعت تہٕ سمندری خوراک مدد" },
  errors: { ...englishMessages.errors, generic: "کانٛہہ غلطی گٔے۔ مہربٲنی کٔرِتھ دوبارٕ کوشش کٔرِو۔", invalidLocale: "مدد یافتہ زَبان ژارِو۔", required: "یہِ خانہٕ ضروری چھُ۔", invalidEmail: "درست ای میل پتہ لیکِھو۔", invalidHandle: "صرف لۄکٕٹۍ انگریزی حرف، نمبر تہٕ انڈر سکوٗر استعمال کٔرِو۔", network: "پنُن رابطہ وُچھِو تہٕ دوبارٕ کوشش کٔرِو۔", profileSave: "زَبان اَتہِ بدلٕ گٔے مگر پروفائلَس منٛز محفوظ نہٕ گٔے۔", unauthorized: "یہِ پسند پروفائلَس منٛز محفوظ کرنہٕ خٲطرٕ سائن اِن کٔرِو۔", categoryRequired: "کم از کم اَکھ قسم ژارِو۔" },
  legal: { ...englishMessages.legal, terms: "شرطہٕ", privacy: "رازداری اطلاع", communityRules: "برادری اصول", consent: "بہٕ شرطَن، رازداری اطلاع تہٕ برادری اصولَن سۭتۍ راضی چھُس۔" },
} satisfies Messages;

export default messages;
