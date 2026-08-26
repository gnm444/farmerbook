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
  common: { demoBanner: englishMessages.common.demoBanner,  brand: "فارمر بُک", continue: "آگے بڑھیں", back: "واپس", save: "محفوظ کریں", saving: "محفوظ ہو رہا ہے…", cancel: "منسوخ کریں", skip: "ابھی چھوڑ دیں", finish: "مکمل کریں", language: "زبان", selectLanguage: "زبان منتخب کریں", beta: "آزمائشی", optional: "اختیاری", other: "دیگر" },
  auth: { ...englishMessages.auth,  signIn: "سائن اِن کریں", signUp: "اکاؤنٹ بنائیں", email: "ای میل پتہ", password: "پاس ورڈ", google: "Google کے ساتھ آگے بڑھیں", facebook: "Facebook کے ساتھ آگے بڑھیں", forgotPassword: "پاس ورڈ بھول گئے؟", checkEmail: "اکاؤنٹ کی تصدیق کے لیے اپنی ای میل دیکھیں۔" },
  onboarding: { ...englishMessages.onboarding, title: "اپنی پروفائل مکمل کریں", intro: "بتائیں کہ فارمر بُک آپ کی کیسے مدد کر سکتا ہے۔", progress: "مرحلہ {current} / {total}", roleQuestion: "آپ فارمر بُک کیسے استعمال کریں گے؟", farmer: "کسان", customer: "گاہک", wholesaler: "تھوک فروش", company: "زرعی کمپنی", identity: "آپ کی شناخت", location: "مقام اور خدمت کا علاقہ", categories: "کاشت کاری کے زمرے", review: "جائزہ لے کر مکمل کریں", customCategory: "اپنا زمرہ لکھیں", resume: "آپ کی محفوظ پیش رفت جاری رکھنے کے لیے تیار ہے۔", autosaved: "پیش رفت محفوظ ہو گئی" },
  profile: { ...englishMessages.profile, title: "پروفائل اور زبان", fullName: "پورا نام", handle: "عوامی ہینڈل", district: "ضلع", state: "ریاست", bio: "مختصر تعارف", experience: "تجربے کے سال", farmingMethod: "کاشت کاری کا طریقہ" },
  market: { ...englishMessages.market,  title: "بازار", produce: "زرعی پیداوار", equipment: "مشینیں اور اوزار", inputs: "زرعی سامان", services: "خدمات", offers: "پیشکشیں", search: "بازار میں تلاش کریں", noResults: "کوئی مماثل فہرست نہیں ملی۔", seller: "فروخت کنندہ", price: "قیمت" },
  companies: { ...englishMessages.companies, title: "زرعی کمپنیاں", organizationName: "ادارے کا نام", companyType: "کمپنی کی قسم", serviceArea: "خدمت کا علاقہ", productsServices: "مصنوعات اور خدمات", tractor: "ٹریکٹر اور زرعی مشینری", tools: "اوزار اور آلات", irrigation: "آبپاشی اور پانی کے نظام", livestock: "مویشی اور پولٹری معاونت", aquaculture: "آبی زراعت اور سمندری خوراک معاونت" },
  errors: { ...englishMessages.errors, generic: "کچھ غلط ہو گیا۔ دوبارہ کوشش کریں۔", invalidLocale: "تعاون یافتہ زبان منتخب کریں۔", required: "یہ معلومات ضروری ہیں۔", invalidEmail: "درست ای میل پتہ درج کریں۔", invalidHandle: "صرف چھوٹے انگریزی حروف، اعداد اور انڈر اسکور استعمال کریں۔", network: "اپنا رابطہ جانچ کر دوبارہ کوشش کریں۔", profileSave: "زبان یہاں بدل گئی، مگر پروفائل میں محفوظ نہیں ہو سکی۔", unauthorized: "یہ انتخاب پروفائل میں محفوظ کرنے کے لیے سائن اِن کریں۔", categoryRequired: "کم از کم ایک زمرہ منتخب کریں۔" },
  legal: { ...englishMessages.legal, terms: "شرائط", privacy: "رازداری کا نوٹس", communityRules: "برادری کے اصول", consent: "میں شرائط، رازداری کے نوٹس اور برادری کے اصولوں سے اتفاق کرتا/کرتی ہوں۔" },
} satisfies Messages;

export default messages;
