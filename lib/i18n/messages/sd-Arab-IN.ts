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
  common: { demoBanner: englishMessages.common.demoBanner,  brand: "فارمر بُڪ", continue: "اڳتي وڌو", back: "پوئتي", save: "محفوظ ڪريو", saving: "محفوظ ٿي رهيو آهي…", cancel: "رد ڪريو", skip: "هاڻي ڇڏيو", finish: "مڪمل ڪريو", language: "ٻولي", selectLanguage: "ٻولي چونڊيو", beta: "بيٽا", optional: "اختياري", other: "ٻيو" },
  auth: { ...englishMessages.auth,  signIn: "سائن اِن ڪريو", signUp: "کاتو ٺاهيو", email: "اي ميل پتو", password: "پاسورڊ", google: "Google سان اڳتي وڌو", facebook: "Facebook سان اڳتي وڌو", forgotPassword: "پاسورڊ وسري ويو؟", checkEmail: "کاتي جي تصديق لاءِ پنهنجي اي ميل ڏسو." },
  onboarding: { ...englishMessages.onboarding, title: "پنهنجو پروفائيل مڪمل ڪريو", intro: "ٻڌايو ته فارمر بُڪ توهان جي ڪيئن مدد ڪري سگهي ٿو.", progress: "قدم {current} / {total}", roleQuestion: "توهان فارمر بُڪ ڪيئن استعمال ڪندا؟", farmer: "هاري", customer: "گراهڪ", wholesaler: "ٿوڪ واپاري", company: "زرعي ڪمپني", identity: "توهان جي سڃاڻپ", location: "هنڌ ۽ خدمت جو علائقو", categories: "زراعت جا درجا", review: "جائزو وٺي مڪمل ڪريو", customCategory: "پنهنجو درجو لکو", resume: "توهان جي محفوظ ٿيل اڳڀرائي جاري رکڻ لاءِ تيار آهي.", autosaved: "اڳڀرائي محفوظ ٿي" },
  profile: { ...englishMessages.profile, title: "پروفائيل ۽ ٻولي", fullName: "پورو نالو", handle: "عوامي هينڊل", district: "ضلعو", state: "رياست", bio: "مختصر تعارف", experience: "تجربي جا سال", farmingMethod: "زراعت جو طريقو" },
  market: { ...englishMessages.market,  title: "بازار", produce: "زرعي پيداوار", equipment: "مشينون ۽ اوزار", inputs: "زرعي سامان", services: "خدمتون", offers: "آڇون", search: "بازار ۾ ڳوليو", noResults: "ملندڙ ڪا فهرست نه ملي.", seller: "وڪڻندڙ", price: "قيمت" },
  companies: { ...englishMessages.companies, title: "زرعي ڪمپنيون", organizationName: "اداري جو نالو", companyType: "ڪمپني جو قسم", serviceArea: "خدمت جو علائقو", productsServices: "مصنوعات ۽ خدمتون", tractor: "ٽريڪٽر ۽ زرعي مشينري", tools: "اوزار ۽ سامان", irrigation: "آبپاشي ۽ پاڻي جا نظام", livestock: "مال مويشي ۽ پولٽري سهائتا", aquaculture: "آبي زراعت ۽ سامونڊي خوراڪ سهائتا" },
  errors: { ...englishMessages.errors, generic: "ڪجهه غلط ٿيو. ٻيهر ڪوشش ڪريو.", invalidLocale: "سهائتا ڪيل ٻولي چونڊيو.", required: "هي ڄاڻ ضروري آهي.", invalidEmail: "صحيح اي ميل پتو داخل ڪريو.", invalidHandle: "رڳو ننڍا انگريزي اکر، انگ ۽ انڊر اسڪوئر استعمال ڪريو.", network: "پنهنجو رابطو جاچي ٻيهر ڪوشش ڪريو.", profileSave: "ٻولي هتي بدلجي وئي، پر پروفائيل ۾ محفوظ نه ٿي سگهي.", unauthorized: "هي چونڊ پروفائيل ۾ محفوظ ڪرڻ لاءِ سائن اِن ڪريو.", categoryRequired: "گهٽ ۾ گهٽ هڪ درجو چونڊيو." },
  legal: { ...englishMessages.legal, terms: "شرطون", privacy: "رازداري اطلاع", communityRules: "برادري جا ضابطا", consent: "مان شرطون، رازداري اطلاع ۽ برادري جا ضابطا قبول ڪريان ٿو." },
} satisfies Messages;

export default messages;
